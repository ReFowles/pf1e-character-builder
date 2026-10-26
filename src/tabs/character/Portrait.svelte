<script lang="ts">
  import { app } from '../../lib/state.svelte';
  import Section from '../../lib/ui/Section.svelte';

  // Output size: 3:4, small enough to keep localStorage happy.
  const OUT_W = 600;
  const OUT_H = 800;

  let frameW = $state(300);
  const frameH = $derived((frameW * 4) / 3);

  let img = $state<HTMLImageElement | null>(null);
  let zoom = $state(1);
  let minZoom = $state(1);
  let x = $state(0);
  let y = $state(0);
  let dragOver = $state(false);
  let drag: { px: number; py: number; x: number; y: number } | null = null;
  let fileInput: HTMLInputElement;

  function clamp() {
    if (!img) return;
    x = Math.min(0, Math.max(frameW - img.naturalWidth * zoom, x));
    y = Math.min(0, Math.max(frameH - img.naturalHeight * zoom, y));
  }

  function setZoom(z: number) {
    if (!img) return;
    // Zoom around the frame centre.
    const cx = (frameW / 2 - x) / zoom;
    const cy = (frameH / 2 - y) / zoom;
    zoom = Math.max(minZoom, Math.min(minZoom * 6, z));
    x = frameW / 2 - cx * zoom;
    y = frameH / 2 - cy * zoom;
    clamp();
  }

  function pick(file: File | undefined) {
    if (!file || !file.type.startsWith('image/')) {
      if (file) app.notify('That file is not an image.');
      return;
    }
    const el = new Image();
    el.onload = () => {
      minZoom = Math.max(frameW / el.naturalWidth, frameH / el.naturalHeight);
      zoom = minZoom;
      x = (frameW - el.naturalWidth * zoom) / 2;
      y = (frameH - el.naturalHeight * zoom) / 2;
      img = el;
    };
    el.src = URL.createObjectURL(file);
  }

  function close() {
    if (img) URL.revokeObjectURL(img.src);
    img = null;
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
    const scale = OUT_W / frameW;
    ctx.drawImage(img, x * scale, y * scale, img.naturalWidth * zoom * scale, img.naturalHeight * zoom * scale);
    app.char.portrait = canvas.toDataURL('image/jpeg', 0.85);
    close();
  }
</script>

<Section id="portrait" bodyClass="p-0">
  {#snippet info()}
    <p>Upload or drop an image, then drag to position it and zoom to frame it. It's saved as a 600×800 (3:4) JPEG; transparent areas become white.</p>
  {/snippet}
  <div
    class="relative aspect-[3/4] w-full overflow-hidden bg-parchment"
    class:flex-1={!img}
    class:ring-4={dragOver}
    class:ring-accent={dragOver}
    class:ring-inset={dragOver}
    bind:clientWidth={frameW}
    role="group"
    aria-label="Portrait. Drop an image here to upload."
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
    {#if img}
      <div
        class="absolute inset-0 cursor-move touch-none print:hidden"
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
      <div class="absolute inset-x-0 bottom-0 flex flex-col gap-2 bg-ink/70 p-2 text-paper print:hidden">
        <label class="flex items-center gap-2 text-sm">
          Zoom
          <input type="range" class="flex-1" min={minZoom} max={minZoom * 6} step="any" value={zoom} oninput={(e) => setZoom(Number(e.currentTarget.value))} />
        </label>
        <div class="flex justify-end gap-2">
          <button type="button" class="btn text-ink" onclick={close}>Cancel</button>
          <button type="button" class="btn-primary" onclick={save}>Save crop</button>
        </div>
      </div>
    {:else}
      {#if app.char.portrait}
        <img src={app.char.portrait} alt="Portrait of {app.char.info.name || 'the character'}" class="h-full w-full object-cover" />
      {:else}
        <div class="flex h-full flex-col items-center justify-center gap-1 text-sm italic opacity-50 print:hidden">
          <span>No portrait</span>
          <span class="text-xs">Drop an image here</span>
        </div>
      {/if}
      <div class="absolute inset-x-0 bottom-0 flex justify-center gap-2 bg-gradient-to-t from-ink/60 to-transparent p-2 print:hidden">
        <button type="button" class="btn" onclick={() => fileInput.click()}>{app.char.portrait ? 'Replace' : 'Upload'}</button>
        {#if app.char.portrait}
          <button type="button" class="btn" onclick={() => (app.char.portrait = null)}>Remove</button>
        {/if}
      </div>
    {/if}
    <input
      bind:this={fileInput}
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
</Section>
