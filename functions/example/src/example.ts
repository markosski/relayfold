import type { RelayFoldFunction } from "../../relayfold";

const run: RelayFoldFunction = async (ctx) => {
  return {
    response: "Hello, world!",
    input: ctx.inputs?.[0] ?? null,
  };
};

export default run;
