<script lang="ts">
  import { app } from '../state.svelte';

  interface Props {
    portrait: string | null;
    name: string;
    /** Classes for the 3:4 frame (size, rounding...). */
    class?: string;
  }
  let { portrait = $bindable(), name, class: cls = '' }: Props = $props();

  // Output is 3:4 and small enough to keep localStorage happy.
  const OUT_W = 600;
  const OUT_H = 800;
  // The crop dialog works on a fixed 3:4 frame, whatever size the portrait slot is.
  const FRAME_W = 270;
  const FRAME_H = 360;

  let input: HTMLInputElement;
  let dialog: HTMLDialogElement;
  let dragOver = $state(false);
  let img = $state<HTMLImageElement | null>(null);
  let zoom = $state(1);
  let minZoom = $state(1);
  let x = $state(0);
  let y = $state(0);
  let drag: { px: number; py: number; x: number; y: number } | null = null;

  function clamp() {
    if (!img) return;
    x = Math.min(0, Math.max(FRAME_W - img.naturalWidth * zoom, x));
    y = Math.min(0, Math.max(FRAME_H - img.naturalHeight * zoom, y));
  }

  function setZoom(z: number) {
    if (!img) return;
    // Zoom around the frame centre.
    const cx = (FRAME_W / 2 - x) / zoom;
    const cy = (FRAME_H / 2 - y) / zoom;
    zoom = Math.max(minZoom, Math.min(minZoom * 6, z));
    x = FRAME_W / 2 - cx * zoom;
    y = FRAME_H / 2 - cy * zoom;
    clamp();
  }

  function pick(file: File | undefined) {
    if (!file || !file.type.startsWith('image/')) {
      if (file) app.notify('That file is not an image.');
      return;
    }
    const el = new Image();
    el.onload = () => {
      minZoom = Math.max(FRAME_W / el.naturalWidth, FRAME_H / el.naturalHeight);
      zoom = minZoom;
      x = (FRAME_W - el.naturalWidth * zoom) / 2;
      y = (FRAME_H - el.naturalHeight * zoom) / 2;
      img = el;
      dialog.showModal();
    };
    el.src = URL.createObjectURL(file);
  }

  function close() {
    if (img) URL.revokeObjectURL(img.src);
    img = null;
    if (dialog.open) dialog.close();
  }

  function save() {
    if (!img) return;
    const canvas = document.createElement('canvas');
    canvas.width = OUT_W;
    canvas.height = OUT_H;
    const ctx = canvas.getContext('2d')!;
    // JPEG has no alpha: paint white first so transparent PNGs don't turn black.
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, OUT_W, OUT_H);
    const scale = OUT_W / FRAME_W;
    ctx.drawImage(img, x * scale, y * scale, img.naturalWidth * zoom * scale, img.naturalHeight * zoom * scale);
    portrait = canvas.toDataURL('image/jpeg', 0.85);
    close();
  }
</script>

<!-- Click (or drop an image on) the frame to upload; hover for replace/remove. -->
<div
  class={['group relative aspect-[3/4] overflow-hidden bg-parchment', { 'ring-4 ring-accent ring-inset': dragOver }, cls]}
  role="group"
  aria-label="Portrait of {name || 'character'}. Drop an image here to upload."
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
    <img src={portrait} alt="Portrait of {name || 'character'}" class="size-full object-cover" />
    <div class="absolute inset-x-0 bottom-0 flex justify-center gap-1 bg-ink/60 p-0.5 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100 max-md:opacity-100 print:hidden">
      <button type="button" class="icon-btn size-5 text-paper hover:bg-paper/20" aria-label="Replace portrait" title="Replace" onclick={() => input.click()}>↻</button>
      <button type="button" class="icon-btn size-5 text-paper hover:bg-paper/20" aria-label="Remove portrait" title="Remove" onclick={() => (portrait = null)}>✕</button>
    </div>
  {:else}
    <button type="button" class="flex size-full flex-col items-center justify-center gap-0.5 text-center text-sm italic opacity-60 hover:opacity-100 print:hidden" onclick={() => input.click()}>
      <span>Portrait</span><span class="text-xs">click or drop an image</span>
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

<dialog bind:this={dialog} class="crop-dialog" onclose={() => img && close()} aria-label="Crop portrait">
  {#if img}
    <div
      class="relative cursor-move touch-none overflow-hidden bg-white"
      style:width="{FRAME_W}px"
      style:height="{FRAME_H}px"
      role="application"
      aria-label="Drag to position, scroll to zoom"
      onpointerdown={(e) => {
        drag = { px: e.clientX, py: e.clientY, x, y };
        e.currentTarget.setPointerCapture(e.pointerId);
      }}
      onpointermove={(e) => {
        if (!drag) return;
        x = drag.x + e.clientX - drag.px;
        y = drag.y + e.clientY - drag.py;
        clamp();
      }}
      onpointerup={() => (drag = null)}
      onwheel={(e) => {
        e.preventDefault();
        setZoom(zoom * (e.deltaY < 0 ? 1.08 : 1 / 1.08));
      }}
    >
      <img
        src={img.src}
        alt="Portrait being cropped"
        draggable="false"
        class="pointer-events-none absolute max-w-none origin-top-left bg-white select-none"
        style:left="{x}px"
        style:top="{y}px"
        style:width="{img.naturalWidth * zoom}px"
      />
    </div>
    <label class="mt-3 flex items-center gap-2 text-sm">
      Zoom
      <input type="range" class="flex-1" min={minZoom} max={minZoom * 6} step="any" value={zoom} oninput={(e) => setZoom(Number(e.currentTarget.value))} />
    </label>
    <div class="mt-3 flex justify-end gap-2">
      <button type="button" class="btn" onclick={close}>Cancel</button>
      <button type="button" class="btn-primary" onclick={save}>Save crop</button>
    </div>
  {/if}
</dialog>
