import { type Char, type WhiteSpace } from './defs.mjs';
import { type ManyParser, type MapConcatParser } from './parser-combinators.mjs';
import { type Assume, type Parser, type ParserFailResult, type ParserSuccessResult } from './parser.mjs';

/** CharT -> [CharT] | ParserFailResult */
export interface CharParser<CharT extends string> extends Parser {
  apply: (input: Assume<this['input'], string>) =>
  typeof input extends `${infer V extends CharT}${infer Rest}`
    ? ParserSuccessResult<[V], Rest>
    : ParserFailResult<typeof input>;
}

/**
 * Str -> [Str] | ParserFailResult
 * @warn Union type for Str is not supported
 */
export interface StringParser<Str extends string> extends Parser {
  apply: (input: Assume<this['input'], string>) =>
  (typeof input) extends `${Str}${infer Rest}`
    ? ParserSuccessResult<[Str], Rest>
    : ParserFailResult<typeof input>;
}

/** ([a-zA-Z]+) -> ['$1'] | ParserFailResult */
export type WordParser = MapConcatParser<ManyParser<CharParser<Char>>>;

export interface DropAllWhitespaceParser extends Parser {
  apply: (input: Assume<this['input'], string>) => ParserSuccessResult<[], DropWhitespace<typeof input>>
}

type DropWhitespace<T extends string> = T extends `${infer V extends WhiteSpace}${infer Rest}` ? DropWhitespace<Rest> : T;