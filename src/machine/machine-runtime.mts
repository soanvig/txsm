import { type ArrayValue } from '../helpers/types.mjs';
import { Context } from './context.mjs';
import { type AnyStateMachine } from './state-machine.mjs';
import { type AnyTrsn, type TrsnStates } from './transition.mjs';

type StateMachineContext<SM extends AnyStateMachine> = SM['$types']['context'];
type StateMachineState<SM extends AnyStateMachine> = TrsnStates<ArrayValue<SM['$transitions']>>;
type StateMachineCommands<SM extends AnyStateMachine> =
  keyof SM['$types']['commands'] extends infer Keys extends string
    ? { [K in Keys]: { type: K } & SM['$types']['commands'][K] }[Keys]
    : never;

export enum RuntimeStatus {
  Stopped = 'stopped',
  Pending = 'pending',
  Running = 'running',
  Done = 'done',
}

export class MachineRuntime<SM extends AnyStateMachine> {
  protected stateMachine: SM;
  protected context: Context<StateMachineContext<SM>>;
  protected state: StateMachineState<SM>;
  protected status: RuntimeStatus;

  constructor (
    stateMachine: SM,
    context: StateMachineContext<SM>,
    state: StateMachineState<SM>,
  ) {
    this.stateMachine = stateMachine;
    this.context = Context.create(context);
    this.state = state;
    this.status = RuntimeStatus.Stopped;
  }

  public getState (): StateMachineState<SM> {
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

  public async execute (command: StateMachineCommands<SM>): Promise<void> {
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
    const target = transition.getTarget(this.state) as StateMachineState<SM>;

    /** @todo Handle effects */

    await this.changeState(target);
  }

  protected async changeState (state: StateMachineState<SM>): Promise<void> {
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