import { type NamedTrsnObject, type TrsnObject, type TrsnObjectToTrsn } from './types.mjs';

export class Transition<From extends string, To extends string, Name extends string | null> {
  private constructor (
    protected from: From,
    protected to: To,
    protected name: Name,
  ) {}

  public getTarget (currentState: string): string | null {
    if (this.from === Transition.CURRENT_STATE || this.from === currentState) {
      return this.to === Transition.CURRENT_STATE ? currentState : this.to;
    }

    throw new Error(`Cannot get target for transition. Current state ${currentState} is not applicable to that transition`);
  }

  public canTransitionFrom (currentState: string): boolean {
    return this.from === Transition.CURRENT_STATE || currentState === this.from;
  }

  public is (name: string): boolean {
    return this.name === name;
  }

  public matches (params: { from: string, to: string }): boolean {
    return this.from === params.from && this.to === params.to;
  }

  public isManual (): boolean {
    return this.name !== null;
  }

  public getTransition (): { from: string, to: string, name: Name } {
    return {
      from: this.from,
      to: this.to,
      name: this.name,
    };
  }

  public static fromObject<T extends TrsnObject | NamedTrsnObject> (obj: T): TrsnObjectToTrsn<T> {
    return new Transition(
      obj.from,
      obj.to,
      'with' in obj ? obj.with : null,
    ) as TrsnObjectToTrsn<T>;
  }

  static CURRENT_STATE = '*' as const;
}
