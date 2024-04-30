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

## Transitions

## Effects

Effects are run when transition happens, a state is entered or a state if exited.

When adding an effect user must first decide *when* it should trigger:

```ts
.addEffect({ from: 'stateName', to: 'stateName' }, ...)
.addEffect({ enter: 'stateName' }, ...)
.addEffect({ exit: 'stateName' }, ...)
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

Guard describes whether the effect should be triggered. **Guard on an effect additionaly might prevent transition from happening** if guard condition is not met.
Actions can invoke [Actors](#actors), update context, call any function (even an async one). In future its capabilities will be expanded.

All states defined in an effect need to match available states (therefore configured transitions). Transition effect (`from/to`) has to describe correct transition (all available transition are narrowed down using `from`).
Typescript will help a user with that.

Additionaly, if the effect is configured for a transition (`from/to`), and a transition is triggered using a command (`with` in transition definition), the command will be available both in guard and action.
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
**Guard on an transition effect additionaly might prevent transition from happening** if guard condition is not met.

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