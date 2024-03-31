export const findMap = <T, U>(arr: T[], cb: (item: T) => U): Exclude<U, null | undefined | false> | null => {
  for (const item of arr) {
    const found = cb(item);

    if (found !== null && found !== false && found !== undefined) {
      return found as Exclude<U, null | undefined | false>;
    }
  }

  return null;
};