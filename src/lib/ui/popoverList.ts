/** Position a fixed, top-layer list under (or above) its trigger, kept inside the viewport. */
export function placeList(anchor: HTMLElement, list: HTMLElement) {
  const r = anchor.getBoundingClientRect();
  list.style.minWidth = `${r.width}px`;
  list.style.left = `${Math.max(4, Math.min(r.left, innerWidth - list.offsetWidth - 4))}px`;
  // Below the trigger, or above it when there isn't room.
  const below = innerHeight - r.bottom;
  list.style.top = below < list.offsetHeight + 8 && r.top > below ? `${r.top - list.offsetHeight - 2}px` : `${r.bottom + 2}px`;
}

/**
 * What a scroll means for an open list: 'place' when the trigger was just scrolled into
 * view (follow it), 'hide' for any other scroll of the page or a container holding the
 * trigger, null for scrolls inside the list or elsewhere.
 */
export function scrollAction(e: Event, anchor: HTMLElement, list: HTMLElement, openedAt: number): 'place' | 'hide' | null {
  const t = e.target as Node;
  if (list.contains(t) || !(t === document || t.contains(anchor))) return null;
  return Date.now() - openedAt < 250 ? 'place' : 'hide';
}

/** Scroll an option into view within its list only (scrollIntoView would also scroll the page, which closes the list). */
export function revealInList(list: HTMLElement, el: HTMLElement | null) {
  if (!el) return;
  const l = list.getBoundingClientRect();
  const r = el.getBoundingClientRect();
  if (r.top < l.top) list.scrollTop -= l.top - r.top;
  else if (r.bottom > l.bottom) list.scrollTop += r.bottom - l.bottom;
}
