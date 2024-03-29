import { type AnyTrsnObject } from './configuration-types.mjs';
import { type ContextValue } from './context.mjs';
import { MachineRuntime } from './machine-runtime.mjs';
import { Transition, type AnyTrsn, type TrsnCommands, type TrsnObjectToTrsn, type TrsnStates } from './transition.mjs';

export type MachineConfig<T extends AnyTrsn> = {
  initial: Exclude<TrsnStates<T>, typeof Transition.ANY_STATE>,
  final: Exclude<TrsnStates<T>, typeof Transition.ANY_STATE>[],
}

export type CommandPayload = Record<string, any>;
export type Actor = {};
export type Effect<T extends MachineTypes<AnyTrsn>> = {
  guard: (p: { context: T['context'] }) => boolean,
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
  $effects: { from: string, to: string, effect: Effect<Types> }[],

  setTypes: <T extends MachineTypes<Trsn>> (types: T) => StateMachine<Trsn, T>;
  addEffect: <From extends AddEffectParamFrom<Trsn>> (from: From, to: AddEffectParamTo<Trsn, NoInfer<From>>, effect: Effect<Types>) => StateMachine<Trsn, Types>
  addHook: (hookSettings: unknown, hook: unknown) => StateMachine<Trsn, Types>
  run: (input: { context: Types['context'] }) => MachineRuntime<Trsn, Types>
}

export const StateMachine = {
  create: <const T extends AnyTrsnObject> (
    params: {
      transitions: T[],
      config: MachineConfig<TrsnObjectToTrsn<T>>,
    },
  ): StateMachine<TrsnObjectToTrsn<T>, { actors: {}, commands: {}, context: {} }> => {
    const builder: StateMachine<TrsnObjectToTrsn<T>, { actors: {}, commands: {}, context: {} }> = {
      $config: params.config,
      $transitions: params.transitions.map(t => Transition.fromObject(t)),
      $effects: [],
      $types: { actors: {}, commands: {}, context: {} },
      addEffect: (from, to, effect) => {
        return {
          ...builder,
          $effects: builder.$effects.concat({ from, to, effect }),
        };
      },
      addHook: () => {
        throw new Error('@todo');
      },
      setTypes: types => {
        return {
          ...builder,
          $types: types,
        } as any;
      },
      run: input => {
        return new MachineRuntime(builder, input.context, builder.$config.initial);
      },
    };

    return builder;
  },
};

export type AnyMachineTypes = MachineTypes<AnyTrsn>;
export type AnyStateMachine = StateMachine<AnyTrsn, MachineTypes<AnyTrsn>>;