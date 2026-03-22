---
id: c6d8a1f4
title: Expose subcommands as tools
created_at: 2026-03-22T11:16:54+10:30
updated_at: 2026-03-22T11:16:54+10:30
status: proposed
---

# Expose subcommands as tools

## Vision/Goal
Expose selected CLI subcommands as first-class tools so agents and users can call them directly without shell indirection.

## Success Criteria
- A clear mapping exists from each exposed subcommand to a tool surface.
- Tool invocation paths preserve current subcommand behavior and argument semantics.
- Error output and exit semantics are standardized for tool consumers.
- Documentation explains supported tools, usage constraints, and migration guidance.

## Stories
- [ ] TBD during story definition.

## Phases

### Phase 1: Discovery and Interface Design
- **Status**: planned
- **Start Criteria**: Epic approved
- **End Criteria**: Tool exposure surface and compatibility constraints are documented
- **Tasks**: (to be defined)
- **Notes**: Enumerate candidate subcommands and define stable input/output contracts.

### Phase 2: Implementation
- **Status**: planned
- **Start Criteria**: Phase 1 complete
- **End Criteria**: Selected subcommands are callable as tools with tests
- **Tasks**: (to be defined)
- **Notes**: Implement adapters, argument translation, and error handling.

### Phase 3: Validation and Rollout
- **Status**: planned
- **Start Criteria**: Phase 2 complete
- **End Criteria**: Documentation updated and rollout validated against existing workflows
- **Tasks**: (to be defined)
- **Notes**: Verify backward compatibility and update guidance.

## Dependencies
- Existing subcommand architecture and parser behavior.
- Tool registration/discovery mechanism in this repository.
- Test coverage for command behavior and tool wrappers.

## Overall Timeline
- To be refined after story definition and task breakdown.
