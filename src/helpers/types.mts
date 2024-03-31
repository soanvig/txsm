export type ArrayValue<T> = T extends Array<infer V> | ReadonlyArray<infer V>
  ? V
  : never;

export type MaybePromise<T> = T | Promise<T>;
export type EnsurePromise<T> = T extends Promise<any> ? T : Promise<T>;
export type UnwrapPromise<T> = T extends Promise<infer R> ? R : T;