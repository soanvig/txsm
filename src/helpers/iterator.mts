/**
 * This modifies iterator, because it calls next function on it.
 */
export const asyncFeedbackIterate = async <T, N>(iterator: AsyncGenerator<T, void, N>, cb: (v: T) => NoInfer<N> | Promise<NoInfer<N>>) => {
  let result = await iterator.next();

  while (result.done === false) {
    result = await iterator.next(await cb(result.value));
  }
};

/**
 * This modifies iterator, because it calls next function on it.
 */
export const feedbackIterate = <T, N>(iterator: Iterator<T, void, N>, cb: (v: T) => NoInfer<N>) => {
  let result = iterator.next();

  while (result.done === false) {
    result = iterator.next(cb(result.value));
  }
};

/**
 * This modifies iterator, because it calls next function on it.
 * Also it finishes iterator
 */
export const first = async <T, >(iterator: AsyncIterator<T, any, any>): Promise<T | null> => {
  const result = await iterator.next();

  if (iterator.return) {
    iterator.return();
  }

  if (result.done === false && result.value !== undefined) {
    return result.value;
  } else {
    return null;
  }
};