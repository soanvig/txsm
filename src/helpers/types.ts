export type ArrayValue<T> = T extends Array<infer V> | ReadonlyArray<infer V>
  ? V
  : never;
