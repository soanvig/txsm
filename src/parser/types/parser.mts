export type ParserResult<T = string[], R extends string = string> = { result: T | null, rest: R };
export type ParserSuccessResult<T, R extends string = string> = { result: T, rest: R };
export type ParserFailResult<R extends string> = { result: null, rest: R };
export type UnwrapResultTotal<T extends ParserResult<unknown[]>> = T['result'] extends null
  ? never
  : T['rest'] extends ''
    ? T['result']
    : never;

export abstract class Parser {
  input: unknown; // needs to be unknown, otherwise string[] & ['a', 'b'] will not properly type
  abstract apply: (...x: any[]) => ParserResult<any, any>;
}

/** Input -> Parser -> ParserResult */
export type ApplyParser<Input, P extends Parser> = ReturnType<
  (P & {
    input: Input;
  })['apply']
>;

/** Helper to write proper parser definitions */
export type Assume<T, U> = T extends U ? T : U;