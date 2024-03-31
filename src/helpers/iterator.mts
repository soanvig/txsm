/**
 * This modifies iterator, because it calls next function on it.
 */
export const asyncIterate = async <T, N>(iterator: AsyncIterator<T, void, N>, initial: NoInfer<N>, cb: (v: T) => NoInfer<N>) => {
  const result = await iterator.next(initial);

  if (result.done) {
    return;
  }

  await asyncIterate(iterator, cb(result.value), cb);
};