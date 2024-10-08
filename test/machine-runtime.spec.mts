import assert from 'node:assert';
import test, { describe } from 'node:test';
import { omit } from '../src/helpers/object.mjs';
import { Txsm } from '../src/machine/state-machine.mjs';
import { RuntimeStatus } from '../src/machine/types.mjs';
import { actorAssignMachine, anyExitAnyEntryEffectMachine, autoEndContinueMachine, autoEndMachine, canAcceptCommandMachine, canExecuteCommandMachine, commandPayloadActionMachine, commandPayloadGuardMachine, counterMachine, exitEntryEffectMachine, exitEntryGuardEffectMachine, guardedAutomatedTransitionMachine, guardedManualTransitionMachine, historyMachine, lightMachine, makeEffectCallbackMachine, mergeContextMachine, multipleGuardsAutomatedTransitionMachine, multipleGuardsManualTransitionMachine, rollbackFromActionMachine, rollbackFromGuardMachine, rollbackFromHookActorMachine, rollbackFromHookMachine, rollbackStartMachine, snapshotMachine } from './machines.mjs';

describe('MachineRuntime', () => {
  test('initialization', async () => {
    const runtime = Txsm.create({
      transitions: [{ from: 's1', to: 's2', with: 'start' }],
      config: { initial: 's1', final: [] },
    }).run({});

    assert.deepStrictEqual(runtime.getState(), 's1');
    assert.deepStrictEqual(runtime.getStatus(), RuntimeStatus.Stopped);

    await runtime.start();

    assert.deepStrictEqual(runtime.getStatus(), RuntimeStatus.Pending);
  });

  describe('transition', () => {
    test('allow to traverse transitions in a loop', async t => {
      const runtime = lightMachine.run({});

      await runtime.start();
      assert.deepStrictEqual(runtime.getState(), 'red');
      assert.deepStrictEqual(runtime.getStatus(), RuntimeStatus.Pending);

      await runtime.execute({ type: 'walk' });
      assert.deepStrictEqual(runtime.getState(), 'green');
      assert.deepStrictEqual(runtime.getStatus(), RuntimeStatus.Pending);

      await runtime.execute({ type: 'stop' });
      assert.deepStrictEqual(runtime.getState(), 'red');
      assert.deepStrictEqual(runtime.getStatus(), RuntimeStatus.Pending);
    });

    test('run automated transitions on start', async t => {
      const runtime = autoEndMachine.run({});

      assert.deepStrictEqual(runtime.getState(), 'start');
      assert.deepStrictEqual(runtime.getStatus(), RuntimeStatus.Stopped);

      await runtime.start();
      assert.deepStrictEqual(runtime.getState(), 'end');
      assert.deepStrictEqual(runtime.getStatus(), RuntimeStatus.Done);
    });

    test('stop automated transitions upon reaching final state', async t => {
      const runtime = autoEndContinueMachine.run({});

      assert.deepStrictEqual(runtime.getState(), 'start');
      assert.deepStrictEqual(runtime.getStatus(), RuntimeStatus.Stopped);

      await runtime.start();
      assert.deepStrictEqual(runtime.getState(), 'end');
      assert.deepStrictEqual(runtime.getStatus(), RuntimeStatus.Done);
    });
  });

  describe('Effect guard', () => {
    test('it should select transitions based on guard (manual)', async t => {
      const runtimeTrue = guardedManualTransitionMachine.run({ context: { value: true } });

      await runtimeTrue.start();
      await runtimeTrue.execute({ type: 'next' });
      assert.deepStrictEqual(runtimeTrue.getState(), 'valueTrue');

      const runtimeFalse = guardedManualTransitionMachine.run({ context: { value: false } });

      await runtimeFalse.start();
      await runtimeFalse.execute({ type: 'next' });
      assert.deepStrictEqual(runtimeFalse.getState(), 'valueFalse');
    });

    test('it should select transitions based on guard (automated)', async t => {
      const runtimeTrue = guardedAutomatedTransitionMachine.run({ context: { value: true } });

      await runtimeTrue.start();
      assert.deepStrictEqual(runtimeTrue.getState(), 'valueTrue');

      const runtimeFalse = guardedAutomatedTransitionMachine.run({ context: { value: false } });

      await runtimeFalse.start();
      assert.deepStrictEqual(runtimeFalse.getState(), 'valueFalse');
    });

    test('it should select transition based on one of multiple guards (manual)', async t => {
      for (const value of [1, 2, 3]) {
        const runtime = multipleGuardsManualTransitionMachine.run({ context: { value }});

        await runtime.start();
        await runtime.execute({ type: 'run' });

        assert.deepStrictEqual(runtime.getState(), `value${value}`);
      }

      const noTransitionRuntime = multipleGuardsManualTransitionMachine.run({ context: { value: 0 }});
      await noTransitionRuntime.start();
      await assert.rejects(noTransitionRuntime.execute({ type: 'run' }));
    });

    test('it should select transition based on one of multiple guards (automated)', async t => {
      for (const value of [1, 2, 3]) {
        const runtime = multipleGuardsAutomatedTransitionMachine.run({ context: { value }});

        await runtime.start();
        assert.deepStrictEqual(runtime.getState(), `value${value}`);
      }

      const noTransitionRuntime = multipleGuardsAutomatedTransitionMachine.run({ context: { value: 0 }});
      await noTransitionRuntime.start();
      assert.deepStrictEqual(noTransitionRuntime.getState(), 'start');
    });
  });

  describe('Effect action', () => {
    test('it call all defined actions', async t => {
      let counter = 0;
      const runtime = makeEffectCallbackMachine(() => { counter += 1; }).run({});

      await runtime.start();
      assert.deepStrictEqual(counter, 3);
      assert.deepStrictEqual(runtime.getState(), 'end');
    });

    test('it should assign values to context', async t => {
      const runtime = counterMachine.run({ context: { value: 1 } });

      await runtime.start();
      assert.deepStrictEqual(runtime.getContext().value, 1);

      await runtime.execute({ type: 'increment' });
      assert.deepStrictEqual(runtime.getContext().value, 2);

      await runtime.execute({ type: 'incrementTwice' });
      assert.deepStrictEqual(runtime.getContext().value, 4);

      await runtime.execute({ type: 'increment' });
      assert.deepStrictEqual(runtime.getContext().value, 5);
    });

    test('it should properly merge context', async t => {
      const runtime = mergeContextMachine.run({ context: { value0: true, value1: false, value2: [false], value3: { subValue1: true } } });

      await runtime.start();
      assert.deepStrictEqual(runtime.getContext(), {
        value0: true,
        value1: true,
        value2: [true],
        value3: { subValue2: true },
      });
    });

    test('it should call actor,  retrieve its result and assign to context', async t => {
      const runtime = actorAssignMachine.run({
        context: { value: 4 },
        actors: {
          call: value => value + 3,
        },
      });

      await runtime.start();
      assert.deepStrictEqual(runtime.getContext().value, 7);
    });

    test('it should call entry and exit effect', async () => {
      const runtime = exitEntryEffectMachine.run({ context: { entry: 0, exit: 0 }});

      await runtime.start();

      assert.deepStrictEqual(runtime.getContext(), { entry: 1, exit: 1 });
    });

    test('it should call entry and exit effect if defined as any (*)', async () => {
      const runtime = anyExitAnyEntryEffectMachine.run({ context: { entry: 0, exit: 0 }});

      await runtime.start();

      assert.deepStrictEqual(runtime.getContext(), { entry: 1, exit: 1 });
    });

    test('it should call entry and exit effect only if guard is met', async () => {
      const falseRuntime = exitEntryGuardEffectMachine.run({ context: { value: false, counter: 0 }});
      const trueRuntime = exitEntryGuardEffectMachine.run({ context: { value: true, counter: 0 }});

      await falseRuntime.start();
      await trueRuntime.start();

      assert.deepStrictEqual(falseRuntime.getContext().counter, 0);
      assert.deepStrictEqual(trueRuntime.getContext().counter, 2);
    });
  });

  describe('snapshots', () => {
    test('it should make snapshot and restore it', async () => {
      const runtimeBeforeSnapshot = snapshotMachine.run({ context: { value: 0 }});

      await runtimeBeforeSnapshot.start();
      await runtimeBeforeSnapshot.execute({ type: 'run' });

      assert.deepStrictEqual(runtimeBeforeSnapshot.getContext(), { value: 1 });
      assert.deepStrictEqual(runtimeBeforeSnapshot.getState(), 'intermediate');
      assert.deepStrictEqual(runtimeBeforeSnapshot.getStatus(), RuntimeStatus.Pending);

      const snapshot = runtimeBeforeSnapshot.getSnapshot();
      const runtimeAfterSnapshot = snapshotMachine.restoreRuntime({ snapshot });

      assert.deepStrictEqual(runtimeAfterSnapshot.getContext(), { value: 1 });
      assert.deepStrictEqual(runtimeAfterSnapshot.getState(), 'intermediate');
      assert.deepStrictEqual(runtimeAfterSnapshot.getStatus(), RuntimeStatus.Pending);

      await runtimeAfterSnapshot.execute({ type: 'finish' });

      assert.deepStrictEqual(runtimeAfterSnapshot.getContext(), { value: 2 });
      assert.deepStrictEqual(runtimeAfterSnapshot.getState(), 'end');
      assert.deepStrictEqual(runtimeAfterSnapshot.getStatus(), RuntimeStatus.Done);
    });
  });

  describe('rollback', () => {
    test('rollback on start after unsucessful action', async t => {
      const runtime = rollbackStartMachine.run({ context: { value: false }});

      await assert.rejects(runtime.start());

      assert.deepStrictEqual(runtime.getStatus(), RuntimeStatus.Stopped);
      assert.deepStrictEqual(runtime.getState(), 'start');
      assert.deepStrictEqual(runtime.getContext(), { value: false });
    });

    test('rollback on command after unsucessful action', async t => {
      const runtime = rollbackFromActionMachine.run({ context: { value: false }});

      await runtime.start();

      await assert.rejects(runtime.execute({ type: 'run' }));

      assert.deepStrictEqual(runtime.getStatus(), RuntimeStatus.Pending);
      assert.deepStrictEqual(runtime.getState(), 'start');
      assert.deepStrictEqual(runtime.getContext(), { value: false });
    });

    test('rollback on guard throw', async t => {
      const runtime = rollbackFromGuardMachine.run({});

      await runtime.start();
      await assert.rejects(runtime.execute({ type: 'run' }));

      assert.deepStrictEqual(runtime.getStatus(), RuntimeStatus.Pending);
      assert.deepStrictEqual(runtime.getState(), 'start');
      assert.deepStrictEqual(runtime.getContext(), {});
    });

    test('rollback on hook throw', async t => {
      const runtime = rollbackFromHookMachine.run({});

      await runtime.start();
      await assert.rejects(runtime.execute({ type: 'run' }));

      assert.deepStrictEqual(runtime.getStatus(), RuntimeStatus.Pending);
      assert.deepStrictEqual(runtime.getState(), 'start');
      assert.deepStrictEqual(runtime.getContext(), {});
    });

    test('rollback on hook actor throw', async t => {
      const runtime = rollbackFromHookActorMachine.run({
        actors: {
          throwingActor: () => {
            throw new Error('Thrown from hook actor');
          },
        },
      });

      await runtime.start();
      await assert.rejects(runtime.execute({ type: 'run' }));

      assert.deepStrictEqual(runtime.getStatus(), RuntimeStatus.Pending);
      assert.deepStrictEqual(runtime.getState(), 'start');
      assert.deepStrictEqual(runtime.getContext(), {});
    });
  });

  describe('Command payload', () => {
    test('it should carry command over to effect action', async t => {
      const runtime = commandPayloadActionMachine.run({ context: { value: 0 }});

      await runtime.start();

      await runtime.execute({ type: 'add', value: 2 });
      assert.deepStrictEqual(runtime.getContext(), { value: 2 });

      await runtime.execute({ type: 'add', value: 3 });
      assert.deepStrictEqual(runtime.getContext(), { value: 5 });

      await runtime.execute({ type: 'add', value: 10 });
      assert.deepStrictEqual(runtime.getContext(), { value: 15 });
    });

    test('it should carry command over to effect guard', async t => {
      const trueRuntime = commandPayloadGuardMachine.run({});

      await trueRuntime.start();
      await trueRuntime.execute({ type: 'run', value: true });
      assert.deepStrictEqual(trueRuntime.getState(), 'true');

      const falseRuntime = commandPayloadGuardMachine.run({});

      await falseRuntime.start();
      await falseRuntime.execute({ type: 'run', value: false });
      assert.deepStrictEqual(falseRuntime.getState(), 'false');
    });
  });

  describe('History', () => {
    test('should store history of commands and states', async t => {
      const runtime = historyMachine.run({});

      await runtime.start();
      await runtime.execute({ type: 'run' });

      const history = runtime.getHistory();

      assert.deepStrictEqual(history.map(e => omit(e, 'timestamp')), [
        { type: 'state', state: 'start' },
        { type: 'command', command: { type: 'run' } },
        { type: 'state', state: 'intermediate' },
        { type: 'state', state: 'end' },
      ]);
    });
  });

  describe('Available commands checks', () => {
    test('canAcceptCommand', async t => {
      const runtime = canAcceptCommandMachine.run({});

      assert.deepStrictEqual(runtime.canAcceptCommand({ type: 'next' }), false);
      assert.deepStrictEqual(runtime.canAcceptCommand({ type: 'finish' }), false);
      assert.deepStrictEqual(runtime.canAcceptCommand({ type: 'foobar' as any }), false);

      await runtime.start();

      assert.deepStrictEqual(runtime.canAcceptCommand({ type: 'next' }), true);
      assert.deepStrictEqual(runtime.canAcceptCommand({ type: 'finish' }), false);
      assert.deepStrictEqual(runtime.canAcceptCommand({ type: 'foobar' as any }), false);

      await runtime.execute({ type: 'next' });

      assert.deepStrictEqual(runtime.canAcceptCommand({ type: 'next' }), false);
      assert.deepStrictEqual(runtime.canAcceptCommand({ type: 'finish' }), true);
      assert.deepStrictEqual(runtime.canAcceptCommand({ type: 'foobar' as any }), false);

      await runtime.execute({ type: 'finish' });

      assert.deepStrictEqual(runtime.canAcceptCommand({ type: 'next' }), false);
      assert.deepStrictEqual(runtime.canAcceptCommand({ type: 'finish' }), false);
      assert.deepStrictEqual(runtime.canAcceptCommand({ type: 'foobar' as any }), false);
    });

    test('canExecuteCommand', async t => {
      const runtime = canExecuteCommandMachine.run({});

      assert.deepStrictEqual(await runtime.canExecuteCommand({ type: 'next', value: false }), false);
      assert.deepStrictEqual(await runtime.canExecuteCommand({ type: 'finish', value: false }), false);
      assert.deepStrictEqual(await runtime.canExecuteCommand({ type: 'foobar', value: false } as any), false);
      assert.deepStrictEqual(await runtime.canExecuteCommand({ type: 'next', value: true }), false);
      assert.deepStrictEqual(await runtime.canExecuteCommand({ type: 'finish', value: true }), false);
      assert.deepStrictEqual(await runtime.canExecuteCommand({ type: 'foobar', value: true } as any), false);

      await runtime.start();

      assert.deepStrictEqual(await runtime.canExecuteCommand({ type: 'next', value: false }), false);
      assert.deepStrictEqual(await runtime.canExecuteCommand({ type: 'finish', value: false }), false);
      assert.deepStrictEqual(await runtime.canExecuteCommand({ type: 'foobar', value: false } as any), false);
      assert.deepStrictEqual(await runtime.canExecuteCommand({ type: 'next', value: true }), true);
      assert.deepStrictEqual(await runtime.canExecuteCommand({ type: 'finish', value: true }), false);
      assert.deepStrictEqual(await runtime.canExecuteCommand({ type: 'foobar', value: true } as any), false);

      await runtime.execute({ type: 'next', value: true });

      assert.deepStrictEqual(await runtime.canExecuteCommand({ type: 'next', value: false }), false);
      assert.deepStrictEqual(await runtime.canExecuteCommand({ type: 'finish', value: false }), false);
      assert.deepStrictEqual(await runtime.canExecuteCommand({ type: 'foobar', value: false } as any), false);
      assert.deepStrictEqual(await runtime.canExecuteCommand({ type: 'next', value: true }), false);
      assert.deepStrictEqual(await runtime.canExecuteCommand({ type: 'finish', value: true }), true);
      assert.deepStrictEqual(await runtime.canExecuteCommand({ type: 'foobar', value: true } as any), false);

      await runtime.execute({ type: 'finish', value: true });

      assert.deepStrictEqual(await runtime.canExecuteCommand({ type: 'next', value: false }), false);
      assert.deepStrictEqual(await runtime.canExecuteCommand({ type: 'finish', value: false }), false);
      assert.deepStrictEqual(await runtime.canExecuteCommand({ type: 'foobar', value: false } as any), false);
      assert.deepStrictEqual(await runtime.canExecuteCommand({ type: 'next', value: true }), false);
      assert.deepStrictEqual(await runtime.canExecuteCommand({ type: 'finish', value: true }), false);
      assert.deepStrictEqual(await runtime.canExecuteCommand({ type: 'foobar', value: true } as any), false);
    });

    test('getAcceptableCommands', async t => {
      const runtime = canAcceptCommandMachine.run({});

      assert.deepStrictEqual(runtime.getAcceptableCommands(), []);

      await runtime.start();

      assert.deepStrictEqual(runtime.getAcceptableCommands(), [{ type: 'next' }]);

      await runtime.execute({ type: 'next' });

      assert.deepStrictEqual(runtime.getAcceptableCommands(), [{ type: 'finish' }]);

      await runtime.execute({ type: 'finish' });

      assert.deepStrictEqual(runtime.getAcceptableCommands(), []);
    });
  });
});