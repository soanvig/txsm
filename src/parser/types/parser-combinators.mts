import { type Concat } from './helpers.mjs';
import { type FlatParserJoin, type FlatParserSuccessJoin } from './parser-result-combinators.mjs';
import { type ApplyParser, type Assume, type Parser, type ParserFailResult, type ParserSuccessResult } from './parser.mjs';

/**
 * All parsers need to success (due to FlatParserSucessJoin).
 * If FlatParserJoin would be used instead, then parsing will stop on first fail, however what was parsed will be returned
 */
export interface ChainParsers<P extends Parser[]> extends Parser {
  apply: (input: Assume<this['input'], string>) =>
  P extends [
    infer P1 extends Parser,
    ...infer Rest extends Parser[]
  ] ? ApplyParser<typeof input, P1> extends infer R extends ParserSuccessResult<unknown[]>
      ? FlatParserSuccessJoin<R, ApplyParser<R['rest'], ChainParsers<Rest>>, typeof input>
      : ParserFailResult<typeof input>
    : ParserSuccessResult<[], typeof input>;
}

/**
 * At least one of parsers needs to success. The first to succeed is chosen.
 */
export interface OneOfParsers<P extends Parser[]> extends Parser {
  apply: (input: Assume<this['input'], string>) =>
  P extends [
    infer P1 extends Parser,
    ...infer Rest extends Parser[]
  ] ? ApplyParser<typeof input, P1> extends infer R extends ParserSuccessResult<any[]>
      ? R
      : ApplyParser<typeof input, OneOfParsers<Rest>>
    : ParserFailResult<typeof input>;
}

/**
 * Concatenates parser result
 */
export interface MapConcatParser<P extends Parser> extends Parser {
  apply: (input: Assume<this['input'], string>) =>
    ApplyParser<typeof input, P> extends infer R extends ParserSuccessResult<string[]>
    ? ParserSuccessResult<[Concat<R['result']>], R['rest']>
    : ParserFailResult<typeof input>
}

/**
 * Applies parser over and over until fails, then returns joined result.
 * It needs to succeed at least once
 */
export interface ManyParser<P extends Parser> extends Parser {
  apply: (input: Assume<this['input'], string>) =>
  ApplyParser<typeof input, P> extends infer R extends ParserSuccessResult<unknown[]>
    ? FlatParserJoin<R, ApplyParser<R['rest'], ManyParser<P>>>
    : ParserFailResult<typeof input>
}

/**
 * Applies parser over and over until fails, then returns joined result.
 * It always succeeds, even for no single success
 */
export interface Many0Parser<P extends Parser> extends Parser {
  apply: (input: Assume<this['input'], string>) =>
  ApplyParser<typeof input, P> extends infer R extends ParserSuccessResult<unknown[]>
    ? FlatParserJoin<R, ApplyParser<R['rest'], ManyParser<P>>>
    : ParserSuccessResult<[], typeof input>
}

/**
 * Applies parser over and over until fails, then returns joined result.
 * It needs to succeed at least once
 */
export interface DropParser<P extends Parser> extends Parser {
  apply: (input: Assume<this['input'], string>) =>
  ApplyParser<typeof input, P> extends infer R extends ParserSuccessResult<unknown[]>
    ? ParserSuccessResult<[], R['rest']>
    : ParserFailResult<typeof input>
}

/**
 * If succeeds, returns parsed value, otherwise succeeds empty
 */
export interface OptParser<P extends Parser> extends Parser {
  apply: (input: Assume<this['input'], string>) =>
  ApplyParser<typeof input, P> extends infer R extends ParserSuccessResult<unknown[]>
    ? R
    : ParserSuccessResult<[], typeof input>
}

/**
 * Parses everything (by joining items) until given parser succeeds.
 * Conditional parser result is NOT dropped (it could be dropped, see comment)
 */
export interface UntilParser<P extends Parser> extends Parser {
  apply: (input: Assume<this['input'], string>) =>
  typeof input extends `${infer V}${infer Rest}`
    ? ApplyParser<Rest, P> extends ParserSuccessResult<unknown[]>
      ? ParserSuccessResult<[V], Rest> // Swap Rest to R[1] (R is result of ApplyParser) to drop conditional parser
      : FlatParserSuccessJoin<ParserSuccessResult<[V], Rest>, ApplyParser<Rest, UntilParser<P>>>
    : ParserFailResult<typeof input>;
}

/** [a, b, c] -> [[a, b, c]] */
export interface WrapParser<P extends Parser> extends Parser {
  apply: (input: Assume<this['input'], string>) =>
  ApplyParser<typeof input, P> extends infer R extends ParserSuccessResult<unknown[]>
    ? ParserSuccessResult<[R['result']], R['rest']>
    : ParserFailResult<typeof input>;
}

/**
 * Creates parser for: <ValueP><SeparatorP><ValueP>[<SeparatorP><ValueP>]*
 * At least one Value-Separator-Value needs to be parsed, then Separator and Value at least 0 times
 */
export type SeparatedByParser1<ValueP extends Parser, SeparatorP extends Parser> = ChainParsers<[
  ValueP,
  SeparatorP,
  ValueP,
  Many0Parser<ChainParsers<[SeparatorP, ValueP]>>
]>;

/**
 * Creates parser for: <ValueP>[<SeparatorP><ValueP>]*
 * At least one Value needs to be parsed, then Separator and Value at least 0 times
 */
export type SeparatedByParser<ValueP extends Parser, SeparatorP extends Parser> = ChainParsers<[
  ValueP,
  Many0Parser<ChainParsers<[SeparatorP, ValueP]>>
]>;

/**
 * Creates parser for: <ValueP>[<SeparatorP><ValueP>]*
 * Allows for no successful parsing as well
 */
export type SeparatedByParser0<ValueP extends Parser, SeparatorP extends Parser> = OptParser<ChainParsers<[
  ValueP,
  Many0Parser<ChainParsers<[SeparatorP, ValueP]>>
]>>;