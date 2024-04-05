import { MachineRuntime } from './machine-runtime.mjs';
import { Transition } from './transition.mjs';
import { type AnyTrsn, type AnyTrsnObject, type MachineConfig, type MachineTypes, type StateMachine, type StateMachineBuilder, type TrsnObjectToTrsn } from './types.mjs';

const makeStateMachineBuilder = <Trsn extends AnyTrsn, Types extends MachineTypes<AnyTrsn>>(stateMachine: StateMachine<Trsn, Types>): StateMachineBuilder<Trsn, Types> => {
  const builder: StateMachineBuilder<Trsn, Types> = {
    addEffect: (from, to, effect) => {
      return makeStateMachineBuilder({
        ...stateMachine,
        $effects: stateMachine.$effects.concat({ from, to, effect }),
      });
    },
    addHook: (hookSettings, hook) => {
      return makeStateMachineBuilder({
        ...stateMachine,
        $hooks: stateMachine.$hooks.concat({ ...hookSettings, hook }),
      });
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
      return MachineRuntime.create(stateMachine, input.context, stateMachine.$config.initial, 'actors' in input ? input.actors : {});
    },
    restoreRuntime: input => {
      return MachineRuntime.restore(stateMachine, input.snapshot, 'actors' in input ? input.actors : {});
    },
  };

  return builder;
};

export const Txsm = {
  create: <const T extends AnyTrsnObject> (
    params: {
      transitions: T[],
      config: MachineConfig<TrsnObjectToTrsn<T>>,
    },
  ): StateMachineBuilder<TrsnObjectToTrsn<T>, { actors: {}, commands: {}, context: {} }> => {
    return makeStateMachineBuilder({
      $config: params.config,
      $effects: [],
      $hooks: [],
      $transitions: params.transitions.map(t => Transition.fromObject(t)),
      $types: {
        actors: {},
        commands: {},
        context: {},
      },
    });
  },
};
