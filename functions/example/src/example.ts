import type { RelayFoldFunction } from "../../relayfold";
import { adjectives, animals, uniqueNamesGenerator } from "unique-names-generator";

const run: RelayFoldFunction = async (ctx) => {
  const name = uniqueNamesGenerator({
    dictionaries: [adjectives, animals],
    separator: " ",
  });

  return {
    response: `Hello, ${name}!`,
    input: ctx.inputs?.[0] ?? null,
  };
};

export default run;
