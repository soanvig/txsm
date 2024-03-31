import { type Context } from './context.mjs';
import { type AnyMachineTypes, type MachineEffect } from './state-machine.mjs';
import { type AnyTrsn } from './transition.mjs';

export class Effect<Types extends AnyMachineTypes> {
  protected constructor (
    protected from: string,
    protected to: string,
    protected effect: MachineEffect<Types>,
  ) {}

  public static fromObject <Types extends AnyMachineTypes> (obj: { from: string, to: string, effect: MachineEffect<Types> }) {
    return new Effect(
      obj.from,
      obj.to,
      obj.effect,
    );
  }

  public static emptyFor (transition: AnyTrsn): Effect<AnyMachineTypes> {
    return Effect.fromObject({ ...transition.getTransition(), effect: {} });
  }

  public matches (transition: AnyTrsn): boolean {
    return transition.matches({ from: this.from, to: this.to });
  }

  public async* execute <P extends { context: Context<Types['context']> }> (): AsyncGenerator<EffectResult, void, P> {
    const actions = this.effect.actions;

    if (!actions) {
      return;
    }

    let { context } = yield { type: EffectResultType.Started };

    for (const action of actions) {
      await action({ context });

      ({ context } = yield { type: EffectResultType.Executed });
    }
  }

  public testGuard (payload: { context: Context<Types['context']> }): boolean {
    if (this.effect.guard && !this.effect.guard({ context: payload.context.value })) {
      return false;
    }

    return true;
  }
}

export enum EffectResultType {
  Started,
  Executed,
}

export type EffectResult =
  | { type: EffectResultType.Started }
  | { type: EffectResultType.Executed };