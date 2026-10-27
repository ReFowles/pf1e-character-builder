<script lang="ts">
  import { app } from '../../lib/state.svelte';

  interface Props {
    portrait: string | null;
    name: string;
  }
  let { portrait = $bindable(), name }: Props = $props();
  let input: HTMLInputElement;
  let dragOver = $state(false);

  // Centre-cropped to 3:4 and kept small (300×400) so saved characters stay light.
  function pick(file: File | undefined) {
    if (!file || !file.type.startsWith('image/')) {
      if (file) app.notify('That file is not an image.');
      return;
    }
    const el = new Image();
    el.onload = () => {
      const W = 300;
      const H = 400;
      const scale = Math.max(W / el.naturalWidth, H / el.naturalHeight);
      const canvas = document.createElement('canvas');
      canvas.width = W;
      canvas.height = H;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, W, H);
      ctx.drawImage(el, (W - el.naturalWidth * scale) / 2, (H - el.naturalHeight * scale) / 2, el.naturalWidth * scale, el.naturalHeight * scale);
      portrait = canvas.toDataURL('image/jpeg', 0.85);
      URL.revokeObjectURL(el.src);
    };
    el.src = URL.createObjectURL(file);
  }
</script>

<div
  class={['group relative aspect-[3/4] w-24 shrink-0 overflow-hidden rounded-sm border border-ink/30 bg-parchment', { 'ring-2 ring-accent': dragOver }]}
  role="group"
  aria-label="Portrait of {name || 'companion'}. Drop an image here to upload."
  ondragover={(e) => {
    e.preventDefault();
    dragOver = true;
  }}
  ondragleave={() => (dragOver = false)}
  ondrop={(e) => {
    e.preventDefault();
    dragOver = false;
    pick(e.dataTransfer?.files[0]);
  }}
>
  {#if portrait}
    <img src={portrait} alt="Portrait of {name || 'companion'}" class="size-full object-cover" />
    <div class="absolute inset-x-0 bottom-0 flex justify-center gap-1 bg-ink/60 p-0.5 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100 max-md:opacity-100 print:hidden">
      <button type="button" class="icon-btn size-5 text-paper" aria-label="Replace portrait" title="Replace" onclick={() => input.click()}>↻</button>
      <button type="button" class="icon-btn size-5 text-paper" aria-label="Remove portrait" title="Remove" onclick={() => (portrait = null)}>✕</button>
    </div>
  {:else}
    <button type="button" class="flex size-full flex-col items-center justify-center gap-0.5 text-center text-xs italic opacity-60 hover:opacity-100 print:hidden" onclick={() => input.click()}>
      <span>Portrait</span><span class="text-[0.6rem]">click or drop</span>
    </button>
  {/if}
  <input
    bind:this={input}
    type="file"
    accept="image/*"
    class="sr-only"
    tabindex="-1"
    aria-hidden="true"
    onchange={(e) => {
      pick(e.currentTarget.files?.[0]);
      e.currentTarget.value = '';
    }}
  />
</div>
