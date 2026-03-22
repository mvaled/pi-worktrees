---
id: f3b9c6a2
title: define-worktrees-dispatch-error-contract
created_at: 2026-03-22T12:41:34+10:30
updated_at: 2026-03-22T12:41:34+10:30
status: todo
epic_id: c6d8a1f4
phase_id: phase-1-discovery-and-interface-design
story_id: 91ab4c2e
---

# Task: Define `worktrees` dispatch error contract

## Objective
Standardize error responses for unknown subcommands and downstream handler failures in the `worktrees` tool.

## Related Story
- Story: [story-91ab4c2e-define-worktrees-tool-interface-and-dispatch](./story-91ab4c2e-define-worktrees-tool-interface-and-dispatch.md)
- Acceptance criteria supported: AC#4.

## Steps
- [ ] Define structured error shape for unsupported subcommands.
- [ ] Define mapping strategy for handler exceptions to tool errors.
- [ ] Document examples for invalid `subcommand` and runtime failure.

## Expected Outcome
A consistent error contract that can be tested and documented without ambiguity.
