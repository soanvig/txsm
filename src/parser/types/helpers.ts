/** string -> string[] */
export type Split<T extends string> = T extends `${infer V}${infer Rest}`
  ? [V, ...Split<Rest>]
  : [];

/** string[] -> string */
export type Concat<T extends string[]> = T extends [infer V extends string, ...infer Rest extends string[]]
  ? `${V}${Concat<Rest>}`
  : ''

/** [...(key, value)] -> { key: value } */
export type ListToObject<T extends any[]> = T extends [infer K extends string, ...infer Rest extends any[]]
  ? Rest extends [infer V extends any, ...infer Rest2 extends string[]]
    ? { [k in K]: V } & ListToObject<Rest2>
    : never
  : {};

// helper that enforces a constraint on an `infer T` type
export type Is<T extends U, U> = T;