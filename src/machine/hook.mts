import { Action } from './action.mjs';
import { Transition } from './transition.mjs';
import { ActionType, type ActionResult, type ActionStepPayload, type AnyMachineTypes, type MachineHook } from './types.mjs';

export class Hook<Types extends AnyMachineTypes> {
  protected constructor (
    protected hook: MachineHook<Types>,
    protected enter?: string,
    protected exit?: string,
  ) {}

  public static fromObject <Types extends AnyMachineTypes> (obj: { enter?: string, exit?: string, hook: MachineHook<Types> }) {
    return new Hook(
      obj.hook,
      obj.enter,
      obj.exit,
    );
  }

  public enterMatches (state: string): boolean {
    return this.enter === state || this.enter === Transition.ANY_STATE;
  }

  public exitMatches (state: string): boolean {
    return this.exit === state || this.exit === Transition.ANY_STATE;
  }

  public async* execute ({ context }: ActionStepPayload<Types, any>): AsyncGenerator<ActionResult<Types>, void, ActionStepPayload<Types, any>> {
    if (!this.hook.action) {
      return;
    }

    const collectedAction = this.hook.action({
      context: context.value,
      assign: newContext => Action.from({ type: ActionType.Assign, newContext }),
      invoke: (actorName, ...parameters) => Action.from({ type: ActionType.Invoke, actorName, parameters }),
      from: Action.from,
    });

    yield* collectedAction.iterate({ context });
  }
}