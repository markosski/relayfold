import assert from "node:assert/strict";
import test from "node:test";
import run from "../src/example.ts";

test("generates a unique greeting and preserves its input", async () => {
  const input = { requestId: "example-request" };

  const result = await run({
    inputs: [input],
    credentials: {},
    workspacePath: "/tmp/relayfold-example-test",
  });

  assert.match(result.response, /^Hello, .+ .+!$/);
  assert.notEqual(result.response, "Hello, world!");
  assert.deepEqual(result.input, input);
});
