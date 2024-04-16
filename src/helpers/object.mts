export const omit = <T extends Record<string, any>, K extends keyof T>(obj: T, key: K): Omit<T, K> => {
  const { [key]: omitted, ...rest } = obj;

  return rest;
};