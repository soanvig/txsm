import { setTimeout } from 'timers/promises';
import { StateMachine } from '../src/machine/state-machine.mjs';

export const lightMachine = StateMachine.create({
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

export const autoEndMachine = StateMachine.create({
  transitions: [
    { from: 'start', to: 'intermediate' },
    { from: 'intermediate', to: 'end' },
  ],
  config: { initial: 'start', final: ['end'] },
});

export const autoEndContinueMachine = StateMachine.create({
  transitions: [
    { from: 'start', to: 'intermediate' },
    { from: 'intermediate', to: 'end' },
    { from: 'end', to: 'unreachableEnd' },
  ],
  config: { initial: 'start', final: ['end'] },
});

export const guardedManualTransitionMachine = StateMachine.create({
  transitions: [
    { from: 'start', to: 'valueTrue', with: 'next' },
    { from: 'start', to: 'valueFalse', with: 'next' },
  ],
  config: { initial: 'start', final: ['valueFalse', 'valueTrue'] },
}).setTypes({
  actors: {},
  commands: {
    next: {},
  },
  context: {} as {
    value: boolean;
  },
}).addEffect('start', 'valueTrue', {
  guard: ({ context }) => context.value === true,
});

export const guardedAutomatedTransitionMachine = StateMachine.create({
  transitions: [
    { from: 'start', to: 'valueTrue' },
    { from: 'start', to: 'valueFalse' },
  ],
  config: { initial: 'start', final: ['valueFalse', 'valueTrue'] },
}).setTypes({
  actors: {},
  commands: {},
  context: {} as {
    value: boolean;
  },
}).addEffect('start', 'valueTrue', {
  guard: ({ context }) => context.value === true,
});

export const makeEffectCallbackMachine = (cb: () => void) => StateMachine.create({
  transitions: [
    { from: 'start', to: 'end' },
  ],
  config: { initial: 'start', final: ['end'] },
})
  .addEffect('start', 'end', {
    actions: [
      () => cb(),
      async () => {
        await setTimeout(5);
        cb();
      },
      () => cb(),
    ],
  });

export const counterMachine = StateMachine.create({
  transitions: [
    { from: 'pending', to: 'incremented', with: 'increment' },
    { from: 'pending', to: 'incrementedTwice', with: 'incrementTwice' },
    { from: 'incremented', to: 'pending' },
    { from: 'incrementedTwice', to: 'pending' },
  ],
  config: { initial: 'pending', final: [] },
}).setTypes({
  context: {} as { value: number },
  actors: {},
  commands: {
    increment: {},
    incrementTwice: {},
  },
}).addEffect('pending', 'incremented', {
  actions: [
    ({ context, assign }) => assign({ value: context.value + 1 }),
  ],
}).addEffect('pending', 'incrementedTwice', {
  actions: [
    ({ context, assign }) => assign({ value: context.value + 1 }),
    ({ context, assign }) => assign({ value: context.value + 1 }),
  ],
});