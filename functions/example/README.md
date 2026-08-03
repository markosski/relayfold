# RelayFold Function Template

Use this package as a starting point for authoring, testing, and packaging a
reusable RelayFold Function in TypeScript. It demonstrates:

- the Function runtime context type
- a pinned runtime dependency
- a direct unit test of the Function entry point
- generation of registry-ready JSON and YAML artifacts

## Create a Function package

From the RelayFold repository root, copy this directory:

```bash
mkdir -p functions/my-functions
cp -R functions/example/{README.md,package.json,scripts,src,test} functions/my-functions/
cd functions/my-functions
npm install
```

Then update:

1. `package.json` with the package name and dependencies.
2. `src/example.ts` with the Function implementation.
3. `scripts/build.mjs` with a stable Function ID and source path.
4. `test/example.test.mjs` with the expected behavior and edge cases.

Rename the source and test files when a more descriptive name improves the
package.

## Function entry point

A Function exports one default asynchronous function:

```ts
import type { RelayFoldFunction } from "../../relayfold";

const run: RelayFoldFunction = async ({ inputs, credentials, workspacePath }) => {
  return {
    response: "function completed",
    input: inputs[0] ?? null,
    workspacePath
  };
};

export default run;
```

The context contains:

- `inputs`: trigger input and upstream task outputs.
- `credentials`: values named in the task's `required_credentials`.
- `workspacePath`: the task's filesystem workspace.

Return JSON-compatible data so RelayFold can validate and pass the output to
downstream tasks.

## Dependencies

Add packages needed at runtime under `dependencies`:

```bash
npm install --save-exact package-name@version
```

When `scripts/build.mjs` omits its `dependencies` field, the artifact builder
copies all package runtime dependencies into the generated Function definition.
An explicit per-Function dependency array overrides that default.

Keep development-only tools under `devDependencies`. Commit the lockfile and pin
runtime dependency versions so local tests and worker execution use predictable
packages.

## Test

The example test imports the TypeScript entry point and invokes it directly:

```bash
npm test
```

Test the observable contract: inputs, outputs, errors, credential handling, and
side effects. Mock network services in unit tests and keep separate integration
tests for real service credentials.

The direct TypeScript import requires Node.js 22 or newer. On an older Node.js
version, configure a TypeScript test runner such as `tsx`.

## Build registry artifacts

```bash
npm run build
```

The build creates:

```text
dist/example.example.json
dist/example.example.yaml
```

The generated code no longer contains type-only imports. Runtime npm imports
remain in the code, and their packages appear in the artifact's `dependencies`.

Register an artifact against a local RelayFold instance:

```bash
export RELAYFOLD_URL=http://localhost:3000

curl -sS -X POST "$RELAYFOLD_URL/function-def" \
  --data-binary @dist/example.example.json
```

## Growing beyond the template

Keep a small Function in an application repository when it is tightly coupled
to that application. For a larger Function—or a cohesive group of Functions
with the same owner, dependencies, and release cadence—use a dedicated
repository.

A dedicated Function repository should include:

- focused source modules behind a small default Function entry point
- unit, contract, and integration tests
- exact runtime dependency versions and a committed lockfile
- CI that runs a clean install, tests, and artifact generation
- reviewed JSON or YAML artifacts for each release
- release notes describing Function IDs and contract changes

The builder and `RelayFoldFunction` type currently live in the RelayFold
repository. A separate Function repository can include RelayFold as a Git
submodule and adapt the imports in `scripts/build.mjs` and the TypeScript source
to reference `relayfold/functions/build-function-artifacts.mjs` and
`relayfold/functions/relayfold.d.ts`.

Prefer one repository per independently owned or released capability, not
automatically one repository per small helper. Related Functions can share a
repository when they have the same lifecycle and dependency policy.

Treat Function IDs and their input/output contracts as release interfaces.
When an invoked Function definition must change incompatibly, register a new ID
such as `billing.create_invoice_v2` and migrate workflows deliberately.