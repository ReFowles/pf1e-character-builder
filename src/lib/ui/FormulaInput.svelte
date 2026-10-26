<script lang="ts">
  import { app } from '../state.svelte';
  import { checkExpr } from '../rules/expr';
  import { FORMULA_REFS } from '../rules/keys';

  interface Props {
    /** Fixed number used when there is no formula. */
    value: number;
    expr: string;
    /** Evaluated result, shown when not focused. */
    result: number;
    label: string;
    class?: string;
  }
  let { value = $bindable(), expr = $bindable(), result, label, class: cls = '' }: Props = $props();
  let focused = $state(false);
  const error = $derived(expr.trim() ? checkExpr(expr, app.d.vars) : null);
</script>

<input
  class="num {cls}"
  class:text-accent={!!error}
  aria-label={label}
  aria-invalid={!!error}
  title={error ?? (expr ? `= ${expr}` : `Number or formula, e.g. 3 + @cha.mod. Refs: ${FORMULA_REFS.join(' ')}`)}
  value={focused ? expr || String(value) : result}
  onfocus={(e) => {
    focused = true;
    e.currentTarget.value = expr || String(value);
  }}
  onblur={() => (focused = false)}
  onchange={(e) => {
    const v = e.currentTarget.value.trim();
    if (v === '' || Number.isFinite(Number(v))) {
      value = Number(v) || 0;
      expr = '';
    } else {
      expr = v;
    }
  }}
/>
