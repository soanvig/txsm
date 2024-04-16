import deepClone from '../helpers/deepClone.mjs';
import { type Command, type HistorySnapshot } from './types.mjs';

export type HistoryEntry =
  | { type: 'state', state: string, date: number }
  | { type: 'command', command: Command, date: number };

export class History {
  constructor (
    protected entries: HistoryEntry[],
  ) {}

  public saveState (state: string): this {
    this.entries.push({
      type: 'state',
      state,
      date: Date.now(),
    });

    return this;
  }

  public saveCommand (command: Command): this {
    this.entries.push({
      type: 'command',
      command,
      date: Date.now(),
    });

    return this;
  }

  public getSnapshot (): HistorySnapshot {
    return {
      entries: deepClone(this.entries),
    };
  }

  public static create (): History {
    return new History([]);
  }

  public static restore (snapshot: HistorySnapshot): History {
    const history = new History(
      snapshot.entries,
    );

    return history;
  }
}
