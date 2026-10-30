<script lang="ts">
  // Placeholder card for an optional tab with nothing in it yet.
  interface Props {
    message: string;
    /** Button text after the plus sign. */
    action: string;
    onadd: () => void;
  }
  let { message, action, onadd }: Props = $props();
</script>

<div class="flex flex-col items-start gap-2 rounded-md bg-paper p-4 text-sm print:hidden">
  <p class="italic opacity-70">{message}</p>
  <button type="button" class="add-btn" onclick={onadd}>+ {action}</button>
</div>
