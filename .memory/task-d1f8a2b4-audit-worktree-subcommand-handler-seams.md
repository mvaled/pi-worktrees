---
id: d1f8a2b4
title: audit-worktree-subcommand-handler-seams
created_at: 2026-03-22T12:41:34+10:30
updated_at: 2026-03-23T18:33:58+10:30
status: cancelled
epic_id: c6d8a1f4
phase_id: phase-1-discovery-and-interface-design
story_id: 91ab4c2e
---

# Task: Audit worktree subcommand handler seams

## Objective
Identify the existing `list`, `create`, and `remove` command handlers and document the direct invocation seams needed for tool dispatch.

## Related Story
- Story: [story-91ab4c2e-define-worktrees-tool-interface-and-dispatch](./story-91ab4c2e-define-worktrees-tool-interface-and-dispatch.md)
- Acceptance criteria supported: AC#1, AC#3.

## Steps
- [ ] Locate command implementation entrypoints for `list`, `create`, and `remove`.
- [ ] Record input/output expectations for each handler seam.
- [ ] Note refactors required to avoid shell indirection.

## Expected Outcome
A concrete dispatch integration plan that maps each subcommand to code-level handler calls.
