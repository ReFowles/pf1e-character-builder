<script lang="ts">
  import { app } from '../../lib/state.svelte';
  import Section from '../../lib/ui/Section.svelte';

  // Output size: 3:4, small enough to keep localStorage happy.
  const OUT_W = 600;
  const OUT_H = 800;
  const FRAME_W = 300;
  const FRAME_H = 400;

  let img = $state<HTMLImageElement | null>(null);
  let zoom = $state(1);
  let minZoom = $state(1);
  let x = $state(0);
  let y = $state(0);
  let drag: { px: number; py: number; x: number; y: number } | null = null;

  function clamp() {
    if (!img) return;
    const w = img.naturalWidth * zoom;
    const h = img.naturalHeight * zoom;
    x = Math.min(0, Math.max(FRAME_W - w, x));
    y = Math.min(0, Math.max(FRAME_H - h, y));
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

  async function pick(file: File | undefined) {
    if (!file) return;
    const url = URL.createObjectURL(file);
    const el = new Image();
    el.onload = () => {
      minZoom = Math.max(FRAME_W / el.naturalWidth, FRAME_H / el.naturalHeight);
      zoom = minZoom;
      x = (FRAME_W - el.naturalWidth * zoom) / 2;
      y = (FRAME_H - el.naturalHeight * zoom) / 2;
      img = el;
    };
    el.src = url;
  }

  function save() {
    if (!img) return;
    const canvas = document.createElement('canvas');
    canvas.width = OUT_W;
    canvas.height = OUT_H;
    const scale = OUT_W / FRAME_W;
    canvas
      .getContext('2d')!
      .drawImage(img, x * scale, y * scale, img.naturalWidth * zoom * scale, img.naturalHeight * zoom * scale);
    app.char.portrait = canvas.toDataURL('image/jpeg', 0.8);
    URL.revokeObjectURL(img.src);
    img = null;
  }
</script>

<Section id="portrait">
  {#if img}
    <div class="flex flex-col items-center gap-2 print:hidden">
      <div
        class="relative cursor-move touch-none overflow-hidden rounded-sm border-2 border-ink bg-ink/10"
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
          class="pointer-events-none absolute max-w-none origin-top-left select-none"
          style:left="{x}px"
          style:top="{y}px"
          style:width="{img.naturalWidth * zoom}px"
        />
      </div>
      <label class="flex w-full max-w-[300px] items-center gap-2 text-sm">
        Zoom
        <input type="range" class="flex-1" min={minZoom} max={minZoom * 6} step="any" value={zoom} oninput={(e) => setZoom(Number(e.currentTarget.value))} />
      </label>
      <div class="flex gap-2">
        <button type="button" class="btn-primary" onclick={save}>Save crop</button>
        <button type="button" class="btn" onclick={() => (img = null)}>Cancel</button>
      </div>
    </div>
  {:else}
    <div class="mx-auto aspect-[3/4] w-full max-w-[300px] overflow-hidden rounded-sm border border-ink/30 bg-parchment">
      {#if app.char.portrait}
        <img src={app.char.portrait} alt="Portrait of {app.char.info.name || 'the character'}" class="h-full w-full object-cover" />
      {:else}
        <div class="flex h-full items-center justify-center text-sm italic opacity-50 print:hidden">No portrait</div>
      {/if}
    </div>
    <div class="flex justify-center gap-2 print:hidden">
      <label class="btn cursor-pointer">
        {app.char.portrait ? 'Replace' : 'Upload'}
        <input type="file" accept="image/*" class="sr-only" onchange={(e) => pick(e.currentTarget.files?.[0])} />
      </label>
      {#if app.char.portrait}
        <button type="button" class="btn" onclick={() => (app.char.portrait = null)}>Remove</button>
      {/if}
    </div>
  {/if}
</Section>
