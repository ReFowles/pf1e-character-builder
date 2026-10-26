<script lang="ts">
  interface Props {
    open: boolean;
    class?: string;
  }
  let { open, class: cls = 'size-4' }: Props = $props();
</script>

<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" class="shrink-0 transition-transform {cls}" class:-rotate-90={!open}>
  <path d="M5.3 7.3a1 1 0 0 1 1.4 0L10 10.6l3.3-3.3a1 1 0 1 1 1.4 1.4l-4 4a1 1 0 0 1-1.4 0l-4-4a1 1 0 0 1 0-1.4Z" />
</svg>
