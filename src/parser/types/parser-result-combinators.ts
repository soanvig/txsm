import { type Concat } from './helpers';
import { type ParserFailResult, type ParserResult, type ParserSuccessResult } from './parser';

/** ParserResult P1 -> ParserResult P2 -> `${P1}${P2}` || P1 || ParserFailResult */
export type FlatParserSuccessConcat<P1 extends ParserResult, P2 extends ParserResult> =
  P1 extends ParserSuccessResult<string[]>
  ? P2 extends ParserSuccessResult<string[]>
    ? ParserSuccessResult<[Concat<[...P1['result'], ...P2['result']]>], P2['rest']>
    : P1
  : ParserFailResult<P1['rest']>;

/** ParserResult P1 -> ParserResult P2 -> [...P1, ...P2] || P1 || ParserFailResult */
export type FlatParserJoin<P1 extends ParserResult<unknown[]>, P2 extends ParserResult<unknown[]>> =
  P1 extends ParserSuccessResult<unknown[]>
  ? P2 extends ParserSuccessResult<unknown[]>
    ? ParserSuccessResult<[...P1['result'], ...P2['result']], P2['rest']>
    : P1
  : ParserFailResult<P1['rest']>;

/** ParserResult P1 -> ParserResult P2 -> [...P1, ...P2] || ParserFailResult */
export type FlatParserSuccessJoin<P1 extends ParserResult<unknown[]>, P2 extends ParserResult<unknown[]>, FailResult extends string = P1['rest']> =
  P1 extends ParserSuccessResult<unknown[]>
  ? P2 extends ParserSuccessResult<unknown[]>
    ? ParserSuccessResult<[...P1['result'], ...P2['result']], P2['rest']>
    : ParserFailResult<FailResult>
  : ParserFailResult<FailResult>;