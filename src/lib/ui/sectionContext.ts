import { getContext, setContext } from 'svelte';

const KEY = Symbol('section');

/** Shared by a Section with its contents: structural controls show only while editing. */
export interface SectionContext {
  readonly editing: boolean;
}

export const setSectionContext = (ctx: SectionContext) => setContext(KEY, ctx);

/** Edit state of the enclosing section; outside a section everything is editable. */
export const useSection = (): SectionContext => getContext<SectionContext>(KEY) ?? { editing: true };
