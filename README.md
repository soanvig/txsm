# txsm

Transactional state machines for backend (but not only) solutions.

## Features

- Awaitable transitions (support for async operations across the functionality)
- Transactional operations (the machine cannot land in incorrect/not-expected state)
- Easy machine definition that works close with JavaScript
- Multiple transitions from a state with one event via guards
- Persistance and restoration
- Actions (side effects) on transitions
- Ability to provide actions implementation separately from the machine definition (via actors)
- Full and strict TypeScript support
- History of states

## Quick start

```
$ pnpm add txsm
$ npm install --save txsm
$ yarn add txsm
```

```ts
export const lightMachine = Txsm
  .create({
    transitions: [
      // calling `stop` command will transition from green to yellow if current state is `green`
      { from: 'green', to: 'yellow', with: 'stop' },
      // automated transition - no command needs to be called
      { from: 'yellow', to: 'red' },
      // calling `walk` command will transition from red to green if current state is `red`
      { from: 'red', to: 'green', with: 'walk' }, 
    ],
    // new machine should start from `red`, and there is no final state, because it loops forever
    config: { initial: 'red', final: [] },
  })
  .setTypes({
    context: {} as {
      enteredYellowCounter: number
    },
    commands: {} as { // define commands payload
      stop: {},
      walk: {}
    },
  })
  .addEffect({ enter: 'yellow' }, { // after entering yellow
    action: ({ from, assign, context }) =>
      // update context that yellow state was entered
      assign({ enteredYellowCounter: context.enteredYellowCounter + 1 })
      // wait for 500ms (then automated transition to red will happen)
      .then(() => waitFor(500))
  });

const lightRuntime = lightMachine.run({
  // context is required, because it was defined in the machine configuration
  context: { enteredYellowCounter: 0 }
});

// enters initial `red` state and waits
await lightRuntime.start();
// logs `[{ type: 'walk' }]`
console.log(lightRuntime.getAcceptableCommands());

// transitions to green
await lightRuntime.execute({ type: 'walk' });
// logs `[{ type: 'stop' }]`
console.log(lightRuntime.getAcceptableCommands());

// transitions to yellow, waits 500ms, and transitions to red.
// After all of that the `.execute` promise is resolved
await lightRuntime.execute({ type: 'stop' });

console.log(lightRuntime.getState()); // logs `red`
console.log(lightRuntime.getContext()); // logs `{ enteredYellowCounter: 1 }`
```

## Effects

### Actions

### Guards

## Actors

## How it compares to xstate

1. Txsm does not have parallel and history states
2. Txsm does not have delayed events, timers etc as I consider them a bloat. If needed similar thing can be implemented manually by the user using actions.
3. Txsm supports awaitable transitions and performs them in a transactional way. That means if a command is called, and it results in going through multiple states, if at some point execution fails,
it automatically rollbacks to a state from before calling the command. It makes it perfect for backend use.
4. The API is oriented around transitions, not around states. Transitions define what is possible, and which states are achievable. Calling actions and checking guards is just an addition. That leads to machine being much easier to read and reason about.
5. Txsm does not support nested state machines - yet. This is very important feature that I want to implement.
6. Txsm is less fragile when it comes to state machine changes. In xstate when you have a snapshot persisted, changes to a machine definition might very easily lead to a bug. In txsm it is theoretically possible to rebuild entire logic and bring snapshot back to live, as long as the context and the persisted state of a machine is compatible.
7. Many things achievable in xstate should be achievable in txsm in some way. If not - please open an issue.

## Roadmap/planned features

See [TODO.md](./TODO.md)