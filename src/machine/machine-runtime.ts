import { type ArrayValue } from '../helpers/types';
import { Context } from './context';
import { type AnyStateMachine } from './state-machine';
import { type AnyTrsn, type TrsnStates } from './transition';

type StateMachineContext<SM extends AnyStateMachine> = SM['$types']['context'];
type StateMachineState<SM extends AnyStateMachine> = TrsnStates<ArrayValue<SM['$transitions']>>;
type StateMachineCommands<SM extends AnyStateMachine> = SM['$types']['commands'] extends infer Cmds
  ? { [K in keyof Cmds]: { type: K } & Cmds[K] }[keyof Cmds]
  : never;

export enum RuntimeStatus {
  Stopped = 'stopped',
  Pending = 'pending',
  Running = 'running',
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

  public async start (): Promise<void> {
    if (this.state !== RuntimeStatus.Stopped) {
      throw new Error('@todo');
    }

    this.status = RuntimeStatus.Running;

    for (const transition of this.getAutomatedTransition()) {
      await this.executeTransition(transition);
    }

    this.status = RuntimeStatus.Pending;
  }

  public async execute (command: StateMachineCommands<SM>): Promise<void> {
    if (this.status !== RuntimeStatus.Pending) {
      throw new Error('@todo');
    }

    const transition = this.stateMachine.$transitions.find(t => t.is(this.state));

    if (!transition) {
      throw new Error('@todo');
    }

    if (!transition.canTransitionFrom(this.state)) {
      throw new Error('@todo');
    }

    await this.executeTransition(transition);
  }

  protected* getAutomatedTransition (): Generator<AnyTrsn> {
    while (true) {
      const transition = this.stateMachine.$transitions.find(t => t.canTransitionFrom(this.state) && t.isAutomated());

      if (transition) {
        yield transition;
      } else {
        return;
      }
    }
  }

  protected async executeTransition (transition: AnyTrsn): Promise<void> {
    const target = transition.getTarget() as StateMachineState<SM>;

    this.status = RuntimeStatus.Running;

    /** @todo Handle effects */

    await this.changeState(target);

    this.status = RuntimeStatus.Pending;
  }

  protected async changeState (state: StateMachineState<SM>): Promise<void> {
    /** @todo Handle hooks */
    this.state = state;
  }
}