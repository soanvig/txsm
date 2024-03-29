export type TrsnObject = {
  from: string;
  to: string;
}

export type NamedTrsnObject = {
  from: string;
  to: string;
  with: string;
}

export type AnyTrsnObject = TrsnObject | NamedTrsnObject;
