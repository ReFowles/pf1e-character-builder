<script lang="ts">
  import { SAVES, SAVE_NAMES, type Save } from '../model/types';
  import type { Total } from '../rules/bonuses';
  import Stat from './Stat.svelte';

  // The AC trio and the three saves, as two framed groups (character and companions).
  interface Props {
    ac: { normal: Total; touch: Total; flatFooted: Total };
    saves: Record<Save, Total>;
    /** Shown under save rolls in the log (a companion's name). */
    subtitle?: string;
  }
  let { ac, saves, subtitle }: Props = $props();
</script>

<div class="group-box group-box-dark grid grid-cols-3 gap-1">
  <Stat label="AC" value={ac.normal} signed={false} size="md" />
  <Stat label="Touch" value={ac.touch} signed={false} />
  <Stat label="Flat-footed" value={ac.flatFooted} signed={false} />
</div>
<div class="group-box group-box-dark grid grid-cols-3 gap-1">
  {#each SAVES as s (s)}<Stat label={SAVE_NAMES[s]} value={saves[s]} size="md" roll={{ title: `${SAVE_NAMES[s]} save`, subtitle }} />{/each}
</div>
