# TODO

## Functionality

- [x] handle final state
- [ ] add snapshot support
- [x] handle effects (guards)
- [x] handle update context action
- [x] handle effects (actions)
- [ ] handle hooks
- [ ] handle nested machines
- [ ] add history of states and operations
- [x] handle picking a transition that matches a guard

## Tests

- [ ] add more tests to effects (guards)
- [ ] add more tests to actions
- [x] test proper context merging in assign actions
- [ ] test guards, actions and actors throwing
- [ ] add rollback - using snapshot OR create a copy of machine runtime under the hood, that will execute the code

## Validation

- [ ] (optionally) detect loop of automated transitions
- [ ] validate if final state doesn't have automated transition from it (execution stops there, but validation might help debugging) 
- [ ] validate if there is only one effect per transition

## Chores

- [x] add descriptive errors
- [ ] (optionally) freeze context before passing it down to the guards, actions, etc
