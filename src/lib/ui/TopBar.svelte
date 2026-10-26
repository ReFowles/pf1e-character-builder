<script lang="ts">
  import { app } from '../state.svelte';

  const sorted = $derived([...app.roster].sort((a, b) => (a.name || '').localeCompare(b.name || '')));
</script>

<header class="flex flex-wrap items-center gap-2 border-b border-ink/30 bg-paper px-3 py-2 print:hidden">
  <img src="/pf-logo.svg" alt="" class="h-7" />
  <label class="flex items-center gap-1 text-sm">
    <span class="sr-only">Character</span>
    <select
      class="max-w-56 border border-ink/30 py-1"
      value={app.char.id}
      onchange={(e) => app.switchTo(e.currentTarget.value)}
    >
      {#each sorted as r (r.id)}
        <option value={r.id}>{r.name || 'Unnamed character'}</option>
      {/each}
    </select>
  </label>
  <button type="button" class="btn" onclick={() => app.create()}>New</button>
  <button type="button" class="btn" onclick={() => app.duplicate()}>Duplicate</button>
  <button type="button" class="btn" onclick={() => app.remove()}>Delete</button>
  <div class="ml-auto flex flex-wrap gap-2">
    <button type="button" class="btn" onclick={() => app.importJson()}>Import JSON</button>
    <button type="button" class="btn" onclick={() => app.exportJson()}>Export JSON</button>
    <button type="button" class="btn" title="Print, or choose “Save as PDF” in the print dialog" onclick={() => print()}>Print / PDF</button>
    <button type="button" class="btn-primary" onclick={() => (app.configOpen = true)}>Config</button>
  </div>
</header>
