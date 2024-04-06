export enum ErrorCode {
  NotPending,
  NotStopped,
  NoTransition,
  TransitionIncorrectState,
  IsRunning,
  SnapshotStateInvalid,
  SnapshotStatusInvalid,
}

export class MachineError extends Error {
  constructor (
    code: ErrorCode,
    details: Record<string, string | number>,
  ) {
    super(`Machine error: ${ErrorCode[code]} (e${code}). Details=${JSON.stringify(details)}`);
  }
}
