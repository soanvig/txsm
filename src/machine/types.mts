import { type UnwrapPromise } from '../helpers/types.mjs';
import { type Action } from './action.mjs';
import { type ContextValue } from './context.mjs';
import { type Effect } from './effect.mjs';
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

export type AnyTrsn = Transition<string, string, string>;

/**
 * Trsn<From1, To1> | Trsn<From2, To2> -> From1 | To1 | From2 | To2
 */
export type TrsnStates<T extends AnyTrsn> = T extends Transition<infer F, infer T, any> ? F | T : never;

/**
 * Trsn<*, *, A> | Trsn<*, *, B> -> A | B
 */
export type TrsnCommands<T extends AnyTrsn> = T extends Transition<any, any, infer N> ? N : never;

/**
 * NamedTrsnObject | TrsnObject -> Trsn
 */
export type TrsnObjectToTrsn<T extends AnyTrsnObject> = T extends infer R extends AnyTrsnObject
  ? Transition<R['from'], R['to'], [R] extends [NamedTrsnObject] ? R['with'] : never>
  : never;

export type MachineConfig<T extends AnyTrsn> = {
  initial: Exclude<TrsnStates<T>, typeof Transition.ANY_STATE>,
  final: Exclude<TrsnStates<T>, typeof Transition.ANY_STATE>[],
}

export type CommandPayload = Record<string, any>;
export type Actor = (...args: any[]) => any;
export type Guard<T extends AnyMachineTypes> = (p: { context: T['context'] }) => boolean;
export type MachineEffect<T extends AnyMachineTypes> = {
  guard?: Guard<T>,
  action?: (payload: {
    context: T['context'],
    assign: (context: Partial<T['context']>) => Action<T, any, any>,
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

type AddEffectParamFrom<Trsn extends AnyTrsn> = Trsn extends Transition<infer From, any, any>
  ? From
  : never;

type AddEffectParamTo<Trsn extends AnyTrsn, From extends string> = Trsn extends Transition<infer TFrom, infer To, any>
  ? TFrom extends From
    ? To
    : never
  : never;

export type StateMachine<Trsn extends AnyTrsn, Types extends MachineTypes<AnyTrsn>> = {
  $config: MachineConfig<Trsn>,
  $transitions: Trsn[],
  $types: Types,
  $effects: { from: string, to: string, effect: MachineEffect<Types> }[],
}

export type StateMachineBuilder<Trsn extends AnyTrsn, Types extends MachineTypes<AnyTrsn>> = {
  setTypes: <T extends MachineTypes<Trsn>> (
    types: T
  ) => StateMachineBuilder<Trsn, T>;

  addEffect: <From extends AddEffectParamFrom<Trsn>> (
    from: From,
    to: AddEffectParamTo<Trsn, NoInfer<From>>,
    effect: MachineEffect<Types>
  ) => StateMachineBuilder<Trsn, Types>;

  addHook: (
    hookSettings: unknown,
    hook: unknown
  ) => StateMachineBuilder<Trsn, Types>;

  getStateMachine(): StateMachine<Trsn, Types>;

  run: (
    input: { context: Types['context'] }
      & { [K in keyof Types['actors'] as K extends never ? never : 'actors']: Types['actors'] }
  ) => MachineRuntime<Trsn, Types>
};

export type StateMachineContext<T extends AnyMachineTypes> = T['context'];
export type StateMachineState<T extends AnyTrsn> = Exclude<TrsnStates<T>, typeof Transition.ANY_STATE>;
export type StateMachineCommands<T extends AnyMachineTypes> =
  keyof T['commands'] extends infer Keys extends string
    ? { [K in Keys]: { type: K } & T['commands'][K] }[Keys]
    : never;

export type TrsnWithEffect<Types extends MachineTypes<AnyTrsn>> = { transition: AnyTrsn, effect: Effect<Types> };

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

export type ActionStepPayload<Types extends AnyMachineTypes, Output> = { result: Output, context: Types['context'] };
export type ActionStep = (input: any) => ActionResult;

export type AnyMachineTypes = MachineTypes<AnyTrsn>;
export type AnyStateMachine = StateMachine<AnyTrsn, MachineTypes<AnyTrsn>>;