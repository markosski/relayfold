import type { RelayFoldFunction } from "../../relayfold";

const run: RelayFoldFunction<readonly [{ value?: unknown }]> = async ({ inputs }) => {
  const value = inputs[0]?.value;

  return {
    response: typeof value === "string" ? value.toUpperCase() : "",
  };
};

export default run;
