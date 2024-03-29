export type ContextValue = Record<string, any>;

export class Context<C extends ContextValue> {
  private constructor (
    public value: C,
  ) {}

  public static create<C extends ContextValue> (value: C): Context<C> {
    return new Context(value);
  }
}