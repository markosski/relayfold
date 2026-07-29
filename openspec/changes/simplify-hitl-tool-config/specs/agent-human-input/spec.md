## ADDED Requirements

### Requirement: Agent Ask Flag Controls Human Input
The worker SHALL use the Agent task `ask` flag as the sole authority for
exposing the built-in `ask_user` tool.

#### Scenario: Ask enabled without tool-list entry
- **WHEN** an Agent task sets `ask` to `true` and does not include `ask_user` in its configured tools
- **THEN** the worker exposes `ask_user` to the Agent

#### Scenario: Ask disabled with explicit tool-list entry
- **WHEN** an Agent task sets `ask` to `false` and includes `ask_user` in its configured tools
- **THEN** the worker does not expose `ask_user`
- **THEN** the worker does not reject the task because of the ignored entry

#### Scenario: Ask disabled with wildcard tools
- **WHEN** an Agent task sets `ask` to `false` and configures `_all_` tools
- **THEN** the worker does not expose `ask_user`

#### Scenario: Legacy redundant configuration
- **WHEN** an Agent task sets `ask` to `true` and includes `ask_user` in its configured tools
- **THEN** the worker exposes one `ask_user` tool

### Requirement: Enabled Human Input Pauses Agent Execution
An Agent task with `ask` enabled SHALL be able to request human input through
the built-in tool and return the request through the existing task-execution
result contract.

#### Scenario: Agent invokes built-in human-input tool
- **WHEN** an Agent task with `ask` enabled invokes `ask_user` with a question
- **THEN** task execution returns `input_needed` with that question
