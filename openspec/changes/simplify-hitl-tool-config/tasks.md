## 1. Worker Behavior

- [x] 1.1 Make `ask: true` append the built-in `ask_user` tool independently of the ordinary tool allowlist.
- [x] 1.2 Ensure `ask: false` silently withholds `ask_user` for explicit and wildcard tool configuration.
- [x] 1.3 Add focused tests for enabled, disabled, wildcard, and legacy redundant HITL configurations.

## 2. User Documentation

- [x] 2.1 Remove redundant `ask_user` tool entries from worker examples and README guidance.
- [x] 2.2 Update website HITL examples and conceptual documentation to describe `ask` as authoritative.

## 3. Verification

- [x] 3.1 Run relevant worker tests and type checks.
- [x] 3.2 Build the website and verify generated HITL documentation.
