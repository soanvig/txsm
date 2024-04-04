# TODO

## Functionality

- [x] handle final state
- [x] handle effects (guards)
- [x] handle update context action
- [x] handle effects (actions)
- [x] handle hooks
- [x] handle picking a transition that matches a guard
- [x] add snapshot support
- [ ] handle nested machines
- [ ] add history of states and operations
- [ ] handle event in effects and hooks

## Tests

- [x] test proper context merging in assign actions
- [ ] add more tests to effects (guards)
- [ ] add more tests to actions
- [ ] add more tests to hooks
- [ ] test guards, actions and actors throwing
- [ ] add rollback - using snapshot OR create a copy of machine runtime under the hood, that will execute the code

## Validation

- [ ] (optionally) detect loop of automated transitions
- [ ] validate if final state doesn't have automated transition from it (execution stops there, but validation might help debugging) 
- [ ] validate if there is only one effect per transition
- [ ] validate if provided snapshot matches state machine (state mostly, because we can't check context)

## Chores

- [x] add descriptive errors
- [ ] (optionally) freeze context before passing it down to the guards, actions, etc
