# TODO

## Functionality

- [x] handle final state
- [x] handle effects (guards)
- [x] handle update context action
- [x] handle effects (actions)
- [x] handle hooks
- [x] handle picking a transition that matches a guard
- [x] add snapshot support
- [x] add rollback
- [x] handle command in effects actions
- [x] handle command in effects guards
- [x] add history of states and operations
- [ ] handle nested machines
- [ ] handle checking if an command can be executed (with or without guards)
- [ ] list all commands that can be executed

## Tests

- [x] test proper context merging in assign actions
- [ ] add more tests to effects (guards)
- [ ] add more tests to actions
- [ ] add more tests to hooks
- [ ] test guards, actions and actors throwing
- [ ] test rollback on different things than actions (however that might be not necessary, because everything necessary in start/execute is wrapped in transaction)
- [ ] test history

## Validation

- [ ] (optionally) detect loop of automated transitions
- [ ] validate if final state doesn't have automated transition from it (execution stops there, but validation might help debugging) 
- [ ] validate if there is only one effect per transition
- [ ] validate if provided snapshot matches state machine (state mostly, because we can't check context)

## Chores

- [x] add descriptive errors
- [ ] (optionally) freeze context before passing it down to the guards, actions, etc
