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
- [x] handle checking if an command can be executed (with or without guards)
- [x] list all commands that can be accepted
- [ ] (next) handle nested machines - probably it will be better to have "machine system" that will intertwine two machines together
- [ ] (next) store more information on history (like context changes and actors invocation)
- [ ] (next) add system for emitting internal events a user can subscribe to
- [?] SCXML support
- [?] Unit testing helper

## Documentation

- [ ] document state machine and runtime API using comments
- [ ] README
  - [x] how to install
  - [x] quick start
  - [ ] transitions, any transition
  - [ ] setTypes: context, commands
  - [ ] effects/actions
  - [ ] effects/guards
  - [ ] effects/any state/any transition
  - [ ] actors
  - [ ] development notes
  - [ ] add license clarification

## Tests

- [x] test proper context merging in assign actions
- [x] test guards, actions and actors throwing
- [x] test history
- [x] test `canAcceptCommand`
- [x] test `canExecuteCommand`
- [?] add more tests to effects (guards)
- [?] add more tests to actions
- [?] add more tests to hooks 
- [?] test rollback on different things than actions (however that might be not necessary, because everything necessary in start/execute is wrapped in transaction)

## Typing

- [ ] make `.run` input more strict so it cannot contain not-expected fields, context fields and actors (currently it requires what is required, but accepts other things as well)

## Validation

- [x] validate if provided snapshot matches state machine (state mostly, because we can't check context)
- [x] validate if there is only one effect per transition
- [ ] validate if an effect configuration matches available transitions
- [?] detect loop of automated transitions
- [?] validate if final state doesn't have automated transition from it (execution stops there, but validation might help debugging) 

## Chores

- [x] add descriptive errors
- [x] unify `canAcceptCommand`, `canExecuteCommand` and `execute` checks
- [x] partial .setTypes
- [x] change architecture: create transition planner (generator) which results will be passed to executor which uses action as generator etc (everything will happen step by step)
- [ ] CI
  - [x] test pipeline
  - [ ] release and versioning pipeline
- [x] freeze context before passing it down to the guards, actions, etc
- [x] unify hooks and effects into single thing
- [ ] work on proper exports from index file, and proper packaging
