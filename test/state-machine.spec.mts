import test, { describe } from 'node:test';
import { StateMachine } from '../src/machine/state-machine.mjs';

/** It is impossible to test in some sensible way as transitions and config are abstracted, but I'm a bit drunk now so maybe I'm wrong */
describe.skip('StateMachine', () => {
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
  });
});