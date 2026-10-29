<script lang="ts">
  import { tick } from 'svelte';
  import { app } from '../state.svelte';
  import { prefs } from '../prefs.svelte';
  import { TOUR_STEPS, tour } from '../tour.svelte';

  const current = $derived(tour.open ? TOUR_STEPS[tour.step] : null);
  let ring = $state<{ x: number; y: number; w: number; h: number } | null>(null);

  // First visit on this device: start once the Core tab is showing.
  $effect(() => {
    if (!prefs.data.tourSeen && app.tab === 'core' && !tour.open) tour.start();
  });

  // Follow the target through steps, scrolling and resizing.
  function place() {
    const el = current ? document.querySelector<HTMLElement>(current.target) : null;
    if (!el) {
      ring = null;
      return;
    }
    const r = el.getBoundingClientRect();
    ring = { x: r.left - 6, y: r.top - 6, w: r.width + 12, h: r.height + 12 };
  }
  $effect(() => {
    if (!current) {
      ring = null;
      return;
    }
    app.setTab('core');
    tick().then(() => {
      document.querySelector<HTMLElement>(current.target)?.scrollIntoView({ block: 'center' });
      place();
    });
    addEventListener('scroll', place, true);
    addEventListener('resize', place);
    return () => {
      removeEventListener('scroll', place, true);
      removeEventListener('resize', place);
    };
  });
  // The callout sits under the ring, kept inside the viewport.
  const callout = $derived.by(() => {
    if (!ring) return null;
    const w = Math.min(320, innerWidth - 16);
    const x = Math.max(8, Math.min(ring.x + ring.w / 2 - w / 2, innerWidth - w - 8));
    return { x, y: ring.y + ring.h + 10, w, arrow: ring.x + ring.w / 2 - x };
  });
</script>

{#if current && ring && callout}
  <!-- A transparent cutout whose huge shadow tints the page; the target inside stays bright. -->
  <div
    class="pointer-events-none fixed z-40 rounded-md border-2 border-accent print:hidden"
    style:left="{ring.x}px"
    style:top="{ring.y}px"
    style:width="{ring.w}px"
    style:height="{ring.h}px"
    style:box-shadow="0 0 0 9999px rgb(0 0 0 / 0.45)"
  ></div>
  <div
    role="dialog"
    aria-labelledby="tour-title"
    class="fixed z-50 rounded-md border border-ink/20 bg-paper p-3 text-sm shadow-xl print:hidden"
    style:left="{callout.x}px"
    style:top="{callout.y}px"
    style:width="{callout.w}px"
  >
    <span class="absolute -top-1.5 size-3 rotate-45 border-t border-l border-ink/20 bg-paper" style:left="{callout.arrow - 6}px"></span>
    <div class="mb-1 flex items-baseline justify-between gap-2">
      <h3 id="tour-title" class="font-display font-bold">{current.title}</h3>
      <span class="text-xs opacity-50">{tour.step + 1}/{TOUR_STEPS.length}</span>
    </div>
    <p>{current.text}</p>
    <div class="mt-2 flex justify-end gap-2">
      <button type="button" class="btn text-xs" onclick={() => tour.finish()}>Skip</button>
      <button type="button" class="btn-primary text-xs" onclick={() => tour.next()}>{tour.step + 1 < TOUR_STEPS.length ? 'Next' : 'Done'}</button>
    </div>
  </div>
{/if}
