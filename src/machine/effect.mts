import { Action } from './action.mjs';
import { Transition } from './transition.mjs';
import { ActionType, type ActionResult, type ActionStepPayload, type AnyMachineTypes, type AnyTrsn, type CommandPayload, type MachineEffect, type MachineEffectCondition } from './types.mjs';

export class Effect<Types extends AnyMachineTypes> {
  protected constructor (
    public readonly condition: MachineEffectCondition,
    protected effect: MachineEffect<Types, CommandPayload | null>,
  ) {}

  public static fromObject <Types extends AnyMachineTypes> (obj: { condition: MachineEffectCondition, effect: MachineEffect<Types, CommandPayload | null> }) {
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
    return Effect.isEnterCondition(this.condition) && (this.condition.enter === state || this.condition.enter === Transition.CURRENT_STATE);
  }

  public matchesExit (state: string): boolean {
    return Effect.isExitCondition(this.condition) && (this.condition.exit === state || this.condition.exit === Transition.CURRENT_STATE);
  }

  public isSameTransition (effect: Effect<any>): boolean {
    const thisCondition = this.condition;
    const effectCondition = effect.condition;

    return (
      Effect.isTrsnCondition(thisCondition)
      && Effect.isTrsnCondition(effectCondition)
      && thisCondition.from === effectCondition.from
      && thisCondition.to === effectCondition.to
    );
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
    if (this.effect.guard) {
      return this.effect.guard({ context: payload.context, command: payload.command });
    }

    return true;
  }

  public static isTrsnCondition = (v: MachineEffectCondition): v is { from: string, to: string } => 'from' in v;
  public static isEnterCondition = (v: MachineEffectCondition): v is { enter: string } => 'enter' in v;
  public static isExitCondition = (v: MachineEffectCondition): v is { exit: string } => 'exit' in v;
}