# Todo

- [x] Move story narrative/spec content out of epic and into story files.
- [x] Fill all current epic story files using user-story format and acceptance criteria.
- [x] Normalize story status semantics: `test_coverage: partial` stories remain `in-progress`.
- [x] Remove `.memory/` from repository ignore rules.
- [x] Update pattern-matching story criteria to require glob semantics (not star-only).
- [x] Run Q&A clarification pass for ambiguous story criteria and record verbatim responses.
- [ ] Implement matcher tie handling as UI-visible conflict error (fail-loud).
- [ ] Add config enum for matching strategy/specificity resolution.
- [ ] Implement migration set in `pi-extension-config` for legacy `worktree` to `worktrees`.
- [ ] Add integration test coverage for command-level settings resolution, including onCreate order + failure-stop behavior.
- [ ] Add integration coverage in both config-service and command-level suites.
- [ ] Promote stories b2e9f0aa, c91d7e34, d3a54f18, e7b6a902 to `completed` once `test_coverage: full` is satisfied.
