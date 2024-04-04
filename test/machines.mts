import { setTimeout } from 'timers/promises';
import { Action } from '../src/machine/action.mjs';
import { Machine } from '../src/machine/state-machine.mjs';

export const lightMachine = Machine.create({
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

export const autoEndMachine = Machine.create({
  transitions: [
    { from: 'start', to: 'intermediate' },
    { from: 'intermediate', to: 'end' },
  ],
  config: { initial: 'start', final: ['end'] },
});

export const autoEndContinueMachine = Machine.create({
  transitions: [
    { from: 'start', to: 'intermediate' },
    { from: 'intermediate', to: 'end' },
    { from: 'end', to: 'unreachableEnd' },
  ],
  config: { initial: 'start', final: ['end'] },
});

export const guardedManualTransitionMachine = Machine.create({
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

export const guardedAutomatedTransitionMachine = Machine.create({
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

export const multipleGuardsAutomatedTransitionMachine = Machine.create({
  transitions: [
    { from: 'start', to: 'value1' },
    { from: 'start', to: 'value2' },
    { from: 'start', to: 'value3' },
  ],
  config: { initial: 'start', final: ['value1', 'value2', 'value3'] },
}).setTypes({
  actors: {},
  commands: {},
  context: {} as {
    value: number;
  },
})
  .addEffect('start', 'value1', { guard: ({ context }) => context.value === 1 })
  .addEffect('start', 'value2', { guard: ({ context }) => context.value === 2 })
  .addEffect('start', 'value3', { guard: ({ context }) => context.value === 3 });

export const multipleGuardsManualTransitionMachine = Machine.create({
  transitions: [
    { from: 'start', to: 'value1', with: 'run' },
    { from: 'start', to: 'value2', with: 'run' },
    { from: 'start', to: 'value3', with: 'run' },
  ],
  config: { initial: 'start', final: ['value1', 'value2', 'value3'] },
}).setTypes({
  actors: {},
  commands: {} as {
    run: {}
  },
  context: {} as {
    value: number;
  },
})
  .addEffect('start', 'value1', { guard: ({ context }) => context.value === 1 })
  .addEffect('start', 'value2', { guard: ({ context }) => context.value === 2 })
  .addEffect('start', 'value3', { guard: ({ context }) => context.value === 3 });

export const makeEffectCallbackMachine = (cb: () => void) => Machine.create({
  transitions: [
    { from: 'start', to: 'end' },
  ],
  config: { initial: 'start', final: ['end'] },
})
  .addEffect('start', 'end', {
    action: () =>
      Action.from(cb)
        .then(() => setTimeout(5).then(cb))
        .then(cb),
  });

export const counterMachine = Machine.create({
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
  action: ({ context, assign }) => assign({ value: context.value + 1 }),
}).addEffect('pending', 'incrementedTwice', {
  action: ({ assign, context }) => assign({ value: context.value + 1 })
    .then(({ context }) => assign({ value: context.value + 1 })),
});

export const actorAssignMachine = Machine.create({
  transitions: [
    { from: 'pending', to: 'end' },
  ],
  config: { initial: 'pending', final: ['end'] },
}).setTypes({
  context: {} as { value: number },
  actors: {} as {
    call: (value: number) => number
  },
  commands: {},
}).addEffect('pending', 'end', {
  action: ({ context, invoke, assign }) =>
    invoke('call', context.value)
      .then(({ result }) => assign({ value: result })),
});

export const mergeContextMachine = Machine.create({
  transitions: [
    { from: 'pending', to: 'end' },
  ],
  config: { initial: 'pending', final: ['end'] },
}).setTypes({
  context: {} as { value0: boolean, value1: boolean, value2: boolean[], value3: { subValue1?: boolean, subValue2?: boolean } },
  actors: {} as {},
  commands: {},
}).addEffect('pending', 'end', {
  action: ({ assign }) =>
    assign({ value1: true })
      .then(assign({ value2: [true] }))
      .then(assign({ value3: { subValue2: true }})),
});