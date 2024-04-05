import assert from 'node:assert';
import test, { describe } from 'node:test';
import { Txsm } from '../src/machine/state-machine.mjs';
import { RuntimeStatus } from '../src/machine/types.mjs';
import { actorAssignMachine, anyExitAnyEntryHookMachine, autoEndContinueMachine, autoEndMachine, commandPayloadMachine, counterMachine, exitEntryHookMachine, guardedAutomatedTransitionMachine, guardedManualTransitionMachine, lightMachine, makeEffectCallbackMachine, mergeContextMachine, multipleGuardsAutomatedTransitionMachine, multipleGuardsManualTransitionMachine, rollbackCommandMachine, rollbackStartMachine, snapshotMachine } from './machines.mjs';

describe('MachineRuntime', () => {
  test('initialization', async () => {
    const runtime = Txsm.create({
      transitions: [{ from: 's1', to: 's2', with: 'start' }],
      config: { initial: 's1', final: [] },
    }).run({ context: {} });

    assert.deepEqual(runtime.getState(), 's1');
    assert.deepEqual(runtime.getStatus(), RuntimeStatus.Stopped);

    await runtime.start();

    assert.deepEqual(runtime.getStatus(), RuntimeStatus.Pending);
  });

  describe('transition', () => {
    test('allow to traverse transitions in a loop', async t => {
      const runtime = lightMachine.run({ context: {} });

      await runtime.start();
      assert.deepEqual(runtime.getState(), 'red');
      assert.deepEqual(runtime.getStatus(), RuntimeStatus.Pending);

      await runtime.execute({ type: 'walk' });
      assert.deepEqual(runtime.getState(), 'green');
      assert.deepEqual(runtime.getStatus(), RuntimeStatus.Pending);

      await runtime.execute({ type: 'stop' });
      assert.deepEqual(runtime.getState(), 'red');
      assert.deepEqual(runtime.getStatus(), RuntimeStatus.Pending);
    });

    test('run automated transitions on start', async t => {
      const runtime = autoEndMachine.run({ context: {} });

      assert.deepEqual(runtime.getState(), 'start');
      assert.deepEqual(runtime.getStatus(), RuntimeStatus.Stopped);

      await runtime.start();
      assert.deepEqual(runtime.getState(), 'end');
      assert.deepEqual(runtime.getStatus(), RuntimeStatus.Done);
    });

    test('stop automated transitions upon reaching final state', async t => {
      const runtime = autoEndContinueMachine.run({ context: {} });

      assert.deepEqual(runtime.getState(), 'start');
      assert.deepEqual(runtime.getStatus(), RuntimeStatus.Stopped);

      await runtime.start();
      assert.deepEqual(runtime.getState(), 'end');
      assert.deepEqual(runtime.getStatus(), RuntimeStatus.Done);
    });
  });

  describe('Effect guard', () => {
    test('it should select transitions based on guard (manual)', async t => {
      const runtimeTrue = guardedManualTransitionMachine.run({ context: { value: true } });

      await runtimeTrue.start();
      await runtimeTrue.execute({ type: 'next' });
      assert.deepEqual(runtimeTrue.getState(), 'valueTrue');

      const runtimeFalse = guardedManualTransitionMachine.run({ context: { value: false } });

      await runtimeFalse.start();
      await runtimeFalse.execute({ type: 'next' });
      assert.deepEqual(runtimeFalse.getState(), 'valueFalse');
    });

    test('it should select transitions based on guard (automated)', async t => {
      const runtimeTrue = guardedAutomatedTransitionMachine.run({ context: { value: true } });

      await runtimeTrue.start();
      assert.deepEqual(runtimeTrue.getState(), 'valueTrue');

      const runtimeFalse = guardedAutomatedTransitionMachine.run({ context: { value: false } });

      await runtimeFalse.start();
      assert.deepEqual(runtimeFalse.getState(), 'valueFalse');
    });

    test('it should select transition based on one of multiple guards (manual)', async t => {
      for (const value of [1, 2, 3]) {
        const runtime = multipleGuardsManualTransitionMachine.run({ context: { value }});

        await runtime.start();
        await runtime.execute({ type: 'run' });

        assert.deepEqual(runtime.getState(), `value${value}`);
      }

      const noTransitionRuntime = multipleGuardsManualTransitionMachine.run({ context: { value: 0 }});
      await noTransitionRuntime.start();
      await assert.rejects(noTransitionRuntime.execute({ type: 'run' }));
    });

    test('it should select transition based on one of multiple guards (automated)', async t => {
      for (const value of [1, 2, 3]) {
        const runtime = multipleGuardsAutomatedTransitionMachine.run({ context: { value }});

        await runtime.start();
        assert.deepEqual(runtime.getState(), `value${value}`);
      }

      const noTransitionRuntime = multipleGuardsAutomatedTransitionMachine.run({ context: { value: 0 }});
      await noTransitionRuntime.start();
      assert.deepEqual(noTransitionRuntime.getState(), 'start');
    });
  });

  describe('Effect action', () => {
    test('it call all defined actions', async t => {
      let counter = 0;
      const runtime = makeEffectCallbackMachine(() => { counter += 1; }).run({ context: {} });

      await runtime.start();
      assert.deepEqual(counter, 3);
      assert.deepEqual(runtime.getState(), 'end');
    });

    test('it should assign values to context', async t => {
      const runtime = counterMachine.run({ context: { value: 1 } });

      await runtime.start();
      assert.deepEqual(runtime.getContext().value, 1);

      await runtime.execute({ type: 'increment' });
      assert.deepEqual(runtime.getContext().value, 2);

      await runtime.execute({ type: 'incrementTwice' });
      assert.deepEqual(runtime.getContext().value, 4);

      await runtime.execute({ type: 'increment' });
      assert.deepEqual(runtime.getContext().value, 5);
    });

    test('it should properly merge context', async t => {
      const runtime = mergeContextMachine.run({ context: { value0: true, value1: false, value2: [false], value3: { subValue1: true } } });

      await runtime.start();
      assert.deepEqual(runtime.getContext(), {
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
      assert.deepEqual(runtime.getContext().value, 7);
    });
  });

  describe('Hook action', () => {
    test('it should call entry and exit hook', async () => {
      const runtime = exitEntryHookMachine.run({ context: { entry: 0, exit: 0 }});

      await runtime.start();

      assert.deepEqual(runtime.getContext(), { entry: 1, exit: 1 });
    });

    test('it should call entry and exit hook if defined as any (*)', async () => {
      const runtime = anyExitAnyEntryHookMachine.run({ context: { entry: 0, exit: 0 }});

      await runtime.start();

      assert.deepEqual(runtime.getContext(), { entry: 1, exit: 1 });
    });
  });

  describe('snapshots', () => {
    test('it should make snapshot and restore it', async () => {
      const runtimeBeforeSnapshot = snapshotMachine.run({ context: { value: 0 }});

      await runtimeBeforeSnapshot.start();
      await runtimeBeforeSnapshot.execute({ type: 'run' });

      assert.deepEqual(runtimeBeforeSnapshot.getContext(), { value: 1 });
      assert.deepEqual(runtimeBeforeSnapshot.getState(), 'intermediate');
      assert.deepEqual(runtimeBeforeSnapshot.getStatus(), RuntimeStatus.Pending);

      const snapshot = runtimeBeforeSnapshot.getSnapshot();
      const runtimeAfterSnapshot = snapshotMachine.restoreRuntime({ snapshot });

      assert.deepEqual(runtimeAfterSnapshot.getContext(), { value: 1 });
      assert.deepEqual(runtimeAfterSnapshot.getState(), 'intermediate');
      assert.deepEqual(runtimeAfterSnapshot.getStatus(), RuntimeStatus.Pending);

      await runtimeAfterSnapshot.execute({ type: 'finish' });

      assert.deepEqual(runtimeAfterSnapshot.getContext(), { value: 2 });
      assert.deepEqual(runtimeAfterSnapshot.getState(), 'end');
      assert.deepEqual(runtimeAfterSnapshot.getStatus(), RuntimeStatus.Done);
    });
  });

  describe('rollback', () => {
    test('rollback on start after unsucessful action', async t => {
      const runtime = rollbackStartMachine.run({ context: { value: false }});

      await assert.rejects(runtime.start());

      assert.deepEqual(runtime.getStatus(), RuntimeStatus.Stopped);
      assert.deepEqual(runtime.getState(), 'start');
      assert.deepEqual(runtime.getContext(), { value: false });
    });

    test('rollback on command after unsucessful action', async t => {
      const runtime = rollbackCommandMachine.run({ context: { value: false }});

      await runtime.start();

      await assert.rejects(runtime.execute({ type: 'run' }));

      assert.deepEqual(runtime.getStatus(), RuntimeStatus.Pending);
      assert.deepEqual(runtime.getState(), 'start');
      assert.deepEqual(runtime.getContext(), { value: false });
    });
  });

  describe('Command payload', () => {
    test('it should carry command over to effect action', async t => {
      const runtime = commandPayloadMachine.run({ context: { value: 0 }});

      await runtime.start();

      await runtime.execute({ type: 'add', value: 2 });
      assert.deepEqual(runtime.getContext(), { value: 2 });

      await runtime.execute({ type: 'add', value: 3 });
      assert.deepEqual(runtime.getContext(), { value: 5 });

      await runtime.execute({ type: 'add', value: 10 });
      assert.deepEqual(runtime.getContext(), { value: 15 });
    });
  });
});