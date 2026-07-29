# Support Pi-native API-key and subscription authentication

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
- Provider-standard environment variables are obscured by the generic
  `llm_api_key` convention.

RunHelm already resolves every name in `required_credentials` through
`CredentialsPort` and exposes it to task execution as an uppercase environment
variable. For example, `openai_api_key` becomes `OPENAI_API_KEY`. Pi already
recognizes provider-standard environment variables, so a separate
model-credential reference is unnecessary.

Example scenario: a workflow should be able to use
`openai-codex/gpt-5.2-codex` with a previously authenticated ChatGPT
subscription while still receiving `gh_token` from the RunHelm credential
store for GitHub tools. It should not need an `llm_api_key` placeholder or rely
on credential ordering.

## Goal

Use Pi as the model-authentication resolver without introducing a dedicated
RunHelm model-credential mechanism.

An Agent task should be able to:

- list a provider-standard API-key variable in `required_credentials`, such as
  `openai_api_key` or `gemini_api_key`, which RunHelm resolves and exposes as
  `OPENAI_API_KEY` or `GEMINI_API_KEY`; or
- omit a model API-key credential and let Pi resolve persistent OAuth or other
  authentication appropriate for the provider selected by `model_id`.

`required_credentials` should retain one meaning for all task kinds: the named
credentials that RunHelm must resolve and expose to task execution. No entry
should have positional model-authentication semantics.

The Agent definition should not add `model_credential` or `use_api_key`.
Authentication is determined by:

1. the provider namespace in `model_id`;
2. credentials stored in Pi's persistent `auth.json`; and
3. provider-standard environment variables supplied through
   `required_credentials` or the worker environment.

## Acceptance Criteria

- [ ] Remove the convention that `required_credentials[0]` is installed as the
  model API key.
- [ ] Do not add a dedicated `model_credential` field.
- [ ] Do not add a `use_api_key` field; use the `model_id` provider namespace
  and Pi's normal authentication resolution instead.
- [ ] Continue resolving every `required_credentials` entry through the
  existing `CredentialsPort`.
- [ ] Continue exposing resolved credentials as uppercase environment
  variables for the complete Agent session creation and prompt execution
  scope.
- [ ] Allow Pi to discover provider-standard variables such as
  `OPENAI_API_KEY`, `GEMINI_API_KEY`, and `ANTHROPIC_API_KEY`.
- [ ] Fail before Agent execution when a credential explicitly listed in
  `required_credentials` cannot be resolved.
- [ ] When no model API-key credential is listed, allow Pi to resolve
  authentication through persistent `auth.json`, OAuth, worker environment
  variables, and its other normal fallback mechanisms.
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
- [ ] Document that API and subscription authentication may use different
  provider namespaces, especially `openai/...` for `OPENAI_API_KEY` versus
  `openai-codex/...` for a ChatGPT subscription.
- [ ] Document Pi's authentication priority. Stored API keys or OAuth
  credentials can take precedence over provider environment variables for the
  same provider.
- [ ] Document that credentials in `required_credentials` are exposed to
  approved Agent tools through the task environment.
- [ ] Add tests covering provider environment-variable resolution, Pi
  auth-file resolution, missing required credentials, missing model
  authentication, OAuth refresh persistence, and concurrent refresh behavior
  supported by Pi's file locking.
- [ ] Add a regression test proving that the first `required_credentials`
  entry no longer has special model-authentication behavior.
- [ ] Update worker examples, the worker README, and website documentation to
  show both API-key and subscription-authentication configurations.
- [ ] Replace generic `llm_api_key` examples with provider-recognized names
  where an API key is required.
- [ ] Update the relevant OpenSpec requirements and design artifacts before
  implementation.

## Notes

### API-key authentication

Use the API provider namespace and list the provider-standard environment
variable in lowercase as a required credential:

```yaml
kind:
  Agent:
    model_id: "openai/gpt-5.2"
    # other Agent fields

required_credentials:
  - openai_api_key
  - gh_token
```

The RunHelm credential store contains values under the same logical names:

```json
{
  "openai_api_key": "actual-secret-value",
  "gh_token": "github_pat_..."
}
```

During task execution, RunHelm exposes these as `OPENAI_API_KEY` and
`GH_TOKEN`. Pi resolves `OPENAI_API_KEY` for the `openai` provider without a
RunHelm-specific model credential override.

Another provider example:

```yaml
kind:
  Agent:
    model_id: "google/gemini-2.5-flash"

required_credentials:
  - gemini_api_key
```

### Subscription authentication

Select the subscription provider namespace and omit a model API-key
credential:

```yaml
kind:
  Agent:
    model_id: "openai-codex/gpt-5.2-codex"

required_credentials:
  - gh_token
```

Pi resolves the persisted OAuth credential for `openai-codex`. An
`OPENAI_API_KEY` is associated with the `openai` provider and is not the
authentication mechanism for `openai-codex`.

Recommended runtime structure:

```text
Worker startup
  ├── persistent Pi AuthStorage
  ├── shared Pi ModelRegistry
  └── RunHelm-owned Pi agent directory
          ↓
Agent execution
  ├── required_credentials → CredentialsPort → task environment
  └── Pi resolves auth for model_id provider
          ├── stored API key or OAuth credential
          ├── provider-standard environment variable
          └── Pi fallback
```

Pi's authentication priority is:

1. runtime override;
2. stored API key from `auth.json`;
3. stored OAuth token from `auth.json`;
4. provider environment variable; and
5. custom-provider fallback.

RunHelm should not install a runtime override from `required_credentials`.
Consequently, a stored credential can take precedence over an environment
variable for the same provider. For OpenAI, API-key and subscription usage are
unambiguous because they use the separate `openai` and `openai-codex`
namespaces. Anthropic uses one provider namespace for both stored OAuth and
`ANTHROPIC_API_KEY`, so Pi's normal priority determines which is used.

If users later need a strict per-task policy such as "require an API key even
when stored OAuth exists" or "require OAuth and reject environment fallback,"
that should be designed as a separate authentication-policy feature. A
`use_api_key` boolean should not be introduced until those strict semantics are
required and defined.

The Pi authentication directory must be writable because OAuth token refresh
updates `auth.json`. Pi's storage already uses restrictive permissions and file
locking for concurrent refreshes. Avoid mounting the user's complete global Pi
directory because it may expose unrelated credentials, extensions, settings,
and sessions.

Credentials named in `required_credentials` are intentionally available in the
task environment and can therefore be observed by approved Agent tools. Keep
tool approval narrow and list only credentials the task actually needs.

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
