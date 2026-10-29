<script lang="ts">
  import { onDestroy, untrack } from 'svelte';
  import { app } from '../../lib/state.svelte';
  import Section from '../../lib/ui/Section.svelte';
  import type { Editor } from './editor';

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
      if (ed.getHTML() !== html) ed.commands.setContent(html, { emitUpdate: false });
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

  const TOOLS: { label: string; title: string; on: () => void; is?: () => boolean; class?: string }[] = [
    { label: 'B', title: 'Bold (⌘B)', on: run((e) => e.chain().toggleBold().run()), is: () => active('bold'), class: 'font-bold' },
    { label: 'I', title: 'Italic (⌘I)', on: run((e) => e.chain().toggleItalic().run()), is: () => active('italic'), class: 'italic' },
    { label: 'U', title: 'Underline (⌘U)', on: run((e) => e.chain().toggleUnderline().run()), is: () => active('underline'), class: 'underline' },
    { label: 'S', title: 'Strikethrough', on: run((e) => e.chain().toggleStrike().run()), is: () => active('strike'), class: 'line-through' },
    { label: 'H1', title: 'Heading 1', on: run((e) => e.chain().toggleHeading({ level: 1 }).run()), is: () => active('heading', { level: 1 }) },
    { label: 'H2', title: 'Heading 2', on: run((e) => e.chain().toggleHeading({ level: 2 }).run()), is: () => active('heading', { level: 2 }) },
    { label: 'H3', title: 'Heading 3', on: run((e) => e.chain().toggleHeading({ level: 3 }).run()), is: () => active('heading', { level: 3 }) },
    { label: '•', title: 'Bullet list', on: run((e) => e.chain().toggleBulletList().run()), is: () => active('bulletList') },
    { label: '1.', title: 'Numbered list', on: run((e) => e.chain().toggleOrderedList().run()), is: () => active('orderedList') },
    { label: '☑', title: 'Task list', on: run((e) => e.chain().toggleTaskList().run()), is: () => active('taskList') },
    { label: '❝', title: 'Quote', on: run((e) => e.chain().toggleBlockquote().run()), is: () => active('blockquote') },
    { label: '—', title: 'Horizontal rule', on: run((e) => e.chain().setHorizontalRule().run()) },
    { label: '🔗', title: 'Link', on: link, is: () => active('link') },
    { label: '▦', title: 'Insert table', on: run((e) => e.chain().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()) },
    { label: '↶', title: 'Undo (⌘Z)', on: run((e) => e.chain().undo().run()) },
    { label: '↷', title: 'Redo (⇧⌘Z)', on: run((e) => e.chain().redo().run()) },
  ];
</script>

<Section id="notes" title="Campaign Notes">
  {#snippet info()}
    <p>One big page for session notes, NPCs, loot and plans. Formatting: bold, italic, headings, lists, task lists, quotes, links and tables; Markdown shortcuts work too (<code>#</code>, <code>-</code>, <code>1.</code>, <code>[ ]</code>, <code>**bold**</code>).</p>
    <p>Notes are saved with the character and stay out of the printed sheet unless you turn on the Notes tab under Settings → Layout &amp; print.</p>
  {/snippet}
  <div class="flex flex-wrap gap-0.5 border-b border-ink/20 pb-1 print:hidden" role="toolbar" aria-label="Formatting">
    {#each TOOLS as t (t.title)}
      <button type="button" class={['icon-btn min-w-6 px-1 text-sm', t.class, { 'bg-ink/15': t.is?.() }]} title={t.title} aria-label={t.title} aria-pressed={t.is ? t.is() : undefined} disabled={!editor} onclick={t.on}>{t.label}</button>
    {/each}
    {#if editor && active('table')}
      <span class="mx-1 opacity-40">|</span>
      <button type="button" class="icon-btn px-1 text-xs whitespace-nowrap" title="Add row below" onclick={run((e) => e.chain().addRowAfter().run())}>+row</button>
      <button type="button" class="icon-btn px-1 text-xs whitespace-nowrap" title="Add column after" onclick={run((e) => e.chain().addColumnAfter().run())}>+col</button>
      <button type="button" class="icon-btn px-1 text-xs whitespace-nowrap" title="Delete row" onclick={run((e) => e.chain().deleteRow().run())}>−row</button>
      <button type="button" class="icon-btn px-1 text-xs whitespace-nowrap" title="Delete column" onclick={run((e) => e.chain().deleteColumn().run())}>−col</button>
      <button type="button" class="icon-btn px-1 text-xs whitespace-nowrap text-accent" title="Delete table" onclick={run((e) => e.chain().deleteTable().run())}>✕ table</button>
    {/if}
  </div>
  <div bind:this={host} class="notes-host print:hidden"></div>
  <!-- Printed copy: TipTap re-serialised the stored HTML through its schema, so only known tags remain. -->
  <div class="notes-prose hidden print:block">{@html printHtml}</div>
</Section>
