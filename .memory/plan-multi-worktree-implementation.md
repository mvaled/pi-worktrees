---
id: plan-multi-worktree
title: Multi-Worktree Settings Implementation Plan
created_at: 2026-03-13T12:24:00+10:30
status: ready
epic_id: a7c9d4f2
---

# Execution Plan: Multi-Worktree Settings Implementation

## Overview

This plan addresses the remaining implementation gaps for Epic a7c9d4f2 (convert-settings-from-single-to-multiple-worktree-settings-by-git-url-pattern).

**Dependency Order**: Schema → Matcher → Runtime → Tests

**Blocked Work**: Migration task (task-9e0f1a2b) is blocked pending `pi-extension-config` migration API.

---

## Phase 1: Schema Foundation

### Task 1.1: Extend Config Schema
**File**: `src/services/config.ts`
**Effort**: 2h | **Priority**: P0 (blocking all downstream work)
**Depends On**: None

**Changes Required**:

```typescript
// Add to imports
import { Union, Literal, Record as TypeRecord, Array as TypeArray } from 'typebox';

// New onCreate type (string or array)
const OnCreateSchema = Union([
  TypeString(),
  TypeArray(TypeString()),
]);

// Updated WorktreeSettings with onCreate union
const WorktreeSettingsSchema = TypeObject({
  parentDir: Optional(TypeString()),
  onCreate: Optional(OnCreateSchema),
}, { $id: 'WorktreeSettingsConfig', additionalProperties: false });

// Matching strategy enum (task-5a6b7c8d)
const MatchingStrategySchema = Union([
  Literal('fail-on-tie'),     // Default: error when patterns have equal specificity
  Literal('first-wins'),      // Use first matching pattern in definition order
  Literal('last-wins'),       // Use last matching pattern in definition order
], { default: 'fail-on-tie' });

// New worktrees map type
const WorktreesMapSchema = TypeRecord(TypeString(), WorktreeSettingsSchema);

// Updated UnresolvedConfig
const UnresolvedConfigSchema = TypeObject({
  worktrees: Optional(WorktreesMapSchema),        // NEW: pattern -> settings
  matchingStrategy: Optional(MatchingStrategySchema), // NEW: enum
  worktree: Optional(WorktreeSettingsSchema),     // LEGACY: singular
  parentDir: Optional(TypeString()),              // LEGACY: flat
  onCreate: Optional(OnCreateSchema),             // LEGACY: flat (now union)
}, { $id: 'UnresolvedConfig', additionalProperties: true });

// Updated ResolvedConfig
const ResolvedConfigSchema = TypeObject({
  worktrees: WorktreesMapSchema,
  matchingStrategy: MatchingStrategySchema,
  fallback: WorktreeSettingsSchema,               // Legacy/default settings
}, { $id: 'ResolvedConfig', additionalProperties: false });
```

**Normalization Logic**:
```typescript
function normalizeConfig(value: unknown): ResolvedConfig {
  const parsed = Parse(UnresolvedConfigSchema, value);
  
  // Build fallback from legacy shape
  const fallback = buildWorktreeSettings(parsed);
  
  // Preserve worktrees map or default empty
  const worktrees = parsed.worktrees ?? {};
  
  // Default strategy
  const matchingStrategy = parsed.matchingStrategy ?? 'fail-on-tie';
  
  return Parse(ResolvedConfigSchema, { worktrees, matchingStrategy, fallback });
}
```

**Acceptance Criteria Addressed**:
- Story b2e9f0aa: AC#1 (worktrees map), AC#2 (onCreate union), AC#3 (legacy shape)
- Story c91d7e34: AC#6 (strategy enum)

---

### Task 1.2: Update Save Logic
**File**: `src/services/config.ts`
**Effort**: 30m | **Priority**: P0
**Depends On**: Task 1.1

**Changes Required**:
```typescript
export async function saveWorktreeSettings(
  configService: WorktreeConfigService,
  settings: {
    worktrees?: Record<string, WorktreeSettingsConfig>;
    matchingStrategy?: MatchingStrategy;
    fallback?: WorktreeSettingsConfig;
  }
): Promise<void> {
  const persistable: Record<string, unknown> = {};
  
  if (settings.worktrees) {
    persistable.worktrees = settings.worktrees;
  }
  if (settings.matchingStrategy) {
    persistable.matchingStrategy = settings.matchingStrategy;
  }
  if (settings.fallback) {
    persistable.worktree = settings.fallback; // Persist as worktree for compat
  }
  
  for (const [key, value] of Object.entries(persistable)) {
    await configService.set(key as any, value, 'home');
  }
  await configService.save('home');
}
```

**Acceptance Criteria Addressed**:
- Story b2e9f0aa: AC#4 (stable persistence)

---

## Phase 2: Repo Matcher Service

### Task 2.1: Create URL Normalizer
**File**: `src/services/git.ts` (add function)
**Effort**: 1h | **Priority**: P0
**Depends On**: None (can parallel with 1.x)

**Implementation**:
```typescript
/**
 * Normalize git remote URL to canonical https form.
 * Handles: git@host:org/repo.git, https://host/org/repo.git, etc.
 */
export function normalizeGitUrl(url: string): string {
  // Remove trailing .git
  let normalized = url.replace(/\.git$/, '');
  
  // Convert SSH to HTTPS: git@github.com:org/repo -> https://github.com/org/repo
  const sshMatch = normalized.match(/^git@([^:]+):(.+)$/);
  if (sshMatch) {
    const [, host, path] = sshMatch;
    normalized = `https://${host}/${path}`;
  }
  
  // Strip protocol variations for matching
  normalized = normalized.replace(/^(https?:\/\/|ssh:\/\/|git:\/\/)/, 'https://');
  
  // Remove auth info: https://user@host -> https://host
  normalized = normalized.replace(/\/\/[^@]+@/, '//');
  
  return normalized.toLowerCase();
}

/**
 * Get the remote URL for the current repository.
 */
export function getRemoteUrl(cwd: string, remote = 'origin'): string | null {
  try {
    return git(['remote', 'get-url', remote], cwd);
  } catch {
    return null;
  }
}
```

**Acceptance Criteria Addressed**:
- Story c91d7e34: AC#1 (URL normalization ssh/https)

---

### Task 2.2: Create Repo Matcher Service
**File**: `src/services/repoMatcher.ts` (NEW)
**Effort**: 3h | **Priority**: P0
**Depends On**: Task 1.1, Task 2.1

**Implementation**:
```typescript
import { minimatch } from 'minimatch';
import type { WorktreeSettingsConfig, ResolvedConfig, MatchingStrategy } from './config.ts';
import { normalizeGitUrl } from './git.ts';

export interface MatchResult {
  settings: WorktreeSettingsConfig;
  matchedPattern: string | null; // null = fallback
  isExact: boolean;
}

export interface TieConflictError {
  type: 'tie-conflict';
  patterns: string[];
  url: string;
  message: string;
}

/**
 * Calculate segment-based specificity for a glob pattern.
 * More specific = more non-wildcard segments.
 * 
 * Examples:
 *   "github.com/org/repo" → 3 (exact match)
 *   "github.com/org/*" → 2
 *   "github.com/**" → 1
 *   "*" → 0
 */
function calculateSpecificity(pattern: string): number {
  const segments = pattern.split('/');
  let score = 0;
  for (const seg of segments) {
    if (seg === '**') continue;           // Double-star: no specificity
    if (seg === '*') continue;            // Single wildcard segment: no specificity
    if (seg.includes('*')) score += 0.5;  // Partial wildcard: half credit
    else score += 1;                       // Literal segment: full credit
  }
  return score;
}

/**
 * Match a repository URL against configured patterns.
 * 
 * Precedence: exact match > highest specificity glob > fallback
 */
export function matchRepo(
  url: string,
  config: ResolvedConfig
): MatchResult | TieConflictError {
  const normalizedUrl = normalizeGitUrl(url);
  const { worktrees, matchingStrategy, fallback } = config;
  
  const patterns = Object.keys(worktrees);
  if (patterns.length === 0) {
    return { settings: fallback, matchedPattern: null, isExact: false };
  }
  
  // Check for exact match first
  for (const pattern of patterns) {
    const normalizedPattern = normalizeGitUrl(pattern);
    if (normalizedUrl === normalizedPattern) {
      return { settings: worktrees[pattern], matchedPattern: pattern, isExact: true };
    }
  }
  
  // Collect glob matches with specificity
  const matches: Array<{ pattern: string; specificity: number }> = [];
  
  for (const pattern of patterns) {
    // Normalize pattern for matching (but preserve original for config lookup)
    const normalizedPattern = normalizeGitUrl(pattern);
    
    if (minimatch(normalizedUrl, normalizedPattern, { nocase: true })) {
      matches.push({ pattern, specificity: calculateSpecificity(pattern) });
    }
  }
  
  if (matches.length === 0) {
    return { settings: fallback, matchedPattern: null, isExact: false };
  }
  
  // Sort by specificity descending
  matches.sort((a, b) => b.specificity - a.specificity);
  
  // Check for ties at top specificity
  const topSpecificity = matches[0].specificity;
  const topMatches = matches.filter(m => m.specificity === topSpecificity);
  
  if (topMatches.length > 1) {
    // Handle tie based on strategy
    return handleTie(topMatches, normalizedUrl, matchingStrategy, worktrees);
  }
  
  const winner = matches[0];
  return { settings: worktrees[winner.pattern], matchedPattern: winner.pattern, isExact: false };
}

function handleTie(
  tiedMatches: Array<{ pattern: string; specificity: number }>,
  url: string,
  strategy: MatchingStrategy,
  worktrees: Record<string, WorktreeSettingsConfig>
): MatchResult | TieConflictError {
  const patterns = tiedMatches.map(m => m.pattern);
  
  switch (strategy) {
    case 'fail-on-tie':
      return {
        type: 'tie-conflict',
        patterns,
        url,
        message: `Multiple patterns match with equal specificity:\n${patterns.map(p => `  - ${p}`).join('\n')}\n\nRefine patterns or set matchingStrategy to 'first-wins' or 'last-wins'.`,
      };
    
    case 'first-wins':
      return { settings: worktrees[patterns[0]], matchedPattern: patterns[0], isExact: false };
    
    case 'last-wins':
      const last = patterns[patterns.length - 1];
      return { settings: worktrees[last], matchedPattern: last, isExact: false };
  }
}

export function isTieConflict(result: MatchResult | TieConflictError): result is TieConflictError {
  return (result as TieConflictError).type === 'tie-conflict';
}
```

**Acceptance Criteria Addressed**:
- Story c91d7e34: AC#2 (full URL targeting), AC#3 (deterministic precedence), AC#4 (segment specificity), AC#5 (tie conflict), AC#7 (fallback)

---

## Phase 3: Runtime Updates

### Task 3.1: Multi-Command onCreate Execution
**File**: `src/cmds/shared.ts`
**Effort**: 1.5h | **Priority**: P0
**Depends On**: Task 1.1

**Changes Required**:
```typescript
import { spawn } from 'child_process';
import { expandTemplate } from '../services/templates.ts';
import type { WorktreeSettingsConfig } from '../services/config.ts';
import type { WorktreeCreatedContext } from '../types.ts';

export interface OnCreateResult {
  success: boolean;
  executed: string[];
  failed?: { command: string; code: number; error: string };
}

/**
 * Runs onCreate commands sequentially with failure-stop semantics.
 * If any command fails, subsequent commands are skipped.
 */
export async function runOnCreateHook(
  createdCtx: WorktreeCreatedContext,
  settings: WorktreeSettingsConfig,
  notify: (msg: string, type: 'info' | 'error' | 'warning') => void
): Promise<OnCreateResult> {
  const rawOnCreate = settings.onCreate;
  if (!rawOnCreate) {
    return { success: true, executed: [] };
  }
  
  // Normalize to array
  const commands = Array.isArray(rawOnCreate) ? rawOnCreate : [rawOnCreate];
  const executed: string[] = [];
  
  for (const cmd of commands) {
    const expandedCommand = expandTemplate(cmd, createdCtx);
    notify(`Running: ${expandedCommand}`, 'info');
    
    const result = await runCommand(expandedCommand, createdCtx.path);
    executed.push(expandedCommand);
    
    if (!result.success) {
      notify(`onCreate failed (exit ${result.code}): ${result.stderr.slice(0, 200)}`, 'error');
      return {
        success: false,
        executed,
        failed: { command: expandedCommand, code: result.code, error: result.stderr },
      };
    }
    
    if (result.stdout.trim()) {
      notify(result.stdout.trim().slice(0, 200), 'info');
    }
  }
  
  return { success: true, executed };
}

interface CommandResult {
  success: boolean;
  code: number;
  stdout: string;
  stderr: string;
}

function runCommand(command: string, cwd: string): Promise<CommandResult> {
  return new Promise((resolve) => {
    const child = spawn(command, {
      cwd,
      shell: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    child.stdout?.on('data', (data) => { stdout += data.toString(); });
    child.stderr?.on('data', (data) => { stderr += data.toString(); });

    child.on('close', (code) => {
      resolve({ success: code === 0, code: code ?? 1, stdout, stderr });
    });

    child.on('error', (err) => {
      resolve({ success: false, code: 1, stdout: '', stderr: err.message });
    });
  });
}
```

**Acceptance Criteria Addressed**:
- Story e7b6a902: AC#3 (onCreate list handling), AC#4 (execution order + failure-stop)

---

### Task 3.2: Integrate Matcher into Command Flow
**File**: `src/index.ts`
**Effort**: 1h | **Priority**: P0
**Depends On**: Task 1.1, Task 2.2

**Changes Required**:
```typescript
import { getRemoteUrl } from './services/git.ts';
import { matchRepo, isTieConflict } from './services/repoMatcher.ts';

// In command handler:
const configService = await configServicePromise;
await configService.reload();

// Get repo URL for matching
const remoteUrl = getRemoteUrl(process.cwd());
let resolvedSettings: WorktreeSettingsConfig;

if (remoteUrl) {
  const matchResult = matchRepo(remoteUrl, configService.config);
  
  if (isTieConflict(matchResult)) {
    ctx.ui.notify(`Config Error: ${matchResult.message}`, 'error');
    return;
  }
  
  resolvedSettings = matchResult.settings;
} else {
  // No remote URL - use fallback
  resolvedSettings = configService.config.fallback;
}

await command(rest.join(' '), ctx, {
  settings: resolvedSettings,
  configService,
});
```

**Acceptance Criteria Addressed**:
- Story c91d7e34: AC#5 (UI-visible conflict error), AC#7 (no-match fallback)
- Story d3a54f18: AC#3 (resolver fallback to legacy)

---

### Task 3.3: Update HELP_TEXT
**File**: `src/index.ts`
**Effort**: 30m | **Priority**: P1
**Depends On**: Task 1.1

**Changes Required**:
```typescript
const HELP_TEXT = `
/worktree - Git worktree management

Commands:
  /worktree init                   Configure worktree settings interactively
  /worktree settings [key] [val]   Get/set individual settings
  /worktree create <feature-name>  Create new worktree with branch
  /worktree list                   List all worktrees
  /worktree remove <name>          Remove a worktree
  /worktree status                 Show current worktree info
  /worktree cd <name>              Print path to worktree
  /worktree prune                  Clean up stale references

Configuration (~/.pi/agent/pi-worktrees.config.json):
  {
    "worktrees": {
      "github.com/org/repo": {
        "parentDir": "~/work/org",
        "onCreate": ["mise install", "bun install"]
      },
      "github.com/org/*": {
        "parentDir": "~/work/org-other",
        "onCreate": "make setup"
      }
    },
    "matchingStrategy": "fail-on-tie",
    "worktree": {
      "parentDir": "~/.worktrees/{{project}}",
      "onCreate": "mise setup"
    }
  }

Pattern matching: exact URL > most-specific glob > fallback (worktree)
Matching strategies: fail-on-tie | first-wins | last-wins

Template vars: {{path}}, {{name}}, {{branch}}, {{project}}
`.trim();
```

---

## Phase 4: Tests

### Task 4.1: Test Infrastructure Setup
**File**: `tests/setup.ts`, `vitest.config.ts`
**Effort**: 30m | **Priority**: P0
**Depends On**: None (can parallel)

**Implementation**:
```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    globals: true,
  },
});

// tests/setup.ts
import { beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

export function createTestDir(): string {
  return mkdtempSync(join(tmpdir(), 'pi-worktrees-test-'));
}

export function cleanupTestDir(dir: string): void {
  rmSync(dir, { recursive: true, force: true });
}
```

---

### Task 4.2: Schema/Loader Integration Tests
**File**: `tests/config.test.ts`
**Effort**: 2h | **Priority**: P0
**Depends On**: Task 1.1, Task 1.2, Task 4.1
**Task Reference**: task-b2c3d4e5

**Test Cases**:
```typescript
import { describe, it, expect } from 'vitest';
import { normalizeConfig } from '../src/services/config.ts';

describe('Config Schema', () => {
  describe('worktrees map parsing', () => {
    it('accepts worktrees: Record<pattern, settings>', () => {
      const raw = {
        worktrees: {
          'github.com/org/repo': { parentDir: '~/work' },
        },
      };
      const result = normalizeConfig(raw);
      expect(result.worktrees['github.com/org/repo']).toEqual({ parentDir: '~/work' });
    });
    
    it('defaults to empty worktrees map', () => {
      const result = normalizeConfig({});
      expect(result.worktrees).toEqual({});
    });
  });
  
  describe('onCreate union type', () => {
    it('accepts string onCreate', () => {
      const result = normalizeConfig({ worktree: { onCreate: 'npm install' } });
      expect(result.fallback.onCreate).toBe('npm install');
    });
    
    it('accepts array onCreate', () => {
      const result = normalizeConfig({ worktree: { onCreate: ['a', 'b'] } });
      expect(result.fallback.onCreate).toEqual(['a', 'b']);
    });
  });
  
  describe('legacy shape compatibility', () => {
    it('accepts legacy worktree singular shape', () => {
      const result = normalizeConfig({ worktree: { parentDir: '~/x' } });
      expect(result.fallback.parentDir).toBe('~/x');
    });
    
    it('accepts legacy flat fields', () => {
      const result = normalizeConfig({ parentDir: '~/y', onCreate: 'z' });
      expect(result.fallback).toEqual({ parentDir: '~/y', onCreate: 'z' });
    });
    
    it('nested worktree takes precedence over flat', () => {
      const result = normalizeConfig({ parentDir: '~/flat', worktree: { parentDir: '~/nested' } });
      expect(result.fallback.parentDir).toBe('~/nested');
    });
  });
  
  describe('matchingStrategy enum', () => {
    it('accepts valid strategy values', () => {
      expect(normalizeConfig({ matchingStrategy: 'fail-on-tie' }).matchingStrategy).toBe('fail-on-tie');
      expect(normalizeConfig({ matchingStrategy: 'first-wins' }).matchingStrategy).toBe('first-wins');
      expect(normalizeConfig({ matchingStrategy: 'last-wins' }).matchingStrategy).toBe('last-wins');
    });
    
    it('defaults to fail-on-tie', () => {
      expect(normalizeConfig({}).matchingStrategy).toBe('fail-on-tie');
    });
    
    it('rejects invalid strategy values', () => {
      expect(() => normalizeConfig({ matchingStrategy: 'invalid' })).toThrow();
    });
  });
  
  describe('persistence round-trip', () => {
    it('preserves worktrees map through save/load', async () => {
      // Test with mock config service
    });
  });
});
```

**Acceptance Criteria Addressed**:
- Story b2e9f0aa: AC#1, AC#2, AC#3, AC#4
- Story c91d7e34: AC#6

---

### Task 4.3: Repo Matcher Tests
**File**: `tests/repoMatcher.test.ts`
**Effort**: 2h | **Priority**: P0
**Depends On**: Task 2.1, Task 2.2, Task 4.1

**Test Cases**:
```typescript
import { describe, it, expect } from 'vitest';
import { normalizeGitUrl } from '../src/services/git.ts';
import { matchRepo, isTieConflict } from '../src/services/repoMatcher.ts';

describe('URL Normalization', () => {
  it('normalizes SSH to HTTPS', () => {
    expect(normalizeGitUrl('git@github.com:org/repo.git'))
      .toBe('https://github.com/org/repo');
  });
  
  it('strips .git suffix', () => {
    expect(normalizeGitUrl('https://github.com/org/repo.git'))
      .toBe('https://github.com/org/repo');
  });
  
  it('lowercases for matching', () => {
    expect(normalizeGitUrl('https://GitHub.COM/ORG/Repo'))
      .toBe('https://github.com/org/repo');
  });
});

describe('Pattern Matching', () => {
  const baseConfig = {
    matchingStrategy: 'fail-on-tie' as const,
    fallback: { parentDir: '~/fallback' },
  };
  
  describe('exact match precedence', () => {
    it('exact match beats glob', () => {
      const config = {
        ...baseConfig,
        worktrees: {
          'github.com/org/repo': { parentDir: '~/exact' },
          'github.com/org/*': { parentDir: '~/glob' },
        },
      };
      const result = matchRepo('https://github.com/org/repo', config);
      expect(isTieConflict(result)).toBe(false);
      expect((result as any).settings.parentDir).toBe('~/exact');
      expect((result as any).isExact).toBe(true);
    });
  });
  
  describe('glob specificity', () => {
    it('more specific glob wins', () => {
      const config = {
        ...baseConfig,
        worktrees: {
          'github.com/org/*': { parentDir: '~/org' },
          'github.com/**': { parentDir: '~/github' },
        },
      };
      const result = matchRepo('https://github.com/org/repo', config);
      expect((result as any).settings.parentDir).toBe('~/org');
    });
  });
  
  describe('tie conflict', () => {
    it('returns error on equal specificity with fail-on-tie', () => {
      const config = {
        ...baseConfig,
        worktrees: {
          'github.com/org-a/*': { parentDir: '~/a' },
          'github.com/org-b/*': { parentDir: '~/b' },
        },
      };
      // This won't tie since patterns don't both match same URL
      // Need a URL that matches both
    });
    
    it('uses first with first-wins strategy', () => {
      const config = {
        matchingStrategy: 'first-wins' as const,
        fallback: {},
        worktrees: {
          '**/repo': { parentDir: '~/first' },
          'github.com/**': { parentDir: '~/second' },
        },
      };
      const result = matchRepo('https://github.com/org/repo', config);
      expect(isTieConflict(result)).toBe(false);
    });
  });
  
  describe('fallback behavior', () => {
    it('uses fallback when no pattern matches', () => {
      const config = {
        ...baseConfig,
        worktrees: {
          'gitlab.com/**': { parentDir: '~/gitlab' },
        },
      };
      const result = matchRepo('https://github.com/org/repo', config);
      expect((result as any).matchedPattern).toBeNull();
      expect((result as any).settings.parentDir).toBe('~/fallback');
    });
    
    it('uses fallback when worktrees is empty', () => {
      const config = { ...baseConfig, worktrees: {} };
      const result = matchRepo('https://github.com/org/repo', config);
      expect((result as any).matchedPattern).toBeNull();
    });
  });
});
```

**Acceptance Criteria Addressed**:
- Story c91d7e34: AC#1-AC#7
- Story e7b6a902: AC#1, AC#2

---

### Task 4.4: Command-Level Integration Tests
**File**: `tests/commands.test.ts`
**Effort**: 2h | **Priority**: P1
**Depends On**: Task 3.1, Task 3.2, Task 4.1
**Task Reference**: task-3c4d5e6f

**Test Cases**:
```typescript
describe('onCreate Execution', () => {
  it('executes commands in order', async () => {
    // Test with mock
  });
  
  it('stops on first failure', async () => {
    // Test failure-stop semantics
  });
  
  it('reports which command failed', async () => {
    // Test error reporting
  });
});
```

**Acceptance Criteria Addressed**:
- Story e7b6a902: AC#3, AC#4

---

### Task 4.5: Config Service Integration Tests
**File**: `tests/configService.test.ts`
**Effort**: 1h | **Priority**: P1
**Depends On**: Task 4.1
**Task Reference**: task-7a8b9c0d

---

## Phase 5: Documentation

### Task 5.1: Update README.md
**File**: `README.md`
**Effort**: 1h | **Priority**: P2
**Depends On**: Phase 1-3 complete

**Changes**:
- Document `worktrees` map structure
- Document pattern matching semantics
- Document `matchingStrategy` options
- Migration guide from single worktree to multi

---

## Blocked Work

### Task BLOCKED: Migration Set (task-9e0f1a2b)
**Status**: BLOCKED
**Reason**: `pi-extension-config` does not currently expose migration API

**Required Upstream Work**:
1. `pi-extension-config` needs migration-set registration API
2. Migration-set execution during config load
3. Version metadata tracking

**Interim Solution**: The current compatibility layer (parsing both legacy and new shapes) provides forward compatibility. Users can manually migrate configs. Formal migration can be added when upstream support exists.

---

## Dependency Graph

```
┌─────────────────────────────────────────────────────────────────┐
│                        Phase 1: Schema                          │
│  ┌─────────────┐       ┌─────────────┐                         │
│  │ Task 1.1    │──────▶│ Task 1.2    │                         │
│  │ Schema Ext  │       │ Save Logic  │                         │
│  └─────────────┘       └─────────────┘                         │
└─────────────────────────────────────────────────────────────────┘
         │                      │
         ▼                      │
┌─────────────────────────────────────────────────────────────────┐
│                       Phase 2: Matcher                          │
│  ┌─────────────┐       ┌─────────────┐                         │
│  │ Task 2.1    │──────▶│ Task 2.2    │                         │
│  │ URL Norm    │       │ Matcher Svc │                         │
│  └─────────────┘       └─────────────┘                         │
└─────────────────────────────────────────────────────────────────┘
         │                      │
         ▼                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                       Phase 3: Runtime                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │ Task 3.1    │  │ Task 3.2    │  │ Task 3.3    │             │
│  │ onCreate[]  │  │ Integrate   │  │ Help Text   │             │
│  └─────────────┘  └─────────────┘  └─────────────┘             │
└─────────────────────────────────────────────────────────────────┘
         │                      │
         ▼                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                        Phase 4: Tests                           │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │ Task 4.2    │  │ Task 4.3    │  │ Task 4.4    │             │
│  │ Schema Test │  │ Matcher Test│  │ Cmd Test    │             │
│  └─────────────┘  └─────────────┘  └─────────────┘             │
└─────────────────────────────────────────────────────────────────┘
```

---

## Execution Summary

| Phase | Tasks | Effort | Parallelizable |
|-------|-------|--------|----------------|
| 1. Schema | 1.1, 1.2 | 2.5h | No (sequential) |
| 2. Matcher | 2.1, 2.2 | 4h | 2.1 can parallel with 1.x |
| 3. Runtime | 3.1, 3.2, 3.3 | 3h | 3.1 independent of 3.2 |
| 4. Tests | 4.1-4.5 | 7.5h | 4.1 first, then parallel |
| 5. Docs | 5.1 | 1h | After implementation |

**Total Estimated Effort**: ~18 hours

**Critical Path**: Task 1.1 → Task 2.2 → Task 3.2 → Task 4.3

**Quick Wins** (parallel-safe):
- Task 2.1 (URL normalizer) - no dependencies
- Task 4.1 (test setup) - no dependencies

---

## Success Criteria Checklist

- [ ] `worktrees: Record<pattern, settings>` parses correctly
- [ ] `onCreate: string | string[]` works in both forms
- [ ] Legacy singular `worktree` shape still parses
- [ ] Legacy flat fields (`parentDir`, `onCreate`) still parse
- [ ] Exact URL match takes precedence over globs
- [ ] Segment-based specificity ranking works
- [ ] Tie conflict produces visible error (fail-on-tie mode)
- [ ] `matchingStrategy` enum controls tie behavior
- [ ] No-match falls back to legacy/fallback settings
- [ ] `onCreate` array executes sequentially with failure-stop
- [ ] All tests pass
- [ ] README documents new structure
