// Core tab layout: left-column sections stack beside the right column until it
// ends, then the rest span both columns ("spill over").
//
// Usage: <div class="core" use:spillover={{ keepNarrow: 3 }}>. Direct children
// are the left items in order plus one `.core-right` column. Runs only while
// the container is a grid (desktop and print); on small screens it clears itself.

export interface SpilloverOptions {
  /** How many leading left items always stay in the left column. */
  keepNarrow: number;
}

export function spillover(node: HTMLElement, options: SpilloverOptions) {
  let opts = options;

  function parts() {
    const right = node.querySelector<HTMLElement>(':scope > .core-right');
    const items = [...node.children].filter((el): el is HTMLElement => el instanceof HTMLElement && el !== right);
    return { right, items };
  }

  function clear() {
    const { right, items } = parts();
    node.style.gridTemplateRows = '';
    if (right) right.style.gridRow = '';
    for (const el of items) {
      el.style.gridRow = '';
      el.classList.remove('core-wide');
    }
  }

  // Synchronous on purpose: measuring the all-narrow layout and applying the
  // result happens inside one callback, before paint, so nothing flickers.
  function layout() {
    const { right, items } = parts();
    if (!right || getComputedStyle(node).display !== 'grid') return clear();
    items.forEach((el, i) => {
      el.classList.remove('core-wide');
      el.style.gridRow = String(i + 1);
    });
    right.style.gridRow = `1 / span ${items.length}`;
    node.style.gridTemplateRows = '';

    const gap = parseFloat(getComputedStyle(node).rowGap) || 0;
    const target = right.offsetHeight;
    let k = items.length;
    let stacked = 0;
    for (let i = 0; i < items.length; i++) {
      stacked += items[i].offsetHeight + (i ? gap : 0);
      if (i + 1 >= opts.keepNarrow && stacked >= target) {
        k = i + 1;
        break;
      }
    }
    items.forEach((el, i) => el.classList.toggle('core-wide', i >= k));
    right.style.gridRow = `1 / span ${k}`;
    // The last narrow row absorbs any extra right-column height, so no gaps open between left items.
    node.style.gridTemplateRows = `${'auto '.repeat(k - 1)}minmax(auto, 1fr)`;
  }

  const ro = new ResizeObserver(layout);
  const observe = () => {
    ro.disconnect();
    ro.observe(node);
    for (const el of node.querySelectorAll(':scope > *, :scope > .core-right > *')) ro.observe(el);
  };
  observe();
  // Sections can appear or disappear (hidden in config): re-observe and re-layout.
  const mo = new MutationObserver(() => {
    observe();
    layout();
  });
  mo.observe(node, { childList: true, subtree: false });
  const print = matchMedia('print');
  print.addEventListener('change', layout);
  addEventListener('beforeprint', layout);

  return {
    update(next: SpilloverOptions) {
      opts = next;
      layout();
    },
    destroy() {
      ro.disconnect();
      mo.disconnect();
      print.removeEventListener('change', layout);
      removeEventListener('beforeprint', layout);
      clear();
    },
  };
}
