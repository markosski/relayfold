## Why

Agent tasks currently require both `ask: true` and `tools: ["ask_user"]` to
enable human-in-the-loop behavior, even though both fields express the same
permission. This redundant configuration is easy to misconfigure and obscures
which field is authoritative.

## What Changes

- Make `ask: true` automatically register and authorize the built-in
  `ask_user` tool.
- Keep `ask: false` authoritative by withholding `ask_user`, including when the
  task tool list contains `ask_user` or `_all_`.
- Silently ignore `ask_user` in the configured tool list when `ask` is false.
- Update examples and user documentation to configure HITL with `ask: true`
  without listing `ask_user`.

## Capabilities

### New Capabilities

- `agent-human-input`: Defines how Agent task configuration controls the
  built-in human-input tool and workflow pause behavior.

### Modified Capabilities

None.

## Impact

The worker Agent executor and its tool-selection tests change. Worker examples,
the worker README, and website human-input documentation are updated. Existing
workflows that specify both settings remain functional.
