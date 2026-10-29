/** Position a fixed, top-layer list under (or above) its trigger, kept inside the viewport. */
export function placeList(anchor: HTMLElement, list: HTMLElement) {
  const r = anchor.getBoundingClientRect();
  list.style.minWidth = `${r.width}px`;
  list.style.left = `${Math.max(4, Math.min(r.left, innerWidth - list.offsetWidth - 4))}px`;
  // Below the trigger, or above it when there isn't room.
  const below = innerHeight - r.bottom;
  list.style.top = below < list.offsetHeight + 8 && r.top > below ? `${r.top - list.offsetHeight - 2}px` : `${r.bottom + 2}px`;
}
