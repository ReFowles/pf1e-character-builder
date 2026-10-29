<script lang="ts">
  import { onDestroy, untrack } from 'svelte';
  import { app } from '../../lib/state.svelte';
  import Section from '../../lib/ui/Section.svelte';
  import type { Editor } from './editor';
  import Bold from '@lucide/svelte/icons/bold';
  import Italic from '@lucide/svelte/icons/italic';
  import Underline from '@lucide/svelte/icons/underline';
  import Strikethrough from '@lucide/svelte/icons/strikethrough';
  import Heading1 from '@lucide/svelte/icons/heading-1';
  import Heading2 from '@lucide/svelte/icons/heading-2';
  import Heading3 from '@lucide/svelte/icons/heading-3';
  import List from '@lucide/svelte/icons/list';
  import ListOrdered from '@lucide/svelte/icons/list-ordered';
  import ListTodo from '@lucide/svelte/icons/list-todo';
  import TextQuote from '@lucide/svelte/icons/text-quote';
  import Minus from '@lucide/svelte/icons/minus';
  import Link from '@lucide/svelte/icons/link';
  import Table from '@lucide/svelte/icons/table';
  import BetweenHorizontalEnd from '@lucide/svelte/icons/between-horizontal-end';
  import BetweenVerticalEnd from '@lucide/svelte/icons/between-vertical-end';
  import Rows3 from '@lucide/svelte/icons/rows-3';
  import Columns3 from '@lucide/svelte/icons/columns-3';
  import Grid2x2X from '@lucide/svelte/icons/grid-2x2-x';
  import Undo2 from '@lucide/svelte/icons/undo-2';
  import Redo2 from '@lucide/svelte/icons/redo-2';

  let host: HTMLDivElement;
  let editor = $state<Editor | null>(null);
  // Bumped on every transaction so the toolbar's active states re-evaluate.
  let tick = $state(0);
  /** HTML as TipTap re-serialises it (schema-filtered), used for the printed copy. */
  let printHtml = $state('');

  $effect(() => {
    let cancelled = false;
    import('./editor').then(({ createEditor }) => {
      if (cancelled) return;
      const ed = createEditor(host, app.char.notes.html, (html) => {
        app.char.notes.html = html;
        printHtml = html;
      });
      ed.on('transaction', () => tick++);
      printHtml = ed.getHTML();
      editor = ed;
    });
    return () => {
      cancelled = true;
    };
  });
  // Switching characters swaps the document in place (keyed on the id only, so typing doesn't re-enter here).
  $effect(() => {
    const id = app.char.id;
    const ed = editor;
    if (!ed || !id) return;
    untrack(() => {
      const html = app.char.notes.html;
      // Kept out of the undo history, so Undo can't bring back the previous character's notes.
      if (ed.getHTML() !== html) ed.chain().setMeta('addToHistory', false).setContent(html, { emitUpdate: false }).run();
      printHtml = ed.getHTML();
    });
  });
  onDestroy(() => editor?.destroy());

  const active = (name: string, attrs?: Record<string, unknown>) => {
    void tick;
    return editor?.isActive(name, attrs) ?? false;
  };
  const run = (f: (e: Editor) => void) => () => {
    if (!editor) return;
    f(editor);
    editor.commands.focus();
  };
  function link() {
    if (!editor) return;
    const prev = editor.getAttributes('link').href as string | undefined;
    const url = prompt('Link URL', prev ?? 'https://');
    if (url === null) return;
    if (!url.trim()) editor.chain().focus().unsetLink().run();
    else editor.chain().focus().extendMarkRange('link').setLink({ href: url.trim() }).run();
  }

  type Tool = { icon: typeof Bold; title: string; on: () => void; is?: () => boolean; can?: () => boolean };
  // Each inner list is a group, drawn with a divider between groups.
  const GROUPS: Tool[][] = [
    [
      { icon: Bold, title: 'Bold (⌘B)', on: run((e) => e.chain().toggleBold().run()), is: () => active('bold') },
      { icon: Italic, title: 'Italic (⌘I)', on: run((e) => e.chain().toggleItalic().run()), is: () => active('italic') },
      { icon: Underline, title: 'Underline (⌘U)', on: run((e) => e.chain().toggleUnderline().run()), is: () => active('underline') },
      { icon: Strikethrough, title: 'Strikethrough', on: run((e) => e.chain().toggleStrike().run()), is: () => active('strike') },
    ],
    [
      { icon: Heading1, title: 'Heading 1', on: run((e) => e.chain().toggleHeading({ level: 1 }).run()), is: () => active('heading', { level: 1 }) },
      { icon: Heading2, title: 'Heading 2', on: run((e) => e.chain().toggleHeading({ level: 2 }).run()), is: () => active('heading', { level: 2 }) },
      { icon: Heading3, title: 'Heading 3', on: run((e) => e.chain().toggleHeading({ level: 3 }).run()), is: () => active('heading', { level: 3 }) },
    ],
    [
      { icon: List, title: 'Bullet list', on: run((e) => e.chain().toggleBulletList().run()), is: () => active('bulletList') },
      { icon: ListOrdered, title: 'Numbered list', on: run((e) => e.chain().toggleOrderedList().run()), is: () => active('orderedList') },
      { icon: ListTodo, title: 'Task list', on: run((e) => e.chain().toggleTaskList().run()), is: () => active('taskList') },
    ],
    [
      { icon: TextQuote, title: 'Quote', on: run((e) => e.chain().toggleBlockquote().run()), is: () => active('blockquote') },
      { icon: Minus, title: 'Horizontal rule', on: run((e) => e.chain().setHorizontalRule().run()) },
      { icon: Link, title: 'Link', on: link, is: () => active('link') },
      { icon: Table, title: 'Insert table', on: run((e) => e.chain().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()) },
    ],
  ];
  // Shown while the cursor is in a table. `minus` marks the delete tools with a small minus badge.
  const TABLE_TOOLS: (Tool & { minus?: boolean; danger?: boolean })[] = [
    { icon: BetweenHorizontalEnd, title: 'Add row below', on: run((e) => e.chain().addRowAfter().run()) },
    { icon: BetweenVerticalEnd, title: 'Add column after', on: run((e) => e.chain().addColumnAfter().run()) },
    { icon: Rows3, title: 'Delete row', on: run((e) => e.chain().deleteRow().run()), minus: true },
    { icon: Columns3, title: 'Delete column', on: run((e) => e.chain().deleteColumn().run()), minus: true },
    { icon: Grid2x2X, title: 'Delete table', on: run((e) => e.chain().deleteTable().run()), danger: true },
  ];
  const HISTORY: Tool[] = [
    { icon: Undo2, title: 'Undo (⌘Z)', on: run((e) => e.chain().undo().run()), can: () => (void tick, editor?.can().undo() ?? false) },
    { icon: Redo2, title: 'Redo (⇧⌘Z)', on: run((e) => e.chain().redo().run()), can: () => (void tick, editor?.can().redo() ?? false) },
  ];
</script>

{#snippet button(t: Tool & { minus?: boolean; danger?: boolean })}
  <button
    type="button"
    class={['icon-btn relative size-7', { 'bg-ink/15': t.is?.(), 'text-accent': t.danger }]}
    title={t.title}
    aria-label={t.title}
    aria-pressed={t.is ? t.is() : undefined}
    disabled={!editor || (t.can && !t.can())}
    onclick={t.on}
  >
    <t.icon size={16} aria-hidden="true" />
    {#if t.minus}<Minus size={10} strokeWidth={3} class="absolute right-0.5 bottom-0.5 rounded-full bg-paper text-accent" aria-hidden="true" />{/if}
  </button>
{/snippet}

<Section id="notes" title="Campaign Notes">
  {#snippet info()}
    <p>One big page for session notes, NPCs, loot and plans. Formatting: bold, italic, headings, lists, task lists, quotes, links and tables; Markdown shortcuts work too (<code>#</code>, <code>-</code>, <code>1.</code>, <code>[ ]</code>, <code>**bold**</code>).</p>
    <p>Notes are saved with the character and stay out of the printed sheet unless you turn on the Notes tab under Settings → Layout &amp; print.</p>
  {/snippet}
  <div class="flex flex-wrap items-center gap-y-0.5 border-b border-ink/20 pb-1 print:hidden" role="toolbar" aria-label="Formatting">
    {#each GROUPS as g, i (i)}
      <div class={['flex gap-0.5', { 'ml-1 border-l border-ink/20 pl-1': i > 0 }]} role="group">
        {#each g as t (t.title)}{@render button(t)}{/each}
      </div>
    {/each}
    {#if editor && active('table')}
      <div class="ml-1 flex gap-0.5 border-l border-ink/20 pl-1" role="group" aria-label="Table">
        {#each TABLE_TOOLS as t (t.title)}{@render button(t)}{/each}
      </div>
    {/if}
    <div class="ml-auto flex gap-0.5 pl-2" role="group" aria-label="History">
      {#each HISTORY as t (t.title)}{@render button(t)}{/each}
    </div>
  </div>
  <div bind:this={host} class="notes-host print:hidden"></div>
  <!-- Printed copy: TipTap re-serialised the stored HTML through its schema, so only known tags remain. -->
  <div class="notes-prose hidden print:block">{@html printHtml}</div>
</Section>
