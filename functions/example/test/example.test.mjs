import assert from "node:assert/strict";
import test from "node:test";
import { readdir } from "node:fs/promises";
import greeting from "../src/greeting.ts";
import uppercase from "../src/uppercase.ts";

test("generates a unique greeting and preserves its input", async () => {
  const input = { requestId: "example-request" };

  const result = await greeting({
    inputs: [input],
    credentials: {},
    workspacePath: "/tmp/relayfold-example-test",
  });

  assert.match(result.response, /^Hello, .+ .+!$/);
  assert.notEqual(result.response, "Hello, world!");
  assert.deepEqual(result.input, input);
});

test("uppercases a string input", async () => {
  const result = await uppercase({
    inputs: [{ value: "multiple functions" }],
    credentials: {},
    workspacePath: "/tmp/relayfold-example-test",
  });

  assert.deepEqual(result, { response: "MULTIPLE FUNCTIONS" });
});

test("build emits one YAML and JSON artifact per configured Function", async () => {
  assert.deepEqual(
    (await readdir(new URL("../dist", import.meta.url))).sort(),
    [
      "example.greeting.json",
      "example.greeting.yaml",
      "example.uppercase.json",
      "example.uppercase.yaml",
    ],
  );
});
