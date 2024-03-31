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