import { Action } from './action.mjs';
import { Transition } from './transition.mjs';
import { ActionType, type ActionResult, type ActionStepPayload, type AnyMachineTypes, type AnyTrsn, type CommandPayload, type EffectCondition, type MachineEffect } from './types.mjs';

export class Effect<Types extends AnyMachineTypes> {
  protected constructor (
    protected condition: EffectCondition,
    protected effect: MachineEffect<Types, CommandPayload | null>,
  ) {}

  public static fromObject <Types extends AnyMachineTypes> (obj: { condition: EffectCondition, effect: MachineEffect<Types, CommandPayload | null> }) {
    return new Effect(
      obj.condition,
      obj.effect,
    );
  }

  public static emptyFor<Types extends AnyMachineTypes> (transition: AnyTrsn): Effect<Types> {
    return Effect.fromObject({ condition: transition.getTransition(), effect: {} });
  }

  public matchesTransition (transition: AnyTrsn): boolean {
    return Effect.isTrsnCondition(this.condition) && transition.matches({ from: this.condition.from, to: this.condition.to });
  }

  public matchesEnter (state: string): boolean {
    return Effect.isEnterCondition(this.condition) && (this.condition.enter === state || this.condition.enter === Transition.ANY_STATE);
  }

  public matchesExit (state: string): boolean {
    return Effect.isExitCondition(this.condition) && (this.condition.exit === state || this.condition.exit === Transition.ANY_STATE);
  }

  public async* execute ({ context, command }: ActionStepPayload<Types, any>): AsyncGenerator<ActionResult<Types>, void, ActionStepPayload<Types, any>> {
    if (!this.effect.action) {
      return;
    }

    const collectedAction = this.effect.action({
      context,
      assign: newContext => Action.from({ type: ActionType.Assign, newContext }),
      invoke: (actorName, ...parameters) => Action.from({ type: ActionType.Invoke, actorName, parameters }),
      command,
      from: Action.from,
    });

    yield* collectedAction.iterate({ context });
  }

  public testGuard (payload: { context: Types['context'], command: CommandPayload }): boolean {
    if (this.effect.guard && !this.effect.guard({ context: payload.context, command: payload.command })) {
      return false;
    }

    return true;
  }

  public static isTrsnCondition = (v: EffectCondition): v is { from: string, to: string } => 'from' in v;
  public static isEnterCondition = (v: EffectCondition): v is { enter: string } => 'enter' in v;
  public static isExitCondition = (v: EffectCondition): v is { exit: string } => 'exit' in v;
}
