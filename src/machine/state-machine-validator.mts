import { ErrorCode, MachineError } from './errors.mjs';
import { type AnyStateMachine } from './types.mjs';

/**
 * Validate state machine.
 * Throws an error if something is invalid
 */
export const validateStateMachine = (stateMachine: AnyStateMachine): void => {
  validateEffects(stateMachine);
};

const validateEffects = (stateMachine: AnyStateMachine): void => {
  // Validate if any of the transition effects duplicates
  for (const effect of stateMachine.$effects) {
    if (stateMachine.$effects.some(e => effect.isSameTransition(e))) {
      throw new MachineError(ErrorCode.DuplicatedEffect, effect.condition);
    }
  }
};