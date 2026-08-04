## Why

The worker HTTP API accepts unauthenticated registration, heartbeat, task
claim, and task completion requests. Any client that can reach the listener can
therefore impersonate a worker, consume work, or submit forged results.

## What Changes

- **BREAKING** Require the orchestrator and every worker to configure the same
  non-empty `RELAYFOLD_WORKER_AUTH_TOKEN`.
- Require a matching bearer token on every `/workers/*` request while keeping
  the worker API `/health` endpoint public.
- Treat worker API authentication failures as permanent worker
  misconfiguration instead of retrying them indefinitely.
- Document secret injection, TLS responsibility, and coordinated token
  rotation.
- Align the worker IPC specification with the implemented HTTP transport.

## Capabilities

### New Capabilities

- `worker-api-authentication`: Defines shared-token configuration, protected
  worker routes, rejection behavior, and secret-handling requirements.

### Modified Capabilities

- `worker-pool-ipc`: Replaces the obsolete Unix Domain Socket transport
  requirements with the current authenticated worker HTTP API contract.

## Impact

The orchestrator worker router and startup configuration, the worker HTTP
client and startup configuration, Docker Compose configuration, protocol
tests, OpenSpec requirements, and user-facing installation, scaling, and API
documentation change. Public API namespace authentication remains independent.
