import { type UnwrapPromise } from '../helpers/types.mjs';
import { type Action } from './action.mjs';
import { type AnyTrsnObject } from './configuration-types.mjs';
import { type ContextValue } from './context.mjs';
import { MachineRuntime } from './machine-runtime.mjs';
import { Transition, type AnyTrsn, type TrsnCommands, type TrsnObjectToTrsn, type TrsnStates } from './transition.mjs';

export type MachineConfig<T extends AnyTrsn> = {
  initial: Exclude<TrsnStates<T>, typeof Transition.ANY_STATE>,
  final: Exclude<TrsnStates<T>, typeof Transition.ANY_STATE>[],
}

export type ActionPayload<T extends AnyMachineTypes> = {
  context: T['context'],
  assign: (context: Partial<T['context']>) => Action<T, any, any>,
  invoke: <K extends keyof T['actors'] & string>(actorName: K, ...params: Parameters<T['actors'][K]>) => Action<T, any, UnwrapPromise<ReturnType<T['actors'][K]>>>
};

export type CommandPayload = Record<string, any>;
export type Actor = (...args: any[]) => any;
export type MachineEffect<T extends MachineTypes<AnyTrsn>> = {
  guard?: (p: { context: T['context'] }) => boolean,
  action?: (payload: ActionPayload<T>) => Action<T, unknown, any>,
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
  setTypes: <T extends MachineTypes<Trsn>> (types: T) => StateMachineBuilder<Trsn, T>;
  addEffect: <From extends AddEffectParamFrom<Trsn>> (from: From, to: AddEffectParamTo<Trsn, NoInfer<From>>, effect: MachineEffect<Types>) => StateMachineBuilder<Trsn, Types>;
  addHook: (hookSettings: unknown, hook: unknown) => StateMachineBuilder<Trsn, Types>;
  getStateMachine(): StateMachine<Trsn, Types>;
  run: (input:
    { context: Types['context'] }
    & (keyof Types['actors'] extends never ? {} : { actors: Types['actors'] })
  ) => MachineRuntime<Trsn, Types>
};

const makeStateMachineBuilder = <Trsn extends AnyTrsn, Types extends MachineTypes<AnyTrsn>>(stateMachine: StateMachine<Trsn, Types>): StateMachineBuilder<Trsn, Types> => {
  const builder: StateMachineBuilder<Trsn, Types> = {
    addEffect: (from, to, effect) => {
      return makeStateMachineBuilder({
        ...stateMachine,
        $effects: stateMachine.$effects.concat({ from, to, effect }),
      });
    },
    addHook: () => {
      throw new Error('@todo');
    },
    setTypes: types => {
      return makeStateMachineBuilder({
        ...stateMachine,
        $types: types as any,
      }) as any;
    },
    getStateMachine: () => {
      return stateMachine;
    },
    run: input => {
      return new MachineRuntime(stateMachine, input.context, stateMachine.$config.initial, 'actors' in input ? input.actors : {});
    },
  };

  return builder;
};

export const StateMachine = {
  create: <const T extends AnyTrsnObject> (
    params: {
      transitions: T[],
      config: MachineConfig<TrsnObjectToTrsn<T>>,
    },
  ): StateMachineBuilder<TrsnObjectToTrsn<T>, { actors: {}, commands: {}, context: {} }> => {
    return makeStateMachineBuilder({
      $config: params.config,
      $effects: [],
      $transitions: params.transitions.map(t => Transition.fromObject(t)),
      $types: {
        actors: {},
        commands: {},
        context: {},
      },
    });
  },
};

export type AnyMachineTypes = MachineTypes<AnyTrsn>;
export type AnyStateMachine = StateMachine<AnyTrsn, MachineTypes<AnyTrsn>>;