/** The list with `x` removed if present, otherwise appended (checkbox-style membership). */
export const toggle = <T>(list: readonly T[], x: T): T[] => (list.includes(x) ? list.filter((y) => y !== x) : [...list, x]);

/** Move the item at `from` to `to`, in place; out-of-range positions are ignored. */
export function moveItem<T>(list: T[], from: number, to: number): void {
  if (from === to || from < 0 || to < 0 || from >= list.length || to >= list.length) return;
  const [x] = list.splice(from, 1);
  list.splice(to, 0, x);
}
