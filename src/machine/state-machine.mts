import { Effect } from './effect.mjs';
import { MachineRuntime } from './machine-runtime.mjs';
import { Transition } from './transition.mjs';
import type { AnyTrsn, AnyTrsnObject, CommandPayload, MachineConfig, MachineEffect, MachineEffectCondition, MachineTypes, StateMachine, StateMachineBuilder, TrsnObjectToTrsn } from './types.mjs';

const makeStateMachineBuilder = <Trsn extends AnyTrsn, Types extends MachineTypes<AnyTrsn>>(stateMachine: StateMachine<Trsn, Types>): StateMachineBuilder<Trsn, Types> => {
  const builder: StateMachineBuilder<Trsn, Types> = {
    // Ignore that effect has MachineEffect<never> type. It is the only type compatible. The signature takes care of overloading
    addEffect: (condition: MachineEffectCondition, effect: MachineEffect<any, never>) => {
      const newStateMachine = {
        ...stateMachine,
        $effects: stateMachine.$effects.concat(
          Effect.fromObject({ condition, effect: effect as MachineEffect<Types, CommandPayload | null> }),
        ),
      };

      return makeStateMachineBuilder(newStateMachine);
    },
    setTypes: types => {
      const newStateMachine = {
        ...stateMachine,
        $types: types as any,
      };

      return makeStateMachineBuilder(newStateMachine);
    },
    getStateMachine: () => {
      return stateMachine;
    },
    run: input => {
      return MachineRuntime.create(stateMachine, input.context ?? {}, stateMachine.$config.initial, input.actors ?? {});
    },
    restoreRuntime: input => {
      return MachineRuntime.restore(stateMachine, input.snapshot, 'actors' in input ? input.actors : {});
    },
  };

  return builder;
};

export const Txsm = {
  /**
   * Create new state machine definition.
   */
  create: <const T extends AnyTrsnObject> (
    params: {
      /** List of transitions that describes available states and commands */
      transitions: T[],
      /** Machine's configuration (initial state, final states) */
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
