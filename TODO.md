# TODO

- [x] handle final state
- [ ] add snapshot support
- [x] add descriptive errors
- [x] handle effects (guards)
- [ ] add more tests to effects (guards)
- [ ] handle effects (actions)
- [ ] handle hooks
- [ ] add history of states and operations
- [ ] (optionally) detect loop of automated transitions
- [ ] validate if final state doesn't have automated transition from it (execution stops there, but validation might help debugging) 
- [ ] (requires snapshots) add rollback
- [ ] handle picking a transition that matches a guard