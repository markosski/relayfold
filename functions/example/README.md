# RelayFold Function Workspace Template

Use this package as a starting point for authoring, testing, and packaging
multiple reusable RelayFold Functions in one TypeScript workspace. The
workspace shares its package dependencies, build script, lockfile, and test
command across every Function. It demonstrates:

- the Function runtime context type
- a pinned runtime dependency
- direct unit tests of Function entry points
- a manifest containing multiple stable Function IDs
- generation of one registry-ready JSON and YAML artifact per Function

## Create a Function workspace

From the RelayFold repository root, copy this directory:

```bash
mkdir -p functions/my-functions
cp -R functions/example/{README.md,package.json,scripts,src,test} functions/my-functions/
cd functions/my-functions
npm install
```

Then update:

1. `package.json` with the package name and dependencies.
2. The `relayfold.functions` manifest with each stable Function ID and source
   path.
3. The Function implementations under `src/`.
4. The tests under `test/` with expected behavior and edge cases.

The copied `scripts/build.mjs` is shared by the whole workspace and does not
need to change when Functions are added or removed.

## Function manifest

Declare every Function built by the workspace in `package.json`:

```json
{
  "relayfold": {
    "functions": [
      {
        "id": "billing.create_invoice",
        "source": "src/create-invoice.ts"
      },
      {
        "id": "billing.format_total",
        "source": "src/format-total.ts",
        "dependencies": []
      }
    ]
  }
}
```

Each entry requires:

- `id`: the stable registry ID used by workflow `ref`.
- `source`: the JavaScript or TypeScript entry point, relative to the workspace.

By default, an artifact includes all runtime dependencies from the workspace's
`package.json`. Set `dependencies` on an entry to override that list for one
Function. The empty override above keeps `billing.format_total` dependency-free.

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

When a manifest entry omits its `dependencies` field, the artifact builder
copies all package runtime dependencies into that generated Function definition.
An explicit per-Function dependency array overrides the default.

Keep development-only tools under `devDependencies`. Commit the lockfile and pin
runtime dependency versions so local tests and worker execution use predictable
packages.

## Test

The example tests import the TypeScript entry points and invoke them directly:

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

The example manifest contains two Functions, so the build creates:

```text
dist/example.greeting.json
dist/example.greeting.yaml
dist/example.uppercase.json
dist/example.uppercase.yaml
```

The build recreates `dist/` from the current manifest, so artifacts for removed
Functions do not linger.

The generated code no longer contains type-only imports. Runtime npm imports
remain in the code, and their packages appear in the artifact's `dependencies`.

Register an artifact against a local RelayFold instance:

```bash
export RELAYFOLD_URL=http://localhost:3000

curl -sS -X POST "$RELAYFOLD_URL/function-def" \
  --data-binary @dist/example.greeting.json
```

## Growing beyond the template

Keep a Function workspace in an application repository when its Functions are
tightly coupled to that application. Use a dedicated repository for a larger
Function—or a cohesive group of Functions with the same owner, dependencies,
and release cadence.

A dedicated Function repository should include:

- focused source modules behind small default Function entry points
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

Prefer one workspace or repository per independently owned or released
capability, not one per small helper. Related Functions should share a workspace
when they have the same lifecycle and dependency policy.

Treat Function IDs and their input/output contracts as release interfaces.
When an invoked Function definition must change incompatibly, register a new ID
such as `billing.create_invoice_v2` and migrate workflows deliberately.
