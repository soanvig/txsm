import { type Command, type HistorySnapshot } from './types.mjs';

export class History {
  constructor (
    protected states: string[],
    protected commands: Command[],
  ) {}

  public saveState (state: string): this {
    this.states.push(state);

    return this;
  }

  public saveCommand (command: Command): this {
    this.commands.push(command);

    return this;
  }

  public getSnapshot (): HistorySnapshot {
    return {
      commands: this.commands,
      states: this.states,
    };
  }

  public static create (): History {
    return new History([], []);
  }

  public static restore (snapshot: HistorySnapshot): History {
    const history = new History(
      snapshot.states,
      snapshot.commands,
    );

    return history;
  }
}
