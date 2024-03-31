export type ContextValue = Record<string, any>;

export class Context<C extends ContextValue> {
  protected constructor (
    public value: C,
  ) {}

  public static create<C extends ContextValue> (value: C): Context<C> {
    return new Context(value);
  }

  public merge (value: Partial<C>): Context<C> {
    return new Context({
      ...this.value,
      ...value,
    });
  }
}