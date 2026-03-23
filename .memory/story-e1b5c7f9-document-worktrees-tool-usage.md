---
id: e1b5c7f9
title: document-worktrees-tool-usage
created_at: 2026-03-22T12:37:18+10:30
updated_at: 2026-03-23T18:33:58+10:30
status: cancelled
epic_id: c6d8a1f4
priority: medium
story_points: 2
test_coverage: none
---

# Story: Document `worktrees` tool usage and limits

## User Story
As a user or agent author, I want concise docs for the `worktrees` tool contract so I can invoke subcommands correctly and understand constraints.

## Acceptance Criteria
- [ ] Documentation includes tool name and supported subcommands (`list`, `create`, `remove`).
- [ ] Documentation includes argument contract and expected output/error structure.
- [ ] Documentation explicitly flags `remove` as destructive.
- [ ] Documentation states that permissions hardening is currently out of scope.

## Context
Q&A called for standard registration/discovery behavior and explicit docs as a completion gate.

## Out of Scope
- Full permission model design document.
- Backward compatibility migration notes.

## Tasks
- To be decomposed after implementation details settle.

## Test Specification
### Documentation Verification
| AC# | Criterion | Evidence | Status |
|---|---|---|---|
| AC1 | Subcommands documented | docs review checklist | pending |
| AC2 | Contract documented | docs review checklist | pending |
| AC3 | Destructive warning present | docs review checklist | pending |
| AC4 | Scope boundary documented | docs review checklist | pending |

## Notes
Documentation should align with final schema names to avoid drift.
