import { Context } from './context.mjs';
import { type AnyMachineTypes, type MachineTypes, type StateMachine } from './state-machine.mjs';
import { type AnyTrsn, type Transition, type TrsnStates } from './transition.mjs';

type StateMachineContext<T extends AnyMachineTypes> = T['context'];
type StateMachineState<T extends AnyTrsn> = Exclude<TrsnStates<T>, typeof Transition.ANY_STATE>;
type StateMachineCommands<T extends AnyMachineTypes> =
  keyof T['commands'] extends infer Keys extends string
    ? { [K in Keys]: { type: K } & T['commands'][K] }[Keys]
    : never;

export enum RuntimeStatus {
  Stopped = 'stopped',
  Pending = 'pending',
  Running = 'running',
  Done = 'done',
}

export class MachineRuntime<Trsn extends AnyTrsn, Types extends MachineTypes<AnyTrsn>> {
  protected stateMachine: StateMachine<Trsn, Types>;
  protected context: Context<StateMachineContext<Types>>;
  protected state: StateMachineState<Trsn>;
  protected status: RuntimeStatus;

  constructor (
    stateMachine: StateMachine<Trsn, Types>,
    context: StateMachineContext<Types>,
    state: StateMachineState<Trsn>,
  ) {
    this.stateMachine = stateMachine;
    this.context = Context.create(context);
    this.state = state;
    this.status = RuntimeStatus.Stopped;
  }

  public getState (): StateMachineState<Trsn> {
    return this.state;
  }

  public getStatus (): RuntimeStatus {
    return this.status;
  }

  public async start (): Promise<void> {
    if (this.status !== RuntimeStatus.Stopped) {
      throw new Error('@todo');
    }

    this.status = RuntimeStatus.Running;

    await this.runAutomatedTransitions();

    this.status = this.determineStatus();
  }

  public async execute (command: StateMachineCommands<Types>): Promise<void> {
    if (this.status !== RuntimeStatus.Pending) {
      throw new Error('@todo');
    }

    const transition = this.stateMachine.$transitions.find(t => t.is(command.type));

    if (!transition) {
      throw new Error('@todo');
    }

    if (!transition.canTransitionFrom(this.state)) {
      throw new Error('@todo');
    }

    this.status = RuntimeStatus.Running;

    await this.executeTransition(transition);
    await this.runAutomatedTransitions();

    this.status = this.determineStatus();
  }

  protected async runAutomatedTransitions (): Promise<void> {
    for (const transition of this.getAutomatedTransition()) {
      if (this.determineStatus() !== RuntimeStatus.Pending) {
        return;
      }

      await this.executeTransition(transition);
    }
  }

  protected* getAutomatedTransition (): Generator<AnyTrsn> {
    while (true) {
      const transition = this.stateMachine.$transitions.find(t => t.canTransitionFrom(this.state) && !t.isManual());

      if (transition) {
        yield transition;
      } else {
        return;
      }
    }
  }

  protected async executeTransition (transition: AnyTrsn): Promise<void> {
    const target = transition.getTarget(this.state) as StateMachineState<Trsn>;

    /** @todo Handle effects */

    await this.changeState(target);
  }

  protected async changeState (state: StateMachineState<Trsn>): Promise<void> {
    /** @todo Handle hooks */
    this.state = state;
  }

  protected determineStatus (): RuntimeStatus {
    if (this.stateMachine.$config.final.includes(this.state)) {
      return RuntimeStatus.Done;
    }

    return RuntimeStatus.Pending;
  }
}