import assert from 'node:assert';
import test, { describe } from 'node:test';
import { StateMachine } from '../src/machine/state-machine.mjs';
import { Transition } from '../src/machine/transition.mjs';

describe('StateMachine', () => {
  test('#create', t => {
    const sm = StateMachine.create({
      transitions: [
        { from: 's1', to: 's2' },
      ],
      config: {
        initial: 's1',
        final: ['s2'],
      },
    });

    assert.deepEqual(sm.$transitions, [
      Transition.fromObject({ from: 's1', to: 's2' }),
    ]);

    assert.deepEqual(sm.$config, {
      initial: 's1',
      final: ['s2'],
    });
  });
});