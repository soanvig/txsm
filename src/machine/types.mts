import { type UnwrapPromise } from '../helpers/types.mjs';
import { type Action } from './action.mjs';
import { type ContextValue } from './context.mjs';
import { type Effect } from './effect.mjs';
import { type HistoryEntry } from './history.mjs';
import { type MachineRuntime } from './machine-runtime.mjs';
import { type Transition } from './transition.mjs';

export type TrsnObject = {
  from: string;
  to: string;
}

export type NamedTrsnObject = {
  from: string;
  to: string;
  with: string;
}

export type AnyTrsnObject = TrsnObject | NamedTrsnObject;

export type AnyTrsn = Transition<string, string, string | null>;

/**
 * Trsn<From1, To1> | Trsn<From2, To2> -> From1 | To1 | From2 | To2
 */
export type TrsnStates<T extends AnyTrsn> = T extends Transition<infer F, infer T, any> ? F | T : never;

/**
 * Trsn<*, *, A> | Trsn<*, *, B> -> A | B
 */
export type TrsnCommands<T extends AnyTrsn> = T extends Transition<any, any, infer N> ? N extends string ? N : never : never;

/**
 * NamedTrsnObject | TrsnObject -> Trsn
 */
export type TrsnObjectToTrsn<T extends AnyTrsnObject> = T extends infer R extends AnyTrsnObject
  ? Transition<R['from'], R['to'], [R] extends [NamedTrsnObject] ? R['with'] : null>
  : never;

export type MachineConfig<T extends AnyTrsn> = {
  initial: Exclude<TrsnStates<T>, typeof Transition.CURRENT_STATE>,
  final: Exclude<TrsnStates<T>, typeof Transition.CURRENT_STATE>[],
}

export type CommandPayload = Record<string, any>;
export type Command = { type: string } & CommandPayload;
export type Actor = (...args: any[]) => any;
export type Guard<T extends AnyMachineTypes, C extends CommandPayload | null> = (p: { context: T['context'], command: C }) => boolean;
export type MachineEffect<T extends AnyMachineTypes, C extends CommandPayload | null> = {
  guard?: Guard<T, C>,
  action?: (payload: {
    /**
     * If effect was called after executing a command, this is the command that started the effect.
     */
    command: C,
    /**
     * Current machine's context
     */
    context: T['context'],
    /**
     * Update machine's context. It allows updating context partially, but the partiality is not shallow.
     * It doesn't allow to partially updated nested objects.
     * **The update happens instantaneously.**
     */
    assign: (context: Partial<T['context']>) => Action<T, any, any>,
    /**
     * Create action from callback or any other valid type
     */
    from: typeof Action['from'],
    /**
     * Invoke actor defined in StateMachine definition under given `actorName`, providing it with `params` it requires.
     */
    invoke: <K extends keyof T['actors'] & string>(
      actorName: K,
      ...params: Parameters<T['actors'][K]>
    ) => Action<T, any, UnwrapPromise<ReturnType<T['actors'][K]>>>
  }) => Action<T, unknown, any>,
}

export type MachineTypes<Trsns extends AnyTrsn> = {
  context: ContextValue;
  commands: Record<TrsnCommands<Trsns>, CommandPayload>;
  actors: Record<string, Actor>;
}

export type SetMachineTypes<Trsns extends AnyTrsn> = {
  context?: ContextValue;
  actors?: Record<string, Actor>;
} & (TrsnCommands<Trsns> extends never ? {} : { commands: Record<TrsnCommands<Trsns>, CommandPayload> });

type AddEffectParamFrom<Trsn extends AnyTrsn> = Trsn extends Transition<infer From, any, any>
  ? From
  : never;

type AddEffectParamTo<Trsn extends AnyTrsn, From extends string> = Trsn extends Transition<infer TFrom, infer To, any>
  ? TFrom extends From
    ? To
    : never
  : never;

type RunInput<Types extends AnyMachineTypes> = {}
  & { [K in keyof Types['context'] as K extends never ? never : 'context']: Types['context'] }
  & { [K in keyof Types['actors'] as K extends never ? never : 'actors']: Types['actors'] };

export type StateMachine<Trsn extends AnyTrsn, Types extends MachineTypes<AnyTrsn>> = {
  $config: MachineConfig<Trsn>,
  $transitions: Trsn[],
  $types: Types,
  $effects: Effect<Types>[],
}

export type MachineEffectCondition = { enter: string } | { exit: string } | { from: string, to: string };

export interface AddEffect<Trsn extends AnyTrsn, Types extends MachineTypes<AnyTrsn>> {
  <From extends AddEffectParamFrom<Trsn>, To extends AddEffectParamTo<Trsn, NoInfer<From>>> (
    condition: { from: From, to: To },
    effect: MachineEffect<Types, Trsn extends Transition<From, To, infer Name> ? Name extends string ? Types['commands'][Name] : null : never>
  ): StateMachineBuilder<Trsn, Types>;

  (condition: { exit: TrsnStates<Trsn> | typeof Transition.CURRENT_STATE }, effect: MachineEffect<Types, never>): StateMachineBuilder<Trsn, Types>;
  (condition: { enter: TrsnStates<Trsn> | typeof Transition.CURRENT_STATE }, effect: MachineEffect<Types, never>): StateMachineBuilder<Trsn, Types>;
}

export interface StateMachineBuilder<Trsn extends AnyTrsn, Types extends MachineTypes<AnyTrsn>> {
  /**
     * Only for TypeScript users.
     *
     * Allows to set state machine typing using convenient syntax:
     * ```ts
     * .setTypes({
     *  context: {} as {
     *    enteredYellowCounter: number
     *  },
     *  commands: {} as {
     *    stop: {},
     *    walk: {}
     *  },
     *  actors: {} as {
     *    logSomething: (value: string) => void
     *  }
     * })
     * ```
     */
  setTypes: <T extends SetMachineTypes<Trsn>> (
    types: T
  ) => StateMachineBuilder<Trsn, Types & T>;

  /**
   * Adds a new effect to the definiton.
   *
   * @param condition - describes when the effect should trigger
   * @param effect - describes what the effect does
   */
  addEffect: AddEffect<Trsn, Types>;

  getStateMachine(): StateMachine<Trsn, Types>;

  /**
   * Generate MachineRuntime from the state machine definiton
   */
  run: (
    input: RunInput<Types>,
  ) => MachineRuntime<Trsn, Types>

  /**
   * Restores runtime using snapshot, that machine previously created.
   */
  restoreRuntime: (
    input: { snapshot: Snapshot }
      & { [K in keyof Types['actors'] as K extends never ? never : 'actors']: Types['actors'] }
  ) => MachineRuntime<Trsn, Types>
}

export type StateMachineContext<T extends AnyMachineTypes> = T['context'];
export type StateMachineState<T extends AnyTrsn> = Exclude<TrsnStates<T>, typeof Transition.CURRENT_STATE>;
export type StateMachineCommands<T extends AnyMachineTypes> =
  keyof T['commands'] extends infer Keys extends string
    ? { [K in Keys]: { type: K } & T['commands'][K] }[Keys]
    : never;

export enum RuntimeStatus {
  Stopped = 'stopped',
  Pending = 'pending',
  Running = 'running',
  Done = 'done',
}

export enum ActionType {
  Call,
  Assign,
  Invoke
}

export type CallActionResult<Types extends AnyMachineTypes> = { type: ActionType.Call, result: Action<Types, any, any> | any };
export type AssignActionResult<Types extends AnyMachineTypes> = { type: ActionType.Assign, newContext: {} };
export type InvokeActionResult<Types extends AnyMachineTypes> = { type: ActionType.Invoke, actorName: string, parameters: any[] };
export type ActionResult<Types extends AnyMachineTypes = AnyMachineTypes> =
  | CallActionResult<Types>
  | AssignActionResult<Types>
  | InvokeActionResult<Types>;

export type ActionStepPayload<Types extends AnyMachineTypes, Output> = { result: Output, context: Types['context'], command: CommandPayload | null };
export type ActionStep = (input: any) => ActionResult;

export type AnyMachineTypes = MachineTypes<AnyTrsn>;
export type AnyStateMachine = StateMachine<any, any>;

export interface Snapshot<Trsn extends AnyTrsn = AnyTrsn, Types extends MachineTypes<Trsn> = AnyMachineTypes> {
  context: Types['context'];
  state: StateMachineState<Trsn>;
  status: RuntimeStatus;
  history: HistorySnapshot;
}

export type HistorySnapshot = {
  entries: HistoryEntry[];
}

export type TransitionPlan<Types extends AnyMachineTypes> = {
  command: StateMachineCommands<Types> | null;
  transition: AnyTrsn;
  effect: Effect<Types>;
}