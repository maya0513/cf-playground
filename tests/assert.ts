export function required<T>(value: T | undefined | null): T {
  if (value === undefined || value === null) throw new Error("fixture value is missing");
  return value;
}
