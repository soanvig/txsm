import assert from 'assert';
import test, { describe } from 'node:test';
import { Txsm } from '../src/machine/state-machine.mjs';
import { Transition } from '../src/machine/transition.mjs';

describe('StateMachine', () => {
  test('#create/.addEffect', t => {
    const effects = [{ guard: function effectGuard1 () { return false; } }];
    const transitions = [{ from: 's1', to: 's2' } as const];
    const config = {
      initial: 's1' as const,
      final: ['s2' as const],
    };

    const sm = Txsm.create({
      transitions,
      config,
    }).addEffect({ from: 's1', to: 's2' }, effects[0]).getStateMachine();

    assert.deepEqual(sm.$transitions, [Transition.fromObject(transitions[0])]);
    assert.deepEqual(sm.$config, config);
    assert.deepEqual(sm.$effects, [
      { condition: { from: 's1', to: 's2' }, effect: effects[0] },
    ]);
  });

  test('.addEffect duplicate', t => {
    const sm = Txsm.create({
      transitions: [{ from: 's1', to: 's2' }],
      config: { initial: 's1', final: [] },
    }).addEffect({ from: 's1', to: 's2' }, {});

    assert.throws(() => sm.addEffect({ from: 's1', to: 's2' }, {}));
  });
});