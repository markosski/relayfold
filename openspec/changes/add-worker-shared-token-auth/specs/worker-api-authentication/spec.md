## ADDED Requirements

### Requirement: Shared worker API token configuration
The orchestrator and worker SHALL require a non-empty
`RELAYFOLD_WORKER_AUTH_TOKEN` at startup.

#### Scenario: Token is absent or blank
- **WHEN** either process starts with the token missing, empty, or whitespace-only
- **THEN** startup SHALL fail with an error that does not disclose a token value

### Requirement: Worker route authentication
The orchestrator SHALL authenticate every `/workers/*` request using the
configured shared bearer token before invoking a route handler.

#### Scenario: Valid worker credential
- **WHEN** a worker request contains exactly one Authorization header with the Bearer scheme and matching token
- **THEN** the orchestrator SHALL allow the request to reach its route handler

#### Scenario: Invalid worker credential
- **WHEN** a worker request omits the credential or supplies a malformed, duplicate, or non-matching credential
- **THEN** the orchestrator SHALL return `401 Unauthorized`
- **AND** it SHALL NOT mutate worker registry, dispatch, or workflow state

### Requirement: Constant-time secret handling
The orchestrator SHALL compare worker credentials in constant time and neither
process SHALL log configured or supplied token values.

#### Scenario: Authentication is rejected
- **WHEN** a worker credential does not match
- **THEN** the response and logs SHALL contain only a generic authentication error

### Requirement: Public worker health endpoint
The worker API `/health` endpoint SHALL remain accessible without worker
authentication.

#### Scenario: Unauthenticated health probe
- **WHEN** a client requests `/health` without an Authorization header
- **THEN** the orchestrator SHALL return the normal health response

### Requirement: Worker authentication failure handling
Workers SHALL attach the shared bearer token to every worker API request and
SHALL treat `401 Unauthorized` as permanent configuration failure.

#### Scenario: Registration is unauthorized
- **WHEN** worker registration returns `401 Unauthorized`
- **THEN** the worker SHALL terminate instead of retrying registration

#### Scenario: Operational request is unauthorized
- **WHEN** heartbeat, claim, or result submission returns `401 Unauthorized`
- **THEN** the worker SHALL surface a fatal authentication error and terminate

#### Scenario: Transient request failure
- **WHEN** registration or another retryable request fails because of connectivity or a server error
- **THEN** the worker SHALL retain its existing retry behavior
