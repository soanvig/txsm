import assert from 'node:assert';
import test, { describe } from 'node:test';
import { RuntimeStatus } from '../src/machine/machine-runtime.mjs';
import { StateMachine } from '../src/machine/state-machine.mjs';

const lightMachine = StateMachine.create({
  transitions: [
    { from: 'green', to: 'yellow', with: 'stop' },
    { from: 'yellow', to: 'red' }, //  auto transition
    { from: 'red', to: 'green', with: 'walk' },
  ],
  config: { initial: 'red', final: [] },
}).setTypes({
  context: {} as {},
  actors: {} as {},
  commands: {} as { stop: {}, walk: {} },
});

const autoEndMachine = StateMachine.create({
  transitions: [
    { from: 'start', to: 'intermediate' },
    { from: 'intermediate', to: 'end' },
  ],
  config: { initial: 'start', final: ['end'] },
});

const autoEndContinueMachine = StateMachine.create({
  transitions: [
    { from: 'start', to: 'intermediate' },
    { from: 'intermediate', to: 'end' },
    { from: 'end', to: 'unreachableEnd' },
  ],
  config: { initial: 'start', final: ['end'] },
});

describe('MachineRuntime', () => {
  test('initialization', async () => {
    const runtime = StateMachine.create({
      transitions: [{ from: 's1', to: 's2', with: 'start' }],
      config: { initial: 's1', final: [] },
    }).run({ context: {} });

    assert.deepEqual(runtime.getState(), 's1');
    assert.deepEqual(runtime.getStatus(), RuntimeStatus.Stopped);

    await runtime.start();

    assert.deepEqual(runtime.getStatus(), RuntimeStatus.Pending);
  });

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