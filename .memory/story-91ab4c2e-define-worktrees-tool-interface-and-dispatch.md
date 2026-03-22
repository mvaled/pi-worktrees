---
id: 91ab4c2e
title: define-worktrees-tool-interface-and-dispatch
created_at: 2026-03-22T12:37:18+10:30
updated_at: 2026-03-22T12:37:18+10:30
status: proposed
epic_id: c6d8a1f4
priority: high
story_points: 3
test_coverage: none
---

# Story: Define `worktrees` tool interface and subcommand dispatch

## User Story
As an extension maintainer, I want a single `worktrees` tool contract with explicit subcommand dispatch so agents can invoke `list`, `create`, and `remove` through one stable tool entrypoint.

## Acceptance Criteria
- [ ] Tool registration exposes a single tool named `worktrees`.
- [ ] Input schema includes a required `subcommand` field with allowed values `list`, `create`, `remove`.
- [ ] Dispatch path cleanly routes to existing subcommand handlers without shell indirection.
- [ ] Unsupported subcommands return a consistent structured error.

## Context
Q&A selected a single-tool-with-subcommands model as the initial exposure strategy.

## Out of Scope
- Splitting into multiple tools.
- Permission/authorization frameworks.

## Tasks
- To be decomposed after implementation design confirmation.

## Test Specification
### Integration Tests
| AC# | Criterion | Test file/case | Status |
|---|---|---|---|
| AC1 | Single tool registration | worktrees tool registration spec | pending |
| AC2 | Subcommand enum contract | worktrees input schema spec | pending |
| AC3 | Correct handler routing | dispatch integration spec | pending |
| AC4 | Unknown subcommand error shape | dispatch error spec | pending |

## Notes
Depends on existing subcommand architecture and tool registration mechanism.
