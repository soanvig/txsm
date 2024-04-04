import { Action } from './action.mjs';
import { type Context } from './context.mjs';
import { ActionType, type ActionResult, type ActionStepPayload, type AnyMachineTypes, type AnyTrsn, type MachineEffect } from './types.mjs';

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

  public static emptyFor<Types extends AnyMachineTypes> (transition: AnyTrsn): Effect<Types> {
    return Effect.fromObject({ ...transition.getTransition(), effect: {} });
  }

  public matches (transition: AnyTrsn): boolean {
    return transition.matches({ from: this.from, to: this.to });
  }

  public async* execute ({ context }: ActionStepPayload<Types, any>): AsyncGenerator<ActionResult<Types>, void, ActionStepPayload<Types, any>> {
    if (!this.effect.action) {
      return;
    }

    const collectedAction = this.effect.action({
      context: context.value,
      assign: newContext => Action.from({ type: ActionType.Assign, newContext }),
      invoke: (actorName, ...parameters) => Action.from({ type: ActionType.Invoke, actorName, parameters }),
    });

    yield* collectedAction.iterate({ context });
  }

  public testGuard (payload: { context: Context<Types['context']> }): boolean {
    if (this.effect.guard && !this.effect.guard({ context: payload.context.value })) {
      return false;
    }

    return true;
  }
}
