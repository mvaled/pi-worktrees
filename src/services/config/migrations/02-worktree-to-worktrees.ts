import { type Migration } from '@zenobius/pi-extension-config';

const FALLBACK_WORKTREE_PATTERN = '**';

type AnyRecord = Record<string, unknown>;

type LegacyWorktreeSettings = {
  parentDir?: unknown;
  onCreate?: unknown;
};

function toRecord(value: unknown): AnyRecord {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  return { ...(value as AnyRecord) };
}

function sanitizeLegacyWorktreeSettings(value: unknown): LegacyWorktreeSettings {
  const source = toRecord(value);
  const next: LegacyWorktreeSettings = {};

  if (source.parentDir !== undefined) {
    next.parentDir = source.parentDir;
  }

  if (source.onCreate !== undefined) {
    next.onCreate = source.onCreate;
  }

  return next;
}

export const migration: Migration = {
  id: 'legacy-worktree-to-worktrees',
  up(config: unknown): AnyRecord {
    const record = toRecord(config);
    const next = { ...record };

    const worktree = sanitizeLegacyWorktreeSettings(record.worktree);
    const hasLegacyWorktreeSettings = Object.keys(worktree).length > 0;

    const existingWorktrees = toRecord(record.worktrees);
    const hasWorktrees = Object.keys(existingWorktrees).length > 0;

    if (!hasLegacyWorktreeSettings) {
      return next;
    }

    if (!hasWorktrees) {
      next.worktrees = {
        [FALLBACK_WORKTREE_PATTERN]: worktree,
      };
    }

    delete next.worktree;
    return next;
  },
  down(config: unknown): AnyRecord {
    const record = toRecord(config);
    const next = { ...record };

    const worktrees = toRecord(record.worktrees);
    const fallbackSettings = sanitizeLegacyWorktreeSettings(worktrees[FALLBACK_WORKTREE_PATTERN]);

    if (Object.keys(fallbackSettings).length > 0) {
      next.worktree = fallbackSettings;

      const remaining = { ...worktrees };
      delete remaining[FALLBACK_WORKTREE_PATTERN];

      if (Object.keys(remaining).length > 0) {
        next.worktrees = remaining;
      } else {
        delete next.worktrees;
      }
    }

    return next;
  },
};
