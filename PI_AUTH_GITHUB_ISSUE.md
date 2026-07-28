# Support Pi-native model authentication and subscription OAuth

## Problem

RunHelm currently assumes the first entry in an Agent task's
`required_credentials` list is the model API key. `AgentExecutor` creates
`AuthStorage.inMemory()` for each task and installs that credential as Pi's
runtime API-key override.

This bypasses most of Pi's native authentication support and gives
`required_credentials` an undocumented positional meaning. It also means:

- Pi OAuth credentials from `auth.json` are not loaded or persisted.
- OAuth access-token refresh cannot be persisted.
- ChatGPT Plus/Pro, Claude Pro/Max, and GitHub Copilot subscription
  authentication cannot be used through Pi.
- A non-model credential in the first position can accidentally be used as the
  model credential.
- Provider-standard environment variables and Pi authentication sources are
  obscured by the generic `llm_api_key` convention.

Pi already provides `AuthStorage` and `ModelRegistry` support for provider
environment variables, stored API keys, OAuth credentials, automatic token
refresh, runtime overrides, and custom-provider OAuth extensions.

Example scenario: a workflow should be able to use
`openai-codex/gpt-5.2-codex` with a previously authenticated ChatGPT
subscription while still receiving `gh_token` from the RunHelm credential
store for GitHub tools. It should not need an `llm_api_key` placeholder or rely
on credential ordering.

## Goal

Use Pi as the primary model-authentication resolver while preserving RunHelm's
credential store as an explicit optional model-credential override.

An Agent task should be able to:

- omit a model credential and let Pi resolve authentication from persistent
  OAuth credentials, Pi `auth.json`, or provider-standard environment
  variables; or
- set an optional credential-store reference such as
  `model_credential: production_gemini_api_key`, which RunHelm resolves through
  `CredentialsPort` and passes to Pi as a runtime override.

`required_credentials` should describe credentials exposed to task execution
and tools, without positional model-authentication semantics.

## Acceptance Criteria

- [ ] Add an optional Agent configuration field for an explicit RunHelm
  model-credential reference, for example
  `model_credential: production_gemini_api_key`.
- [ ] Resolve `model_credential` through the existing `CredentialsPort`; never
  treat the field value as the secret itself.
- [ ] When `model_credential` is present, pass the resolved value to Pi as the
  runtime override for the provider selected by `model_id`.
- [ ] When `model_credential` is absent, do not install a runtime override;
  allow Pi to resolve authentication through its normal `AuthStorage` order.
- [ ] Remove the convention that `required_credentials[0]` is the model API
  key.
- [ ] Keep `required_credentials` responsible only for credentials required by
  task execution and approved tools.
- [ ] Create persistent Pi `AuthStorage` and `ModelRegistry` components at
  worker startup and inject/reuse them for Agent executions rather than
  creating in-memory authentication storage per task.
- [ ] Store Pi authentication in a RunHelm-owned directory rather than mounting
  the user's complete global `~/.pi/agent` directory.
- [ ] Mount the RunHelm Pi authentication directory read-write in Docker so Pi
  can persist refreshed OAuth credentials, while retaining restrictive file
  permissions.
- [ ] Add a supported login workflow, preferably
  `runhelm auth login <provider>`, that delegates to Pi's existing OAuth
  implementation rather than reimplementing provider OAuth in RunHelm.
- [ ] Add corresponding `runhelm auth status` and
  `runhelm auth logout <provider>` operations without exposing credential
  values.
- [ ] Support at least the Pi subscription providers available in the pinned Pi
  version: `anthropic`, `openai-codex`, and `github-copilot`.
- [ ] Document that subscription provider namespaces can differ from API
  providers, for example `openai-codex/...` versus `openai/...`.
- [ ] Add tests covering credential-store runtime override priority, Pi
  auth-file resolution, provider environment-variable resolution, missing
  authentication, OAuth refresh persistence, and concurrent refresh behavior
  supported by Pi's file locking.
- [ ] Update worker examples, the worker README, and website documentation to
  show both API-key and subscription-authentication configurations.
- [ ] Replace generic `llm_api_key` examples with provider-recognized names
  where an API key is actually required.
- [ ] Update the relevant OpenSpec requirements and design artifacts before
  implementation.

## Notes

Suggested Agent configuration:

```yaml
kind:
  Agent:
    model_id: "openai-codex/gpt-5.2-codex"
    model_credential: null
    # other Agent fields

required_credentials:
  - gh_token
```

With a RunHelm-managed API-key override:

```yaml
kind:
  Agent:
    model_id: "google/gemini-2.5-flash"
    model_credential: production_gemini_api_key

required_credentials:
  - gh_token
```

The credential store would contain the secret under the referenced logical
name:

```json
{
  "production_gemini_api_key": "actual-secret-value"
}
```

Recommended runtime structure:

```text
Worker startup
  ├── persistent Pi AuthStorage
  ├── shared Pi ModelRegistry
  └── RunHelm-owned Pi agent directory
          ↓
Agent execution
  ├── model_credential present → CredentialsPort → Pi runtime override
  └── model_credential absent  → Pi auth.json / OAuth / provider env resolution
```

Pi's authentication priority places a runtime override ahead of stored API-key
or OAuth credentials, followed by provider environment variables and
custom-provider fallback. RunHelm should preserve that behavior.

The Pi authentication directory must be writable because OAuth token refresh
updates `auth.json`. Pi's storage already uses restrictive permissions and file
locking for concurrent refreshes. Avoid mounting the user's complete global Pi
directory because it may expose unrelated credentials, extensions, settings,
and sessions.

Subscription authentication does not always imply that usage is included in
the base plan. In particular, Pi documents that Anthropic third-party harness
usage may draw from separately billed extra usage. Document provider-specific
billing and usage caveats without making RunHelm responsible for enforcing
them.

The currently installed `@earendil-works/pi-coding-agent` 0.74.0 already
exposes the required `AuthStorage`, OAuth refresh, and subscription-provider
mechanisms, so a Pi upgrade is not required solely for the initial integration.
Custom enterprise OAuth/SSO can remain a follow-up using Pi provider
extensions.
