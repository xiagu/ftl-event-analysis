export function isDefined<T>(): (value: T|null|undefined) => value is T {
  return (value: T|null|undefined): value is T => !!value;
}
