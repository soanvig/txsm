import { findMap } from '../helpers/array.mjs';
import { asyncFeedbackIterate, first } from '../helpers/iterator.mjs';
import { Context } from './context.mjs';
import { Effect } from './effect.mjs';
import { ErrorCode, MachineError } from './errors.mjs';
import { History, type HistoryEntry } from './history.mjs';
import { Hook } from './hook.mjs';
import { ActionType, RuntimeStatus, type ActionResult, type ActionStepPayload, type AnyTrsn, type Command, type MachineTypes, type Snapshot, type StateMachine, type StateMachineCommands, type StateMachineContext, type StateMachineState, type TransitionPlan } from './types.mjs';

export class MachineRuntime<Trsn extends AnyTrsn, Types extends MachineTypes<AnyTrsn>> {
  protected stateMachine: StateMachine<Trsn, Types>;
  protected context: Context<StateMachineContext<Types>>;
  protected state: StateMachineState<Trsn>;
  protected status: RuntimeStatus;
  protected effects: Effect<Types>[];
  protected actors: Types['actors'];
  protected hooks: Hook<Types>[];
  protected history: History;

  protected constructor (
    payload: {
      stateMachine: StateMachine<Trsn, Types>;
      context: Context<StateMachineContext<Types>>;
      state: StateMachineState<Trsn>;
      status: RuntimeStatus;
      effects: Effect<Types>[];
      actors: Types['actors'];
      hooks: Hook<Types>[];
      history: History;
    },
  ) {
    this.status = payload.status;
    this.stateMachine = payload.stateMachine;
    this.state = payload.state;
    this.actors = payload.actors;
    this.context = payload.context;
    this.effects = payload.effects;
    this.hooks = payload.hooks;
    this.history = payload.history;
  }

  public static create<Trsn extends AnyTrsn, Types extends MachineTypes<AnyTrsn>> (
    stateMachine: StateMachine<Trsn, Types>,
    context: StateMachineContext<Types>,
    state: StateMachineState<Trsn>,
    actors: Types['actors'],
  ) {
    return new MachineRuntime({
      status: RuntimeStatus.Stopped,
      stateMachine,
      state,
      actors,
      context: Context.create(context),
      effects: stateMachine.$effects.map(Effect.fromObject),
      hooks: stateMachine.$hooks.map(Hook.fromObject),
      history: History.create().saveState(state),
    });
  }

  public static restore<Trsn extends AnyTrsn, Types extends MachineTypes<AnyTrsn>> (
    stateMachine: StateMachine<Trsn, Types>,
    snapshot: Snapshot,
    actors: Types['actors'],
  ) {
    /** Add state and status validation */
    if (!stateMachine.$transitions.some(t => t.getTransition().from === snapshot.state || t.getTransition().to === snapshot.state)) {
      throw new MachineError(ErrorCode.SnapshotStateInvalid, { state: snapshot.state });
    }

    if (!Object.values(RuntimeStatus).includes(snapshot.status)) {
      throw new MachineError(ErrorCode.SnapshotStatusInvalid, { status: snapshot.status });
    }

    return new MachineRuntime({
      status: snapshot.status,
      stateMachine,
      state: snapshot.state as any,
      actors,
      context: Context.create(snapshot.context),
      effects: stateMachine.$effects.map(Effect.fromObject),
      hooks: stateMachine.$hooks.map(Hook.fromObject),
      history: History.restore(snapshot.history),
    });
  }

  public getSnapshot (): Snapshot<Trsn, Types> {
    if (this.status === RuntimeStatus.Running) {
      throw new MachineError(ErrorCode.IsRunning, {});
    }

    return {
      context: this.context.getSnapshot(),
      state: this.state,
      status: this.status,
      history: this.history.getSnapshot(),
    };
  }

  public getState (): StateMachineState<Trsn> {
    return this.state;
  }

  public getContext (): Types['context'] {
    return this.context.value;
  }

  public getStatus (): RuntimeStatus {
    return this.status;
  }

  public getHistory (): HistoryEntry[] {
    return this.history.getSnapshot().entries;
  }

  public async start (): Promise<void> {
    if (this.status !== RuntimeStatus.Stopped) {
      throw new MachineError(ErrorCode.NotStopped, { currentStatus: this.status });
    }

    await this.withTransaction(async () => {
      this.status = RuntimeStatus.Running;

      for await (const transition of this.transitionPlanner({ command: null })) {
        await this.executeTransition(transition);
        this.status = this.isFinal() ? RuntimeStatus.Done : RuntimeStatus.Running;
      }

      this.status = this.isFinal() ? RuntimeStatus.Done : RuntimeStatus.Pending;
    });
  }

  public getAcceptableCommands (): Command[] {
    return this.stateMachine.$transitions.filter(t => t.isManual())
      .map(t => ({ type: t.getTransition().name as string }))
      .filter(c => this.canAcceptCommand(c));
  }

  public canAcceptCommand (command: { type: keyof Types['commands'] }): boolean {
    if (this.status !== RuntimeStatus.Pending) {
      return false;
    }

    const transitions = this.stateMachine.$transitions.filter(t => t.is(command.type as string));

    return transitions.some(t => t.canTransitionFrom(this.state));
  }

  public async canExecuteCommand (command: StateMachineCommands<Types>): Promise<boolean> {
    if (this.status !== RuntimeStatus.Pending) {
      return false;
    }

    const transition = await first(this.transitionPlanner({ command }));

    return Boolean(transition);
  }

  public async execute (command: StateMachineCommands<Types>): Promise<void> {
    if (this.status !== RuntimeStatus.Pending) {
      throw new MachineError(ErrorCode.NotPending, { currentStatus: this.status });
    }

    await this.withTransaction(async () => {
      this.status = RuntimeStatus.Running;
      this.history.saveCommand(command);

      for await (const transition of this.transitionPlanner({ command, atLeastOne: true })) {
        await this.executeTransition(transition);
        this.status = this.isFinal() ? RuntimeStatus.Done : RuntimeStatus.Running;
      }

      this.status = this.isFinal() ? RuntimeStatus.Done : RuntimeStatus.Pending;
    });
  }

  protected async executeTransition ({ effect, transition, command }: TransitionPlan<Types>): Promise<void> {
    const target = transition.getTarget(this.state) as StateMachineState<Trsn>;

    await asyncFeedbackIterate(effect.execute({ context: this.context.value, result: undefined, command }), async result => {
      return await this.processActionResult(result, command);
    });

    await this.changeState(target);
  }

  protected async changeState (state: StateMachineState<Trsn>): Promise<void> {
    const command = null;

    const exitHooks = this.hooks.filter(h => h.exitMatches(this.state));
    for (const hook of exitHooks) {
      await asyncFeedbackIterate(hook.execute({ context: this.context.getReadonly(), result: undefined, command }), async result => {
        return await this.processActionResult(result, command);
      });
    }

    this.state = state;
    this.history.saveState(state);

    const enterHooks = this.hooks.filter(h => h.enterMatches(state));
    for (const hook of enterHooks) {
      await asyncFeedbackIterate(hook.execute({ context: this.context.getReadonly(), result: undefined, command }), async result => {
        return await this.processActionResult(result, command);
      });
    }
  }

  protected isFinal (): boolean {
    return this.stateMachine.$config.final.includes(this.state);
  }

  protected async* transitionPlanner (
    payload: { command: StateMachineCommands<Types> | null, atLeastOne?: boolean },
  ): AsyncGenerator<TransitionPlan<Types>, void, void> {
    let command = payload.command;
    let atLeastOne = payload.atLeastOne ?? false;

    while (true) {
      if (this.status === RuntimeStatus.Done) {
        return;
      }

      const applicableTransitions = this.stateMachine.$transitions
        .filter(t => {
          const matches = command ? t.is(command.type) : !t.isManual();
          const canTransition = t.canTransitionFrom(this.state);

          return matches && canTransition;
        });

      const transition = findMap(applicableTransitions, (t): TransitionPlan<Types> | null => {
        const effect = this.effects.find(e => e.matches(t));

        if (!effect) {
          return { transition: t, effect: Effect.emptyFor(t), command };
        }

        if (!effect.testGuard({ context: this.context.getReadonly(), command: command ?? {} })) {
          return null;
        }

        return { transition: t, effect, command };
      });

      if (!transition) {
        if (atLeastOne) {
          throw new MachineError(ErrorCode.NoTransition, {});
        } else {
          return;
        }
      }

      yield transition;

      // Command is resetted after first pass
      command = null;
      atLeastOne = false;
    }
  }

  protected async processActionResult (actionResult: ActionResult<Types>, command: StateMachineCommands<Types> | null): Promise<ActionStepPayload<Types, any>> {
    switch (actionResult.type) {
      case ActionType.Call:
        return {
          result: await actionResult.result,
          context: this.context.getReadonly(),
          command,
        };
      case ActionType.Assign:
        this.context = this.context.merge(actionResult.newContext);
        return {
          result: undefined,
          context: this.context.getReadonly(),
          command,
        };
      case ActionType.Invoke:
        /** @TODO throw if actor doesn't exist (no typescript) */
        const actor = this.actors[actionResult.actorName];

        return {
          result: await actor(...actionResult.parameters),
          context: this.context.getReadonly(),
          command,
        };
      default:
        const _: never = actionResult;
        throw new Error(`Unreachable (actionResult.type=${_})`);
    }
  }

  protected async withTransaction<T> (cb: () => Promise<T>): Promise<T> {
    const snapshot = this.getSnapshot();

    try {
      return await cb();
    } catch (e) {
      this.state = snapshot.state;
      this.context = Context.create(snapshot.context),
      this.status = snapshot.status;
      this.history = History.restore(snapshot.history);

      throw e;
    }
  }
}