---
id: c24e7a8d
title: add-worktrees-tool-tests
created_at: 2026-03-22T12:37:18+10:30
updated_at: 2026-03-22T12:37:18+10:30
status: proposed
epic_id: c6d8a1f4
priority: medium
story_points: 3
test_coverage: none
---

# Story: Add automated tests for `worktrees` tool behavior

## User Story
As a maintainer, I want automated coverage for tool dispatch and subcommand execution so regressions in the new tool surface are caught early.

## Acceptance Criteria
- [ ] Unit tests validate schema validation and dispatch branching.
- [ ] Integration tests cover successful `list`, `create`, and `remove` execution paths.
- [ ] Integration tests cover invalid input and command failure paths.
- [ ] Test output is stable in CI for all added cases.

## Context
The epic definition requires tests as a non-negotiable completion gate.

## Out of Scope
- Performance benchmarking.
- Security/authorization test scenarios beyond current scope.

## Tasks
- To be decomposed into concrete test file tasks.

## Test Specification
### Test Coverage Targets
| AC# | Criterion | Test type | Status |
|---|---|---|---|
| AC1 | Dispatch/schema unit coverage | unit | pending |
| AC2 | Happy-path subcommand integration | integration | pending |
| AC3 | Error-path integration | integration | pending |
| AC4 | CI stability | CI run evidence | pending |

## Notes
This story may run in parallel with implementation once interface is stable.
