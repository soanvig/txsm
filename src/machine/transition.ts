import { type AnyTrsnObject, type NamedTrsnObject, type TrsnObject } from './configuration-types';

/**
 * Trsn seems to be abbreviation for Transition used in aircraft/technology
 */
export class Transition<From extends string, To extends string, Name extends string> {
  private constructor (
    protected from: From,
    protected to: To,
    protected name: Name | null,
  ) {}

  public getTarget (): To {
    return this.to;
  }

  public is (name: string): boolean {
    return this.name === name;
  }

  public isAutomated (): boolean {
    return this.name === null;
  }

  public canTransitionFrom (from: string): boolean {
    return this.from === from || this.from === Transition.ANY_STATE;
  }

  public static fromObject<T extends TrsnObject | NamedTrsnObject> (obj: T): TrsnObjectToTrsn<T> {
    return new Transition(
      obj.from,
      obj.to,
      'with' in obj ? obj.with : null,
    ) as TrsnObjectToTrsn<T>;
  }

  static ANY_STATE = '*' as const;
}

export type AnyTrsn = Transition<string, string, string>;

/**
 * Trsn<From1, To1> | Trsn<From2, To2> -> From1 | To1 | From2 | To2
 */
export type TrsnStates<T extends AnyTrsn> = T extends Transition<infer F, infer T, any> ? F | T : never;

/**
 * Trsn<*, *, A> | Trsn<*, *, B> -> A | B
 */
export type TrsnCommands<T extends AnyTrsn> = T extends Transition<any, any, infer N> ? N : never;

/**
 * NamedTrsnObject | TrsnObject -> Trsn
 */
export type TrsnObjectToTrsn<T extends AnyTrsnObject> = Transition<T['from'], T['to'], T extends NamedTrsnObject ? T['with'] : never>;

