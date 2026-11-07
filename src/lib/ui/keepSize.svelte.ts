// Textareas keep the height the user drags them to, per character. Heights are
// saved under "<section>:<key>" in ui.textSizes; the section header's reset
// button clears them. Typing never saves anything: only a drag that changes
// the height does.
import type { Action } from 'svelte/action';
import { app } from '../state.svelte';

/** Storage key for a textarea: its section id and the caller's key (item id + field). */
const fullKey = (node: HTMLElement, key: string) => `${node.closest('[data-section]')?.getAttribute('data-section') ?? 'page'}:${key}`;

export const keepSize: Action<HTMLTextAreaElement, string> = (node, key) => {
  let current = $state(key);
  $effect(() => {
    const h = app.char.ui.textSizes[fullKey(node, current)];
    node.style.height = h ? `${h}px` : '';
    node.style.width = '';
  });
  let start = 0;
  const up = () => {
    window.removeEventListener('pointerup', up);
    const h = node.offsetHeight;
    // Only the height is kept; a sideways drag would break the layout.
    node.style.width = '';
    if (start && h !== start) app.char.ui.textSizes[fullKey(node, current)] = h;
    start = 0;
  };
  const down = () => {
    start = node.offsetHeight;
    window.addEventListener('pointerup', up);
  };
  node.addEventListener('pointerdown', down);
  return {
    update(next) {
      current = next;
    },
    destroy() {
      node.removeEventListener('pointerdown', down);
      window.removeEventListener('pointerup', up);
    },
  };
};

/** Whether any textarea in a section has a saved size. */
export const hasSavedSizes = (sectionId: string) => Object.keys(app.char.ui.textSizes).some((k) => k.startsWith(`${sectionId}:`));

/** Back to each textarea's default height in one section. */
export function resetSizes(sectionId: string) {
  const sizes = app.char.ui.textSizes;
  for (const k of Object.keys(sizes)) if (k.startsWith(`${sectionId}:`)) delete sizes[k];
}
