---
id: d5a4c8e1
title: worktrees-tools-qna
created_at: 2026-03-22T12:37:18+10:30
updated_at: 2026-03-22T12:37:18+10:30
status: completed
epic_id: c6d8a1f4
---

# Research: Worktrees Tool Story Discovery Q&A

## Research Questions
- What problem should exposing subcommands as tools solve?
- Which subcommands are in scope for first release?
- Should tool exposure start as one tool or many?
- What tool name should be used?
- What should discovery/documentation expectations be?
- Are permissions/guardrails in scope now?
- What are the acceptance gates?
- What rollout model and compatibility expectation apply?

## Summary
Discovery confirms the initial release should expose worktree operations for agent-native use via natural language prompting, using one tool named `worktrees` with subcommands `list`, `create`, and `remove`. Permissions hardening is out of scope for this extension phase, with explicit acknowledgement that `remove` is destructive. Epic completion requires implementation, tests, and docs, delivered as a big-bang rollout with no backward-compatibility obligation.

## Findings
### Verbatim Q&A Transcript
- Q1: allow agents to use the worktree extension due to user prompting natural language
- Q2: list, create, remove
- Q3: start with one tool with subcmds
- Q4: toolname: worktrees
- Q5: standard, let pi deal with it, because we register the tool
- Q6: remove is destructive. but permissions isn't the scope of this extension
- Q7: implementation, tests, documentation
- Q8: big bang, no backwards compat

## References
- User-provided Q&A in chat session (primary source).
