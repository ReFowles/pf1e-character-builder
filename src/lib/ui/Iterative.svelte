<script lang="ts">
  import { rollable } from '../dice/rollable';
  import type { RollPart } from '../dice/roll';

  interface Props {
    /** Attack bonuses joined by "/", e.g. "+11/+6/+1". */
    text: string;
    /** Make each attack clickable: the nth piece rolls d20 + (bonus − 5n). */
    onroll?: { title: string; subtitle?: string; bonus: number; parts: RollPart[] };
  }
  let { text, onroll }: Props = $props();
  // "+15", "/+10", "/+5": each piece stays whole, so a line can only break before a slash.
  const pieces = $derived(text.split('/').map((p, i) => (i ? `/${p}` : p)));
  const opts = (i: number) =>
    onroll
      ? {
          title: pieces.length > 1 ? `${onroll.title} ${i + 1}` : onroll.title,
          subtitle: onroll.subtitle,
          bonus: onroll.bonus - 5 * i,
          parts: i ? [...onroll.parts, { source: `Iterative attack ${i + 1}`, value: -5 * i }] : onroll.parts,
        }
      : { title: '', bonus: 0, disabled: true };
</script>

{#each pieces as p, i (i)}<span class="inline-block whitespace-nowrap">{#if i}/{/if}<span use:rollable={opts(i)}>{i ? p.slice(1) : p}</span></span>{/each}
