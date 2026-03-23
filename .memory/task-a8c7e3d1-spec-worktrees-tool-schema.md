---
id: a8c7e3d1
title: spec-worktrees-tool-schema
created_at: 2026-03-22T12:41:34+10:30
updated_at: 2026-03-23T18:33:58+10:30
status: cancelled
epic_id: c6d8a1f4
phase_id: phase-1-discovery-and-interface-design
story_id: 91ab4c2e
---

# Task: Specify `worktrees` tool schema

## Objective
Define the initial tool input contract for `worktrees` with required `subcommand` enum (`list`, `create`, `remove`) and subcommand-specific payload fields.

## Related Story
- Story: [story-91ab4c2e-define-worktrees-tool-interface-and-dispatch](./story-91ab4c2e-define-worktrees-tool-interface-and-dispatch.md)
- Acceptance criteria supported: AC#1, AC#2.

## Steps
- [ ] Draft base schema with `subcommand` as required enum.
- [ ] Define required/optional payload fields per subcommand.
- [ ] Validate schema aligns with existing subcommand argument semantics.

## Expected Outcome
A stable schema contract ready for tool registration and implementation.
