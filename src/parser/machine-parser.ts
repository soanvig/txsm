import { type ApplyParser, type UnwrapResultTotal } from './types/parser';
import { type ChainParsers, type MapConcatParser, type OneOfParsers, type SeparatedByParser, type SeparatedByParser1, type WrapParser } from './types/parser-combinators';
import { type DropAllWhitespaceParser, type StringParser, type WordParser } from './types/parsers';

type NamelessArrowParser = StringParser<'->'>;
type NamedArrowParser = MapConcatParser<ChainParsers<[StringParser<'-('>, WordParser, StringParser<')->'>]>>;
type ArrowParser = ChainParsers<[DropAllWhitespaceParser, OneOfParsers<[NamelessArrowParser, NamedArrowParser]>, DropAllWhitespaceParser]>;
type StateParser = WordParser;
type LineParser = ChainParsers<[
  DropAllWhitespaceParser,
  SeparatedByParser1<StateParser, ArrowParser>,
  DropAllWhitespaceParser
]>;
type TokenParser = SeparatedByParser<DropAllWhitespaceParser, WrapParser<LineParser>>;

type Test = `
  pending -(signed)-> onSigned
  onSigned -> signed
  onSigned -> pending
`;

type Tokens = UnwrapResultTotal<ApplyParser<Test, TokenParser>>;

type Transition<From extends string, To extends string, Name extends string | null> = { from: From, to: To, name: Name };
type NamelessArrow = '-->';
type NamedArrow<T extends string> = `-(${T})->`;

type TransitionParser<T extends string[], Acc extends Transition<any, any, any>> = T extends [
  infer S1 extends string, infer A extends string, infer S2 extends string, ...infer Rest extends string[]
] ? TransitionParser<[S2, ...Rest], Acc | Transition<S1, S2, A extends NamedArrow<infer N> ? N : null>>
  : never;

type Transitions<T extends string[]> = TransitionParser<T, never>;

type FoundTransitions0 = Transitions<Tokens[0]>
type FoundTransitions = Transitions<Tokens extends (infer T)[] ? T : never>

