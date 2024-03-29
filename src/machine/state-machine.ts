import { type AnyTrsnObject } from './configuration-types';
import { type ContextValue } from './context';
import { MachineRuntime } from './machine-runtime';
import { Transition, type AnyTrsn, type TrsnCommands, type TrsnObjectToTrsn, type TrsnStates } from './transition';

type MachineConfig<T extends AnyTrsn> = {
  initial: Exclude<TrsnStates<T>, typeof Transition.ANY_STATE>,
  final: Exclude<TrsnStates<T>, typeof Transition.ANY_STATE>[],
}

type CommandPayload = Record<string, any>;
type Actor = {};

type MachineTypes<Trsns extends AnyTrsn> = {
  context: ContextValue;
  commands: Record<TrsnCommands<Trsns>, CommandPayload>;
  actors: Record<string, Actor>;
}

export class StateMachine<Trsn extends AnyTrsn, Types extends MachineTypes<any>> {
  private constructor (
    public $config: MachineConfig<Trsn>,
    public $transitions: Trsn[],
    public $types: Types,
  ) {}

  public setTypes<T extends MachineTypes<Trsn>> (types: T): StateMachine<Trsn, T> {
    return new StateMachine(
      this.$config,
      this.$transitions,
      types,
    );
  }

  /** @todo */
  public addEffect (from: unknown, to: unknown, effect: unknown): StateMachine<Trsn, Types> {
    throw new Error('TODO');
  }

  /** @todo */
  public addHook (hookSettings: unknown, hook: unknown): StateMachine<Trsn, Types> {
    throw new Error('TODO');
  }

  public run (
    input: { context: Types['context'] },
  ): MachineRuntime<this> {
    return new MachineRuntime(
      this,
      input.context,
      this.$config.initial,
    );
  }

  public static create<const T extends AnyTrsnObject> (
    params: {
      transitions: T[],
      config: MachineConfig<TrsnObjectToTrsn<T>>,
    },
  ) {
    return new StateMachine(
      params.config,
      params.transitions.map(t => Transition.fromObject(t)),
      { context: {}, commands: {}, actors: {} },
    );
  }
}

export type AnyStateMachine = StateMachine<AnyTrsn, MachineTypes<AnyTrsn>>;