import { Effect } from './effect.mjs';
import { ErrorCode, MachineError } from './errors.mjs';
import { MachineRuntime } from './machine-runtime.mjs';
import { Transition } from './transition.mjs';
import { type AnyTrsn, type AnyTrsnObject, type CommandPayload, type EffectCondition, type MachineConfig, type MachineEffect, type MachineTypes, type StateMachine, type StateMachineBuilder, type TrsnObjectToTrsn } from './types.mjs';

const makeStateMachineBuilder = <Trsn extends AnyTrsn, Types extends MachineTypes<AnyTrsn>>(stateMachine: StateMachine<Trsn, Types>): StateMachineBuilder<Trsn, Types> => {
  const builder: StateMachineBuilder<Trsn, Types> = {
    addEffect: (condition: EffectCondition, effect: MachineEffect<any, never>) => {
      if ('from' in condition) {
        const existingEffect = stateMachine.$effects.some(e => {
          if (Effect.isTrsnCondition(e.condition)) {
            return e.condition.from === condition.from && e.condition.to === condition.to;
          }
        });

        if (existingEffect) {
          throw new MachineError(ErrorCode.DuplicatedEffect, condition);
        }
      }

      return makeStateMachineBuilder({
        ...stateMachine,
        $effects: stateMachine.$effects.concat({ condition, effect: effect as MachineEffect<Types, CommandPayload | null> }),
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
      return MachineRuntime.create(stateMachine, input.context ?? {}, stateMachine.$config.initial, input.actors ?? {});
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
      $transitions: params.transitions.map(t => Transition.fromObject(t)),
      $types: {
        actors: {},
        commands: {},
        context: {},
      },
    });
  },
};
