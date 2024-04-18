import deepClone from '../helpers/deepClone.mjs';

export type ContextValue = Record<string, any>;

export class Context<C extends ContextValue> {
  protected constructor (
    public value: C,
  ) {}

  public static create<C extends ContextValue> (value: C): Context<C> {
    return new Context(value);
  }

  public getReadonly (): C {
    return deepClone(this.value);
  }

  public getSnapshot (): C {
    return deepClone(this.value);
  }

  public merge (value: Partial<C>): Context<C> {
    return new Context({
      ...this.value,
      ...value,
    });
  }
}