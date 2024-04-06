import { findMap } from '../helpers/array.mjs';
import deepClone from '../helpers/deepClone.mjs';
import { asyncFeedbackIterate } from '../helpers/iterator.mjs';
import { Context } from './context.mjs';
import { Effect } from './effect.mjs';
import { ErrorCode, MachineError } from './errors.mjs';
import { History } from './history.mjs';
import { Hook } from './hook.mjs';
import { ActionType, RuntimeStatus, type ActionResult, type ActionStepPayload, type AnyTrsn, type CommandPayload, type MachineTypes, type Snapshot, type StateMachine, type StateMachineCommands, type StateMachineContext, type StateMachineState, type TrsnWithEffect } from './types.mjs';

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
      context: deepClone(this.context.value),
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

  public async start (): Promise<void> {
    if (this.status !== RuntimeStatus.Stopped) {
      throw new MachineError(ErrorCode.NotStopped, { currentStatus: this.status });
    }

    await this.withTransaction(async () => {
      this.status = RuntimeStatus.Running;

      await this.runAutomatedTransitions();

      this.status = this.determineStatus();
    });
  }

  public canAcceptCommand (command: { type: keyof Types['commands'] }): boolean {
    if (this.status !== RuntimeStatus.Pending) {
      return false;
    }

    const transitions = this.stateMachine.$transitions.filter(t => t.is(command.type as string));

    return transitions.some(t => t.canTransitionFrom(this.state));
  }

  public canExecuteCommand (command: StateMachineCommands<Types>): boolean {
    if (this.status !== RuntimeStatus.Pending) {
      return false;
    }

    const transitions = this.stateMachine.$transitions.filter(t => t.is(command.type));
    const transitionWithEffect = findMap(transitions, t => this.matchTransitionWithEffect(t, command));

    return Boolean(transitionWithEffect && transitionWithEffect.transition.canTransitionFrom(this.state));
  }

  public async execute (command: StateMachineCommands<Types>): Promise<void> {
    if (this.status !== RuntimeStatus.Pending) {
      throw new MachineError(ErrorCode.NotPending, { currentStatus: this.status });
    }

    const transitions = this.stateMachine.$transitions.filter(t => t.is(command.type));
    const transitionWithEffect = findMap(transitions, t => this.matchTransitionWithEffect(t, command));

    if (!transitionWithEffect) {
      throw new MachineError(ErrorCode.NoTransition, {});
    }

    if (!transitionWithEffect.transition.canTransitionFrom(this.state)) {
      throw new MachineError(ErrorCode.TransitionIncorrectState, { currentState: this.state });
    }

    await this.withTransaction(async () => {
      this.history.saveCommand(command);

      this.status = RuntimeStatus.Running;

      await this.executeTransition(transitionWithEffect, command);
      await this.runAutomatedTransitions();

      this.status = this.determineStatus();
    });
  }

  protected async runAutomatedTransitions (): Promise<void> {
    for (const transition of this.getAutomatedTransition()) {
      if (this.determineStatus() !== RuntimeStatus.Pending) {
        return;
      }

      await this.executeTransition(transition, {});
    }
  }

  protected* getAutomatedTransition (): Generator<TrsnWithEffect<Types>> {
    while (true) {
      const transition = findMap(this.stateMachine.$transitions, t =>
        t.canTransitionFrom(this.state) && !t.isManual() && this.matchTransitionWithEffect(t, {}),
      );

      if (transition) {
        yield transition;
      } else {
        return;
      }
    }
  }

  protected async executeTransition ({ effect, transition }: TrsnWithEffect<Types>, command: CommandPayload): Promise<void> {
    const target = transition.getTarget(this.state) as StateMachineState<Trsn>;

    await asyncFeedbackIterate(effect.execute({ context: this.context, result: undefined, command }), async result => {
      return await this.processActionResult(result, command);
    });

    await this.changeState(target);
  }

  protected async changeState (state: StateMachineState<Trsn>): Promise<void> {
    const command = {};
    const exitHooks = this.hooks.filter(h => h.exitMatches(this.state));
    for (const hook of exitHooks) {
      await asyncFeedbackIterate(hook.execute({ context: this.context, result: undefined, command }), async result => {
        return await this.processActionResult(result, command);
      });
    }

    this.state = state;
    this.history.saveState(state);

    const enterHooks = this.hooks.filter(h => h.enterMatches(state));
    for (const hook of enterHooks) {
      await asyncFeedbackIterate(hook.execute({ context: this.context, result: undefined, command }), async result => {
        return await this.processActionResult(result, command);
      });
    }
  }

  protected determineStatus (): RuntimeStatus {
    if (this.stateMachine.$config.final.includes(this.state)) {
      return RuntimeStatus.Done;
    }

    return RuntimeStatus.Pending;
  }

  /**
   * Find matching effect for a transition.
   * If there is no effect available, an empty effect is created.
   * If there is effect with a guard, the guard is tested, and if it fails, then the function fails as well.
   */
  protected matchTransitionWithEffect (transition: AnyTrsn, command: CommandPayload): TrsnWithEffect<Types> | null {
    const effect = this.effects.find(e => e.matches(transition));

    if (!effect) {
      return { transition, effect: Effect.emptyFor(transition) };
    }

    if (!effect.testGuard({ context: this.context, command })) {
      return null;
    }

    return { transition, effect };
  }

  protected async processActionResult (actionResult: ActionResult<Types>, command: CommandPayload): Promise<ActionStepPayload<Types, any>> {
    switch (actionResult.type) {
      case ActionType.Call:
        return {
          result: await actionResult.result,
          context: this.context.value,
          command,
        };
      case ActionType.Assign:
        this.context = this.context.merge(actionResult.newContext);
        return {
          result: undefined,
          context: this.context.value,
          command,
        };
      case ActionType.Invoke:
        /** @TODO throw if actor doesn't exist (no typescript) */
        const actor = this.actors[actionResult.actorName];

        return {
          result: await actor(...actionResult.parameters),
          context: this.context.value,
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