---
id: c4a1f0de
title: story-clarifications-qna
created_at: 2026-03-12T23:10:00+10:30
updated_at: 2026-03-12T23:10:00+10:30
status: completed
epic_id: a7c9d4f2
---

# Research: Story Clarifications Q&A

## Research Questions
- What exact glob semantics are required for repo matching?
- What target should patterns match against?
- How should specificity and ties be resolved?
- What compatibility/migration behavior is required?
- What integration-test scope and placement are required?

## Summary
The user clarified that matching semantics should align with minimatch behavior, target the full git remote URL, use segment-based specificity, and surface tie conflicts as UI errors for now. Compatibility is expected to be handled via migration in `pi-extension-config`, with migration set work required. Integration tests should cover precedence/fallback plus `onCreate` order/failure-stop behavior and live in both config-service and command-level suites.

## Findings
### Verbatim Q&A Transcript
- Q1: b 
- q2: what ever minimatch supports
- q3: what ever minimatch supports
- q4: the whole git remote url.
- q5: b, but we should probabl make this a confiuguration enum
- q6: d - ui notify error. we refine this later 
- q7: the pi-extension-config will migrate it. (we'll need to write a migration set too)
- q8: see q7
- q9: b
- q10: c

## References
- User-provided Q&A in chat session (primary source).
