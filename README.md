# Txsm

Transactional state machines for backend solutions.

## Requirements

- [x] Awaitable transitions (support for async operations across the functionality)
- [x] Multiple transitions from state with one event via guards
- [x] Persistance and restoration
- [x] Actions (side effects) on transitions
- [x] Ability to provide actions implementation separately from the machine definition
- [ ] Recursive structure (as a part of state another state machine can be spawned in the same system)
- [x] Root transitions
- [x] Full TypeScript support
- [ ] Event premature checks with minimal overhead (not like xstate which requires full machine to be ready)
- [ ] Full event checks with running guards
- [ ] State history
- [ ] Snapshots of all machines in the system
- [x] Initial and final states
- [ ] Unit testing helper
- [?] History states as in xstate (automatically go back to state in history)
- [?] SCXML support

## Better than xstate

- Due to clear DSL states and transitions between states are readable without implementation details clutter.
- Whenever promise is encountered (let it be guard, side-effect action, or any other supported feature) it is automatically properly awaited.
- Complete machine definition is divided into sections, each responsible for providing a feature. While xstate is oriented around state nodes, txsm is oriented more around transitions.
- Due to its transactional nature whenever during transition (or during multiple transitions with intermediate states) txsm rollbacks to the state it started from when an error is encountered at any moment.
- Complete history is tracked automatically (traversed states, events sent)

## Worse than xstate

- Syntax is less flexible
- (probably) No concept of "history" states
- No Hierarchical state nodes
- No parallel state nodes (triggering multiple side-effects in parallel might be possible)
- No built-in timers, delayed events and delayed transitions (this would be bloat, can be implemented manually)
