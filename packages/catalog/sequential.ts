export async function sequential<T>(values: Iterable<T>, operation: (value: T) => Promise<void>) {
  await Array.from(values).reduce(async (previous, value) => {
    await previous;
    await operation(value);
  }, Promise.resolve());
}
