export enum ErrorCode {
  NotPending,
  NotStopped,
  NoTransition,
  TransitionIncorrectState,
}

export class MachineError extends Error {
  constructor (
    code: ErrorCode,
    details: Record<string, string | number>,
  ) {
    super(`Machine error: ${ErrorCode[code]} (e${code}). Details=${JSON.stringify(details)}`);
  }
}