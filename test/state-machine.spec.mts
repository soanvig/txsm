import assert from 'assert';
import test, { describe } from 'node:test';
import { StateMachine } from '../src/machine/state-machine.mjs';
import { Transition } from '../src/machine/transition.mjs';

describe('StateMachine', () => {
  test('#create/.addEffect', t => {
    const effects = [{ guard: function effectGuard1 () { return false; } }];
    const transitions = [{ from: 's1', to: 's2' } as const];
    const config = {
      initial: 's1' as const,
      final: ['s2' as const],
    };

    const sm = StateMachine.create({
      transitions,
      config,
    }).addEffect('s1', 's2', effects[0]).getStateMachine();

    assert.deepEqual(sm.$transitions, [Transition.fromObject(transitions[0])]);
    assert.deepEqual(sm.$config, config);
    assert.deepEqual(sm.$effects, [
      { from: 's1', to: 's2', effect: effects[0] },
    ]);
  });
});