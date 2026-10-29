// Action that makes a displayed number roll d20 + itself when clicked. It adds
// no text, so screenshots, print and the checks that read stat text are unchanged.
import type { Action } from 'svelte/action';
import { fmt } from '../ui/format';
import { roll } from './rolls.svelte';
import type { RollPart } from './roll';

export interface RollableOptions {
  title: string;
  bonus: number;
  parts?: RollPart[];
  /** Die to roll (default d20). */
  sides?: number;
  subtitle?: string;
  disabled?: boolean;
}

export const rollable: Action<HTMLElement, RollableOptions> = (node, opts) => {
  let current = opts;
  const apply = () => {
    const on = !current.disabled;
    node.classList.toggle('rollable', on);
    if (on) {
      node.setAttribute('role', 'button');
      node.setAttribute('tabindex', '0');
      node.setAttribute('aria-label', `Roll ${current.title}`);
      node.title = `Roll ${current.title}`;
    } else {
      node.removeAttribute('role');
      node.removeAttribute('tabindex');
      node.removeAttribute('aria-label');
      node.removeAttribute('title');
    }
  };
  const fire = (e: Event) => {
    if (current.disabled) return;
    e.preventDefault();
    e.stopPropagation();
    void roll({ title: current.title, subtitle: current.subtitle, notation: `1d${current.sides ?? 20}${fmt(current.bonus)}`, parts: current.parts });
  };
  const key = (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') fire(e);
  };
  node.addEventListener('click', fire);
  node.addEventListener('keydown', key);
  apply();
  return {
    update(next) {
      current = next;
      apply();
    },
    destroy() {
      node.removeEventListener('click', fire);
      node.removeEventListener('keydown', key);
    },
  };
};
