# txsm

Transactional state machines for backend (but not only) solutions.

<!-- TOC -->

- [txsm](#txsm)
  - [Features](#features)
  - [Quick start](#quick-start)
  - [Examples](#examples)
  - [Transitions](#transitions)
    - [Automated transitions](#automated-transitions)
    - [Current state / any state transition](#current-state--any-state-transition)
    - [Commands](#commands)
  - [Effects](#effects)
    - [Guards](#guards)
    - [Actions](#actions)
    - [Any effect / Any state / Current state](#any-effect--any-state--current-state)
    - [Actors](#actors)
  - [Snapshots / persistence](#snapshots--persistence)
  - [How it compares to xstate](#how-it-compares-to-xstate)
  - [License explanation](#license-explanation)
  - [Development notes / contributing](#development-notes--contributing)
  - [Roadmap/planned features](#roadmapplanned-features)

<!-- /TOC -->

## Features

- Awaitable transitions (support for async operations across the functionality)
- Transactional operations (the machine cannot land in incorrect/not-expected state)
- Easy machine definition that is close to JavaScript
- Multiple transitions from a state with one event via guards
- Persistence and restoration
- Side effects on transitions via actions
- Ability to provide actions implementation separately from the machine definition (dependency injection) via actors
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
  .setTypes({ // For TypeScript users define command's payload and context type
    context: {} as { // define context type
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

## Examples

Examples can be found here: [machines.mts](./test/machines.mts)

## Transitions

Transition describes possible change from one state to another. All transitions are defined during machine creation:

```ts
.create({
  transitions: [
    // calling `stop` command will transition from green to yellow if current state is `green`
    { from: 'green', to: 'yellow', with: 'stop' },
    // automated transition - no command needs to be called
    { from: 'yellow', to: 'red' },
    // calling `walk` command will transition from red to green if current state is `red`
    { from: 'red', to: 'green', with: 'walk' },
  ],
})
```

Because transition describes state change it requires two properties: and `to`. However, in most cases one also wants to determine *when* the transition should happen.
For that `with` property is defined, that creates a [command](#commands) with the given name.

Transition can happen **only if** the machine is in the transition's `from` state.

Transitions are always respected in the order they are defined. If there are two transitions applicable, the first one will be executed.

### Automated transitions

If the command (`with`) is not defined, then the transition is automated. Upon entering `from` state machine automatically goes to `to` state.

### Current state / any state transition

Transition can also happen from any state (current state) to any state (current state):

```ts
// As long as force-stop command is executed, it doesn't matter in which state the machine is, it will go to `red` state
{ from: Transition.CURRENT_STATE, to: 'red', with: 'force-stop' },
// It doesn't matter in which state the transition is, it will go back to itself after executing `go-to-self`
{ from: Transition.CURRENT_STATE, to: Transition.CURRENT_STATE, with: 'go-to-self' },
```

### Commands

Commands are explicitly invoked transitions. You define (names) command directly on the transition using `with` property:

```ts
{ from: 'green', to: 'yellow', with: 'stop' },
```

At this point `stop` command is created. Commands can carry a payload, so one can define it in `.setTypes` if TypeScript is used:

```ts
.setTypes({
  commands: {} as { // define commands payload
    stop: {
      stopReason: string
    },
  },
})
```

Commands and their payload can be accessed in [actions](#actions).

Upon creating, the command can be called on the machine using `.execute` function:

```ts
await lightRuntime.execute({ type: 'stop', stopReason: 'Pedestrian pressed a button' });
```

Because commands depend on the transitions, and transitions depend on current state, a list of currently executable commands can be checked at any point:

```ts
// returns true/false if there is a transition for given command in current state
lightRuntime.canAcceptCommand({ type: 'stop' })

// return true/false if there is a transition for given command, that considering all the checks (state, guards etc) can be executed
// @NOTE: because it executes all checks it requires the actual command payload
await lightRuntime.canExecuteCommand({ type: 'stop', stopReason: '...' })

// returns array of { type: '...' } objects/commands that can be executed (this function is counterpart of `canAcceptCommand`)
lightRuntime.getAcceptableCommands();
```

## Effects

Effects are run when transition happens, a state is entered or a state if exited.

When adding an effect user must first decide *when* it should trigger:

```ts
.addEffect({ from: 'stateName', to: 'stateName' }, ...) // transition effect
.addEffect({ enter: 'stateName' }, ...) // enter state effect
.addEffect({ exit: 'stateName' }, ...) // exit state effect
```

and then *what* should trigger:

```ts
.addEffect({ from: 'stateName', to: 'stateName' }, { // transition effect
  guard: ...,
  action: ...,
})
.addEffect({ enter: 'stateName' }, { // enter state effect
  guard: ...,
  action: ...,
})
.addEffect({ exit: 'stateName' }, { // exit state effect
  guard: ...,
  action: ...,
})
```

Both guard and action are optional.

Guard describes whether the effect that should be triggered. **Guard on a transition effect additionally might prevent transition from happening** if guard condition is not met.
Actions can invoke [Actors](#actors), update context, call any function (even an async one). In future its capabilities will be expanded.

All states defined in an effect need to match available states (therefore configured transitions). Transition effect (`from/to`) has to describe correct transition.
Typescript will help a user with that as all available transition are narrowed down after setting `from`.

Additionally, if the effect is configured for a transition (`from/to`), and a transition is triggered using a command (`with` in transition definition), the command will be available both in guard and action.
This is useful if user wants to use command's payload for some reason (updating context, checking a condition etc):

```ts
.setTypes({
  commands: {} as {
    myCommand: { value: boolean }
  }
})
.addEffect({ from: 'state1', to: 'state2' }, {
  guard: ({ command }) => command.value === true, // allow transition from state1 to state2 only if command's payload `.value` is equal to true
})
```

See [Actions](#actions) and [Guards](#guards) for more details and examples.

### Guards

Guards are defined on an effect. They inform the runtime whether the effect can be executed. Without a guard, an effect is always run when the condition is met.
**Guard on a transition effect additionally prevents transition from happening** if guard condition is not met.

Guards take a form of a callback, that receives current machine's context, and payload (if an effect is defined for transition that is triggered by a command):

```ts
.addEffect({ from: 'state1', to: 'state2' }, {
  guard: ({ context, command }) => c, // command is available only if a transition is trigger by a command
})
```

Defining guards on transition effects might guide the flow to reach proper state. Consider the following example:

```ts
Txsm.create({
  transitions: [
    { from: 'pending', to: 'true' },
    { from: 'pending', to: 'false' },
  ],
  config: { initial: 'pending', final: ['true', 'false'] },
}).setTypes({
  context: {} as { value: boolean }
}).addEffect({ from: 'pending', to: 'true' }, {
  guard: ({ context }) => context.value === true,
});
```

We define an automated transition `pending->true`, and automated `pending->false`. We define a context `{ value: boolean }`.
`pending->true` is defined as a first transition. Upon machine starting, it will try to execute first matching transition.
However, because there is a guard defined for that transition, the `context.value` is taken into consideration.
If current machine's `context.value` is `true`, then the machine indeed go to `true` state. However, if machine's `context.value` is `false`,
then the `pending->true` transition will not be executed, and runtime will check next matching transition: `pending->false`.
It does not have any guard, therefore it will be executed, and machine will reach state `false`.

### Actions

Action says what an effect does (besides guarding a transition).

You start defining an action by writing a callback:

```ts
.addEffect({ from: 'state1', to: 'state2' }, {
  action: ({ ... }) => ...
});
```

The callback accepts few initial starting points you might want to use:

```ts
.addEffect({ from: 'state1', to: 'state2' }, {
  action: ({ assign, context, command, invoke, from }) => ...
});
```

- `context` is the machine's context (a state)
- `assign` allows you to update the context (immediately): `assign({ newContextValue: 123 })`
- `command` is a command that triggered the transition. It works **only** if you define an effect for a particular transition that is triggered with a command (see: [#Commands](#Commands))
- `invoke` is a method to call an actor (see: [#Actors](#Actors))
- `from` allows you to write your own action with your own code (you can call external function, log something etc.)

Actions are executed one by one, even if they are asynchronous. Therefore, there is a special way for chaining them using `.then` operator (similar to Promises, but it is not a Promise):

```ts
.addEffect({ from: 'pending', to: 'end' }, {
  action: ({ assign }) =>
    assign({ value1: true })
      .then(assign({ value2: [true] }))
      .then(assign({ value3: { subValue2: true }})),
});
```

### Any effect / Any state / Current state

In certain cases one might want to be able to execute effect from any state.

For that one can set `from` as *current state*:

```ts
.addEffect({ enter: Transition.CURRENT_STATE }),
```

`CURRENT_STATE` can be used for `to`:

```ts
.addEffect({ exit: Transition.CURRENT_STATE })
```

It is useful to execute an effect without knowing current state.

### Actors

Actors are a way for functions to be injected into machine's runtime. That way, if you have multiple instances of the same machine, each can have its own dedicated of actors.

Actors are set during machine's initialization:

```ts
const runtime = myMachine.run({
  actors: {
    executeSideEffect: () => {
      console.log('My side effect')
    },
  },
});
```

For TypeScript users actors signature is defined in machine's configuration:

```ts
.setTypes({
  ...
  actors: {} as {
    executeSideEffect: () => void, // Actors can return a Promise (that will be properly awaited), and even some result.
  },
})
```

Actor can be called in an action via `invoke` function:

```ts
.addEffect({ ... }, {
  action: ({ invoke }) => invoke('executeSideEffect'),
});
```

Actor's function input is provided to `invoke`, and its result is returned in action chain:

```ts
.setTypes({
  context: {} as {
    value: number,
  },
  actors: {} as {
    multiplyBy2: (value: number) => Promise<{ newValue: boolean }>,
  },
})
.addEffect({ ... }, {
  action: ({ invoke, context }) =>
    invoke('multiplyBy2', context.value)
    .then(({ result, assign }) => assign({ value: result.newValue })),
});
```

## Snapshots / persistence

If a machine's state and context needs to be persisted its *snapshot* can be retrieved, and later restored:

```ts
const snapshot = runtimeBeforeSnapshot.getSnapshot();
const runtimeAfterSnapshot = snapshotMachine.restoreRuntime({ snapshot });
```

## How it compares to xstate

1. Txsm does not have parallel and history states
2. Txsm does not have delayed events, timers etc. as I consider them a bloat. If needed similar thing can be implemented manually by the user using actions.
3. Txsm supports awaitable transitions and performs them in a transactional way. That means if a command is called, and it results in going through multiple states, if at some point execution fails,
it automatically rollbacks to a state from before calling the command. It makes it perfect for backend use.
4. The API is oriented around transitions, not around states. Transitions define what is possible, and which states are achievable. Calling actions and checking guards is just an addition. That leads to machine being much easier to read and reason about.
5. Txsm does not support nested state machines - yet. This is very important feature that I want to implement.
6. Txsm is less fragile when it comes to state machine changes. In xstate when you have a snapshot persisted, changes to a machine definition might very easily lead to a bug. In txsm it is theoretically possible to rebuild entire logic and bring snapshot back to live, as long as the context and the persisted state of a machine is compatible.
7. Many things achievable in xstate should be achievable in txsm in some way. If not - please open an issue.

## License explanation

`txsm` uses LGPLv3 license. It means, that You can:

1. use library in closed-source projects
2. redistribute the code (preserving authorship)
3. make changes to the code

However, if you decide to make changes to the library code, You **have to** publish them under LGPLv3 license.
This way library legally always stays open source and free.

The best way to make changes is to create public fork of the library.

If You don't plan to add any malicious behavior to the library, this license should not be harmful for You in any way.

It is also *expected*, that any plugins (extensions or modules) added to library, are respecting final user freedom,
and are not spying on his actions performed over such module without his knowledge and approval.

## Development notes / contributing

Txsm doesn't use `scripts` from `package.json`. It instead uses [Just](https://github.com/casey/just) - much more flexible command runner.
Upon installing, `just` you can check available recipes in `justfile` or by running `just --list`.

It also uses [pnpm](https://pnpm.io/) instead of `npm`.

It requires fairly modern Node.js version (at least 21.2.0), because it uses node's test runner and assert library for tests.

During publishing [Nushell](https://www.nushell.sh/) script is used.

## Roadmap/planned features

See [TODO.md](./TODO.md)