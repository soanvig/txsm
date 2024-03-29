import { type AnyTrsnObject, type NamedTrsnObject, type TrsnObject } from './configuration-types.mjs';

/**
 * Trsn seems to be abbreviation for Transition used in aircraft/technology
 */
export class Transition<From extends string, To extends string, Name extends string> {
  private constructor (
    protected from: From,
    protected to: To,
    protected name: Name | null,
  ) {}

  public getTarget (currentState: string): string | null {
    if (this.from === Transition.ANY_STATE) {
      return this.to === Transition.ANY_STATE ? currentState : this.to;
    }

    if (this.from === currentState) {
      return this.to === Transition.ANY_STATE ? currentState : this.to;
    }

    throw new Error(`Cannot get target for transition. Current state ${currentState} is not applicable to that transition`);
  }

  public canTransitionFrom (currentState: string): boolean {
    return this.from === Transition.ANY_STATE || currentState === this.from;
  }

  public is (name: string): boolean {
    return this.name === name;
  }

  public isManual (): boolean {
    return this.name !== null;
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

