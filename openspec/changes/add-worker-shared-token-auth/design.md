## Context

The orchestrator exposes a dedicated HTTP listener for workers. Registration,
heartbeat, claim, and result routes currently trust every reachable client.
Workers already send all requests through one HTTP helper, and the worker
router is separate from the public API router.

## Goals / Non-Goals

**Goals:**

- Authenticate every stateful worker API request with one deployment-managed
  shared secret.
- Fail both processes early when authentication is not configured.
- Keep readiness probes independent from secret distribution.
- Avoid leaking either expected or supplied credentials.

**Non-Goals:**

- Per-worker credentials, authorization scopes, live reload, or overlapping
  rotation tokens.
- Transport encryption or changes to public API namespace authentication.

## Decisions

- Both processes read `RELAYFOLD_WORKER_AUTH_TOKEN` at startup and reject
  missing, empty, or whitespace-only values. Environment configuration matches
  the project's existing deployment model and container secret injection.
- Workers send the token as `Authorization: Bearer <token>` from the shared
  JSON request helper. The orchestrator protects the `/workers/*` sub-router
  with middleware, keeping `/health` outside that layer.
- Authentication accepts exactly one Authorization header, a case-insensitive
  Bearer scheme, and one credential. Comparison uses constant-time equality.
  All rejection responses are the same generic `401 Unauthorized`.
- Registration treats `401` as fatal. Heartbeat runs outside the claim loop, so
  a fatal-auth callback stops the process; claim and result requests propagate
  `401` as fatal instead of retrying. Network and server failures retain their
  existing retry behavior.
- Rotation is coordinated: update the shared secret and restart orchestrator
  and workers. Supporting two active tokens would expand the contract and is
  deferred.

## Risks / Trade-offs

- A shared token compromise affects every worker. → Require high-entropy
  deployment secrets and document coordinated rotation.
- Bearer tokens are visible on plaintext HTTP links. → Document that
  deployments crossing untrusted networks must terminate TLS.
- Mandatory configuration breaks existing deployments. → Fail with clear
  secret-free startup errors and update Compose and installation docs.
- Coordinated restart can briefly remove capacity. → Workers retain their
  registration retry behavior while the orchestrator restarts.

## Migration Plan

Configure the same secret on the orchestrator and all workers, deploy the
orchestrator, then restart workers. Rollback requires restoring the prior
version of both components; no stored data migration is involved.

## Open Questions

None.
