import { setTimeout } from 'timers/promises';
import { Action } from '../src/machine/action.mjs';
import { Txsm } from '../src/machine/state-machine.mjs';

export const lightMachine = Txsm.create({
  transitions: [
    { from: 'green', to: 'yellow', with: 'stop' },
    { from: 'yellow', to: 'red' }, //  auto transition
    { from: 'red', to: 'green', with: 'walk' },
  ],
  config: { initial: 'red', final: [] },
}).setTypes({
  commands: {} as { stop: {}, walk: {} },
});

export const autoEndMachine = Txsm.create({
  transitions: [
    { from: 'start', to: 'intermediate' },
    { from: 'intermediate', to: 'end' },
  ],
  config: { initial: 'start', final: ['end'] },
});

export const autoEndContinueMachine = Txsm.create({
  transitions: [
    { from: 'start', to: 'intermediate' },
    { from: 'intermediate', to: 'end' },
    { from: 'end', to: 'unreachableEnd' },
  ],
  config: { initial: 'start', final: ['end'] },
});

export const guardedManualTransitionMachine = Txsm.create({
  transitions: [
    { from: 'start', to: 'valueTrue', with: 'next' },
    { from: 'start', to: 'valueFalse', with: 'next' },
  ],
  config: { initial: 'start', final: ['valueFalse', 'valueTrue'] },
}).setTypes({
  commands: {
    next: {},
  },
  context: {} as {
    value: boolean;
  },
}).addEffect({ from: 'start', to: 'valueTrue' }, {
  guard: ({ context }) => context.value === true,
});

export const guardedAutomatedTransitionMachine = Txsm.create({
  transitions: [
    { from: 'start', to: 'valueTrue' },
    { from: 'start', to: 'valueFalse' },
  ],
  config: { initial: 'start', final: ['valueFalse', 'valueTrue'] },
}).setTypes({
  context: {} as {
    value: boolean;
  },
}).addEffect({ from: 'start', to: 'valueTrue' }, {
  guard: ({ context }) => context.value === true,
});

export const multipleGuardsAutomatedTransitionMachine = Txsm.create({
  transitions: [
    { from: 'start', to: 'value1' },
    { from: 'start', to: 'value2' },
    { from: 'start', to: 'value3' },
  ],
  config: { initial: 'start', final: ['value1', 'value2', 'value3'] },
}).setTypes({
  context: {} as {
    value: number;
  },
})
  .addEffect({ from: 'start', to: 'value1' }, { guard: ({ context }) => context.value === 1 })
  .addEffect({ from: 'start', to: 'value2' }, { guard: ({ context }) => context.value === 2 })
  .addEffect({ from: 'start', to: 'value3' }, { guard: ({ context }) => context.value === 3 });

export const multipleGuardsManualTransitionMachine = Txsm.create({
  transitions: [
    { from: 'start', to: 'value1', with: 'run' },
    { from: 'start', to: 'value2', with: 'run' },
    { from: 'start', to: 'value3', with: 'run' },
  ],
  config: { initial: 'start', final: ['value1', 'value2', 'value3'] },
}).setTypes({
  commands: {} as {
    run: {}
  },
  context: {} as {
    value: number;
  },
})
  .addEffect({ from: 'start', to: 'value1' }, { guard: ({ context }) => context.value === 1 })
  .addEffect({ from: 'start', to: 'value2' }, { guard: ({ context }) => context.value === 2 })
  .addEffect({ from: 'start', to: 'value3' }, { guard: ({ context }) => context.value === 3 });

export const makeEffectCallbackMachine = (cb: () => void) => Txsm.create({
  transitions: [
    { from: 'start', to: 'end' },
  ],
  config: { initial: 'start', final: ['end'] },
})
  .addEffect({ from: 'start', to: 'end' }, {
    action: ({ from }) =>
      from(cb)
        .then(() => setTimeout(5).then(cb))
        .then(cb),
  });

export const counterMachine = Txsm.create({
  transitions: [
    { from: 'pending', to: 'incremented', with: 'increment' },
    { from: 'pending', to: 'incrementedTwice', with: 'incrementTwice' },
    { from: 'incremented', to: 'pending' },
    { from: 'incrementedTwice', to: 'pending' },
  ],
  config: { initial: 'pending', final: [] },
}).setTypes({
  context: {} as { value: number },
  commands: {
    increment: {},
    incrementTwice: {},
  },
}).addEffect({ from: 'pending', to: 'incremented' }, {
  action: ({ context, assign }) => assign({ value: context.value + 1 }),
}).addEffect({ from: 'pending', to: 'incrementedTwice' }, {
  action: ({ assign, context }) => assign({ value: context.value + 1 })
    .then(({ context }) => assign({ value: context.value + 1 })),
});

export const actorAssignMachine = Txsm.create({
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
}).addEffect({ from: 'pending', to: 'end' }, {
  action: ({ context, invoke, assign }) =>
    invoke('call', context.value)
      .then(({ result }) => assign({ value: result })),
});

export const mergeContextMachine = Txsm.create({
  transitions: [
    { from: 'pending', to: 'end' },
  ],
  config: { initial: 'pending', final: ['end'] },
}).setTypes({
  context: {} as { value0: boolean, value1: boolean, value2: boolean[], value3: { subValue1?: boolean, subValue2?: boolean } },
}).addEffect({ from: 'pending', to: 'end' }, {
  action: ({ assign }) =>
    assign({ value1: true })
      .then(assign({ value2: [true] }))
      .then(assign({ value3: { subValue2: true }})),
});

export const exitEntryEffectMachine = Txsm.create({
  transitions: [
    { from: 'pending', to: 'end' },
  ],
  config: { initial: 'pending', final: ['end'] },
}).setTypes({
  context: {} as { entry: number, exit: number },
}).addEffect({ enter: 'end' }, {
  action: ({ assign, context }) => assign({ entry: context.entry + 1 }),
}).addEffect({ exit: 'pending' }, {
  action: ({ assign, context }) => assign({ exit: context.exit + 1 }),
});

export const anyExitAnyEntryEffectMachine = Txsm.create({
  transitions: [
    { from: 'pending', to: 'end' },
  ],
  config: { initial: 'pending', final: ['end'] },
}).setTypes({
  context: {} as { entry: number, exit: number },
}).addEffect({ enter: '*' }, {
  action: ({ assign, context }) => assign({ entry: context.entry + 1 }),
}).addEffect({ exit: '*' }, {
  action: ({ assign, context }) => assign({ exit: context.exit + 1 }),
});

export const exitEntryGuardEffectMachine = Txsm.create({
  transitions: [
    { from: 'pending', to: 'end' },
  ],
  config: { initial: 'pending', final: ['end'] },
})
  .setTypes({
    context: {} as {
      value: boolean,
      counter: number,
    },
  })
  .addEffect({ enter: 'end' }, {
    guard: ({ context }) => context.value === true,
    action: ({ assign, context }) => assign({ counter: context.counter + 1 }),
  })
  .addEffect({ exit: 'pending' }, {
    guard: ({ context }) => context.value === true,
    action: ({ assign, context }) => assign({ counter: context.counter + 1 }),
  });

export const snapshotMachine = Txsm.create({
  transitions: [
    { from: 'pending', to: 'intermediate', with: 'run' },
    { from: 'intermediate', to: 'end', with: 'finish' },
  ],
  config: { initial: 'pending', final: ['end'] },
}).setTypes({
  context: {} as { value: number },
  commands: {} as {
    run: {},
    finish: {},
  },
}).addEffect({ from: 'pending', to: 'intermediate' }, {
  action: ({ assign, context }) => assign({ value: context.value + 1 }),
}).addEffect({ from: 'intermediate', to: 'end' }, {
  action: ({ assign, context }) => assign({ value: context.value + 1 }),
});

export const rollbackStartMachine = Txsm.create({
  transitions: [
    { from: 'start', to: 'intermediate' },
    { from: 'intermediate', to: 'end' },
  ],
  config: { initial: 'start', final: ['end'] },
}).setTypes({
  context: {} as { value: boolean },
  actors: {},
}).addEffect({ from: 'intermediate', to: 'end' }, {
  action: ({}) => Action.from(() => {
    throw new Error('effect action error');
  }),
}).addEffect({ exit: 'start' }, {
  action: ({ assign }) => assign({ value: true }),
});

export const rollbackFromActionMachine = Txsm.create({
  transitions: [
    { from: 'start', to: 'intermediate', with: 'run' },
    { from: 'intermediate', to: 'end' },
  ],
  config: { initial: 'start', final: ['end'] },
}).setTypes({
  context: {} as { value: boolean },
  commands: {} as {
    run: {},
  },
}).addEffect({ from: 'intermediate', to: 'end' }, {
  action: ({}) => Action.from(() => {
    throw new Error('actionError');
  }),
}).addEffect({ exit: 'start' }, {
  action: ({ assign }) => assign({ value: true }),
});

export const commandPayloadActionMachine = Txsm.create({
  transitions: [
    { from: 'pending', to: 'pending', with: 'add' },
  ],
  config: { initial: 'pending', final: [] },
}).setTypes({
  context: {} as { value: number },
  commands: {} as {
    add: { value: number },
  },
}).addEffect({ from: 'pending', to: 'pending' }, {
  action: ({ command, context, assign }) => assign({ value: context.value + command.value }),
});

export const commandPayloadGuardMachine = Txsm.create({
  transitions: [
    { from: 'pending', to: 'true', with: 'run' },
    { from: 'pending', to: 'false', with: 'run' },
  ],
  config: { initial: 'pending', final: ['true', 'false'] },
}).setTypes({
  commands: {} as {
    run: { value: boolean },
  },
}).addEffect({ from: 'pending', to: 'true' }, {
  guard: ({ command }) => command.value === true,
});

export const rollbackFromGuardMachine = Txsm.create({
  transitions: [
    { from: 'start', to: 'intermediate', with: 'run' },
    { from: 'intermediate', to: 'end' },
  ],
  config: { initial: 'start', final: ['end'] },
}).setTypes({
  context: {} as {},
  commands: {} as {
    run: {},
  },
}).addEffect({ from: 'intermediate', to: 'end' }, {
  guard: ({}) => {
    throw new Error('Thrown from guard');
  },
});

export const rollbackFromHookMachine = Txsm.create({
  transitions: [
    { from: 'start', to: 'intermediate', with: 'run' },
    { from: 'intermediate', to: 'end' },
  ],
  config: { initial: 'start', final: ['end'] },
}).setTypes({
  context: {} as {},
  commands: {} as {
    run: {},
  },
}).addEffect({ exit: 'intermediate' }, {
  action: ({ from }) => from(() => {
    throw new Error('Thrown from hook');
  }),
});

export const rollbackFromHookActorMachine = Txsm.create({
  transitions: [
    { from: 'start', to: 'intermediate', with: 'run' },
    { from: 'intermediate', to: 'end' },
  ],
  config: { initial: 'start', final: ['end'] },
}).setTypes({
  context: {} as {},
  commands: {} as {
    run: {},
  },
  actors: {} as {
    throwingActor: () => void,
  },
}).addEffect({ exit: 'intermediate' }, {
  action: ({ invoke }) => invoke('throwingActor'),
});

export const historyMachine = Txsm.create({
  transitions: [
    { from: 'start', to: 'intermediate', with: 'run' },
    { from: 'intermediate', to: 'end' },
  ],
  config: { initial: 'start', final: ['end'] },
}).setTypes({
  commands: {} as {
    run: {},
  },
});

export const canAcceptCommandMachine = Txsm.create({
  transitions: [
    { from: 'start', to: 'intermediate', with: 'next' },
    { from: 'intermediate', to: 'end', with: 'finish' },
  ],
  config: { initial: 'start', final: ['end'] },
}).setTypes({
  commands: {} as {
    next: {},
    finish: {},
  },
});

export const canExecuteCommandMachine = Txsm.create({
  transitions: [
    { from: 'start', to: 'intermediate', with: 'next' },
    { from: 'intermediate', to: 'end', with: 'finish' },
  ],
  config: { initial: 'start', final: ['end'] },
}).setTypes({
  commands: {} as {
    next: { value: boolean },
    finish: { value: boolean },
  },
}).addEffect({ from: 'start', to: 'intermediate' }, {
  guard: ({ command }) => command.value === true,
}).addEffect({ from: 'intermediate', to: 'end' }, {
  guard: ({ command }) => command.value === true,
});
