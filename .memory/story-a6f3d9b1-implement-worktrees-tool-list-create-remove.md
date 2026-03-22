---
id: a6f3d9b1
title: implement-worktrees-tool-list-create-remove
created_at: 2026-03-22T12:37:18+10:30
updated_at: 2026-03-22T12:37:18+10:30
status: proposed
epic_id: c6d8a1f4
priority: high
story_points: 5
test_coverage: none
---

# Story: Implement `worktrees` tool for list/create/remove

## User Story
As an agent user, I want `list`, `create`, and `remove` worktree operations available through the `worktrees` tool so natural-language task requests can trigger these workflows directly.

## Acceptance Criteria
- [ ] `worktrees` with `subcommand: list` returns current worktree data.
- [ ] `worktrees` with `subcommand: create` creates a worktree using mapped arguments.
- [ ] `worktrees` with `subcommand: remove` removes the target worktree via mapped arguments.
- [ ] Error propagation preserves meaningful command failure context for tool consumers.

## Context
This is the core delivery of the epic and should reuse existing command logic instead of duplicating behavior.

## Out of Scope
- New permission model for destructive operations.
- Backward compatibility layer for alternate tool names.

## Tasks
- To be decomposed into implementation tasks once integration seam is finalized.

## Test Specification
### Integration Tests
| AC# | Criterion | Test file/case | Status |
|---|---|---|---|
| AC1 | list works through tool | worktrees.list integration spec | pending |
| AC2 | create works through tool | worktrees.create integration spec | pending |
| AC3 | remove works through tool | worktrees.remove integration spec | pending |
| AC4 | failure context preserved | worktrees error propagation spec | pending |

## Notes
`remove` is destructive; scope currently excludes permissions hardening by explicit Q&A decision.
