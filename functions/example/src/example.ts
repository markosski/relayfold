import type { RelayfoldFunction } from "../../relayfold";

const run: RelayfoldFunction = async (ctx) => {
  return {
    response: "Hello, world!",
    input: ctx.inputs?.[0] ?? null,
  };
};

export default run;
