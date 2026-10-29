import { getContext, setContext } from 'svelte';

const KEY = Symbol('section');

/** Shared by a Section with its contents: structural controls show only while editing. */
export interface SectionContext {
  readonly editing: boolean;
  /** The section has an Edit toggle (so "use ✎ to add" hints make sense). */
  readonly editable: boolean;
}

export const setSectionContext = (ctx: SectionContext) => setContext(KEY, ctx);

/** Edit state of the enclosing section; outside a section everything is editable. */
export const useSection = (): SectionContext => getContext<SectionContext>(KEY) ?? { editing: true, editable: false };
