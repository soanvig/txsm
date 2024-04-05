import { ActionType, type ActionResult, type ActionStep, type ActionStepPayload, type AnyMachineTypes, type AssignActionResult, type InvokeActionResult } from './types.mjs';

/**
 * Action is special object, that allows to divide a process
 * into steps (Assign, Invoke, Call a function etc).
 * The steps are called one by one by the runtime, and result of previous step
 * is parameter for next step.
 *
 * Overall action is divided into steps, so each of them can be run as needed
 * by runtime. It makes action execution predictable.
 */
export class Action<Types extends AnyMachineTypes, Input, Output> {
  protected constructor (
    protected actionSteps: ActionStep[],
  ) {}

  // Input action
  public then<NewOutput> (
    value: Action<Types, Input, NewOutput>
  ): Action<Types, Input, NewOutput>;

  // Input function returning action
  public then<NewOutput> (
    value: (payload: ActionStepPayload<Types, Output>) => Action<Types, any, NewOutput>
  ): Action<Types, Input, NewOutput>; // this has to be above (higher priority)

  // Input function returning result
  public then<NewOutput> (
    value: (payload: ActionStepPayload<Types, Output>) => NewOutput
  ): Action<Types, Input, NewOutput>; // this has to be below (lower priority)

  public then (value: ((...args: any[]) => any) | Action<Types, any, any>): Action<Types, any, any> {
    if (value instanceof Action) {
      return new Action(
        this.actionSteps.concat(value.actionSteps),
      );
    } else {
      return new Action(
        this.actionSteps.concat(input => ({ type: ActionType.Call, result: value(input) })),
      );
    }
  }

  public* iterate (input: Input): Generator<ActionResult, any, any> {
    for (const step of this.actionSteps) {
      const stepResult = step(input);

      if (stepResult.type === ActionType.Call && stepResult.result instanceof Action) {
        input = yield* stepResult.result.iterate(input);
      } else {
        input = yield stepResult;
      }
    }

    return input;
  }

  public static from<T extends AnyMachineTypes>(value: AssignActionResult<T>): Action<T, any, unknown>;
  public static from<T extends AnyMachineTypes>(value: InvokeActionResult<T>): Action<T, any, any>;
  public static from<Input, Output>(value: (input: Input) => Promise<Output>): Action<any, Input, Output>;
  public static from<Input, Output>(value: (input: Input) => Output): Action<any, Input, Output>;
  public static from (value: ((arg: any) => any) | AssignActionResult<AnyMachineTypes> | InvokeActionResult<AnyMachineTypes>) {
    if (typeof value === 'function') {
      return new Action([
        input => ({ type: ActionType.Call, result: value(input) }),
      ]);
    } else {
      return new Action([() => value]);
    }
  }
}