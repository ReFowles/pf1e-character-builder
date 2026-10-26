// Pointer-based drag reordering for table rows or list items. Works with mouse
// and touch (HTML5 drag-and-drop doesn't fire on most touch screens).
//
// Usage: <tbody use:sortable={{ onmove: (from, to) => ... }}>, rows carry
// data-sort-index, and a handle inside each row carries data-sort-handle.

export interface SortableOptions {
  onmove: (from: number, to: number) => void;
}

export function sortable(node: HTMLElement, options: SortableOptions) {
  let opts = options;
  let from = -1;

  const indexAt = (x: number, y: number) => {
    const el = document.elementFromPoint(x, y)?.closest<HTMLElement>('[data-sort-index]');
    return el && node.contains(el) ? Number(el.dataset.sortIndex) : -1;
  };

  function down(e: PointerEvent) {
    const handle = (e.target as HTMLElement).closest('[data-sort-handle]');
    const row = handle?.closest<HTMLElement>('[data-sort-index]');
    if (!handle || !row) return;
    e.preventDefault();
    from = Number(row.dataset.sortIndex);
    node.setPointerCapture(e.pointerId);
    node.classList.add('sorting');
  }

  function move(e: PointerEvent) {
    if (from < 0) return;
    const to = indexAt(e.clientX, e.clientY);
    if (to >= 0 && to !== from) {
      opts.onmove(from, to);
      from = to;
    }
  }

  function up(e: PointerEvent) {
    if (from < 0) return;
    from = -1;
    node.releasePointerCapture(e.pointerId);
    node.classList.remove('sorting');
  }

  node.addEventListener('pointerdown', down);
  node.addEventListener('pointermove', move);
  node.addEventListener('pointerup', up);
  node.addEventListener('pointercancel', up);
  return {
    update(next: SortableOptions) {
      opts = next;
    },
    destroy() {
      node.removeEventListener('pointerdown', down);
      node.removeEventListener('pointermove', move);
      node.removeEventListener('pointerup', up);
      node.removeEventListener('pointercancel', up);
    },
  };
}
