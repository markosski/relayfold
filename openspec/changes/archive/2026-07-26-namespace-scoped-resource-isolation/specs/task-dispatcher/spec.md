## ADDED Requirements

### Requirement: Namespace-Aware Dispatch Tracking
`TaskDispatcher` SHALL share pending and active tracking across namespaces, SHALL retain namespace in pending dispatches and active leases, and SHALL correlate worker results to the authoritative lease through a globally unique dispatch ID.

#### Scenario: Claimed dispatch includes namespace
- **WHEN** a worker claims pending work
- **THEN** the returned task dispatch includes the namespace supplied by the engine

#### Scenario: Active workflow limit uses composite identity
- **WHEN** two pending dispatches use the same workflow instance ID in different namespaces
- **THEN** an active lease for one does not block the other as the same workflow identity

#### Scenario: Active dispatch result completes by dispatch ID
- **WHEN** a worker reports a result for an active dispatch ID
- **THEN** the dispatcher completes the workflow-side waiter associated with that exact lease
- **AND** result ownership comes from the lease rather than a namespace field in the result payload
