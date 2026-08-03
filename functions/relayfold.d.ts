export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

export interface RelayFoldFunctionContext<
  TInputs extends readonly unknown[] = readonly unknown[],
  TCredentials extends Record<string, string> = Record<string, string>
> {
  inputs: TInputs;
  credentials: TCredentials;
  workspacePath: string;
}

export type RelayFoldFunction<
  TInputs extends readonly unknown[] = readonly unknown[],
  TCredentials extends Record<string, string> = Record<string, string>,
  TOutput = unknown
> = (ctx: RelayFoldFunctionContext<TInputs, TCredentials>) => TOutput | Promise<TOutput>;
