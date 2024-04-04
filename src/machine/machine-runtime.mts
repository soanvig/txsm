import { findMap } from '../helpers/array.mjs';
import { asyncFeedbackIterate } from '../helpers/iterator.mjs';
import { Context } from './context.mjs';
import { Effect } from './effect.mjs';
import { ErrorCode, MachineError } from './errors.mjs';
import { Hook } from './hook.mjs';
import { ActionType, RuntimeStatus, type ActionResult, type ActionStepPayload, type AnyTrsn, type MachineTypes, type StateMachine, type StateMachineCommands, type StateMachineContext, type StateMachineState, type TrsnWithEffect } from './types.mjs';

export class MachineRuntime<Trsn extends AnyTrsn, Types extends MachineTypes<AnyTrsn>> {
  protected stateMachine: StateMachine<Trsn, Types>;
  protected context: Context<StateMachineContext<Types>>;
  protected state: StateMachineState<Trsn>;
  protected status: RuntimeStatus;
  protected effects: Effect<Types>[];
  protected actors: Types['actors'];
  protected hooks: Hook<Types>[];

  constructor (
    stateMachine: StateMachine<Trsn, Types>,
    context: StateMachineContext<Types>,
    state: StateMachineState<Trsn>,
    actors: Types['actors'],
  ) {
    this.status = RuntimeStatus.Stopped;
    this.stateMachine = stateMachine;
    this.state = state;
    this.actors = actors;
    this.context = Context.create(context);
    this.effects = stateMachine.$effects.map(Effect.fromObject);
    this.hooks = stateMachine.$hooks.map(Hook.fromObject);
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

    this.status = RuntimeStatus.Running;

    await this.runAutomatedTransitions();

    this.status = this.determineStatus();
  }

  public async execute (command: StateMachineCommands<Types>): Promise<void> {
    if (this.status !== RuntimeStatus.Pending) {
      throw new MachineError(ErrorCode.NotPending, { currentStatus: this.status });
    }

    const transitions = this.stateMachine.$transitions.filter(t => t.is(command.type));
    const transitionWithEffect = findMap(transitions, t => this.matchTransitionWithEffect(t));

    if (!transitionWithEffect) {
      throw new MachineError(ErrorCode.NoTransition, {});
    }

    if (!transitionWithEffect.transition.canTransitionFrom(this.state)) {
      throw new MachineError(ErrorCode.TransitionIncorrectState, { currentState: this.state });
    }

    this.status = RuntimeStatus.Running;

    await this.executeTransition(transitionWithEffect);
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

  protected* getAutomatedTransition (): Generator<TrsnWithEffect<Types>> {
    while (true) {
      const transition = findMap(this.stateMachine.$transitions, t =>
        t.canTransitionFrom(this.state) && !t.isManual() && this.matchTransitionWithEffect(t),
      );

      if (transition) {
        yield transition;
      } else {
        return;
      }
    }
  }

  protected async executeTransition ({ effect, transition }: TrsnWithEffect<Types>): Promise<void> {
    const target = transition.getTarget(this.state) as StateMachineState<Trsn>;

    await asyncFeedbackIterate(effect.execute({ context: this.context, result: undefined }), async result => {
      return await this.processActionResult(result);
    });

    await this.changeState(target);
  }

  protected async changeState (state: StateMachineState<Trsn>): Promise<void> {
    const exitHooks = this.hooks.filter(h => h.exitMatches(this.state));
    for (const hook of exitHooks) {
      await asyncFeedbackIterate(hook.execute({ context: this.context, result: undefined }), async result => {
        return await this.processActionResult(result);
      });
    }

    this.state = state;

    const enterHooks = this.hooks.filter(h => h.enterMatches(state));
    for (const hook of enterHooks) {
      await asyncFeedbackIterate(hook.execute({ context: this.context, result: undefined }), async result => {
        return await this.processActionResult(result);
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
  protected matchTransitionWithEffect (transition: AnyTrsn): TrsnWithEffect<Types> | null {
    const effect = this.effects.find(e => e.matches(transition));

    if (!effect) {
      return { transition, effect: Effect.emptyFor(transition) };
    }

    if (!effect.testGuard({ context: this.context })) {
      return null;
    }

    return { transition, effect };
  }

  protected async processActionResult (actionResult: ActionResult<Types>): Promise<ActionStepPayload<Types, any>> {
    switch (actionResult.type) {
      case ActionType.Call:
        return {
          result: await actionResult.result,
          context: this.context.value,
        };
      case ActionType.Assign:
        this.context = this.context.merge(actionResult.newContext);
        return {
          result: undefined,
          context: this.context.value,
        };
      case ActionType.Invoke:
        /** @TODO throw if actor doesn't exist (no typescript) */
        const actor = this.actors[actionResult.actorName];

        return {
          result: await actor(...actionResult.parameters),
          context: this.context.value,
        };
      default:
        const _: never = actionResult;
        throw new Error(`Unreachable (actionResult.type=${_})`);
    }
  }
}