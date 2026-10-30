<script lang="ts">
  import { ABILITIES, ABILITY_NAMES, BONUS_TYPES } from '../../lib/model/types';
  import { checkExpr, tryEvaluate } from '../../lib/rules/expr';
  import { BONUS_KEYS } from '../../lib/rules/keys';
  import { STACKING_TYPES } from '../../lib/rules/bonuses';
  import { app } from '../../lib/state.svelte';
  import Section from '../../lib/ui/Section.svelte';

  const vars = $derived(app.d.vars);
  const show = (k: string) => (Object.hasOwn(vars, k) ? String(vars[k]) : '—');

  const REFS = $derived([
    { ref: '@level', meaning: 'Total character level', key: 'level' },
    { ref: '@hd', meaning: 'Hit dice (same as @level)', key: 'hd' },
    { ref: '@bab', meaning: 'Base attack bonus', key: 'bab' },
    { ref: '@cl', meaning: 'Caster level of the first spellcasting section (not available in macros)', key: 'cl' },
    ...ABILITIES.flatMap((a) => [
      { ref: `@${a}`, meaning: `${ABILITY_NAMES[a]} score, including temporary changes`, key: a },
      { ref: `@${a}.mod`, meaning: `${ABILITY_NAMES[a]} modifier`, key: `${a}.mod` },
    ]),
  ]);
  /** Class level references for this character, e.g. class.arcane-trickster.level. */
  const classRefs = $derived(Object.keys(vars).filter((k) => k.startsWith('class.') && k.endsWith('.level')));

  const FUNCS = [
    { fn: 'floor(x)', does: 'Round down', ex: 'floor(7 / 2)', out: '3' },
    { fn: 'ceil(x)', does: 'Round up', ex: 'ceil(7 / 2)', out: '4' },
    { fn: 'round(x)', does: 'Round to the nearest whole number (.5 rounds up)', ex: 'round(2.5)', out: '3' },
    { fn: 'abs(x)', does: 'Drop the minus sign', ex: 'abs(-3)', out: '3' },
    { fn: 'min(a, b, …)', does: 'The smallest value; use it as a cap', ex: 'min(5, 8)', out: '5' },
    { fn: 'max(a, b, …)', does: 'The largest value; use it as a floor', ex: 'max(1, -2)', out: '1' },
  ];

  const EXAMPLES = [
    { what: 'Power Attack attack penalty', f: '-1 - floor(@bab / 4)', where: 'Macro effect on attack.melee' },
    { what: 'Power Attack damage', f: '2 * (1 + floor(@bab / 4))', where: 'Macro effect on damage.melee' },
    { what: 'Smite Evil attack and AC', f: '@cha.mod', where: 'Macro effects on attack and ac (deflection)' },
    { what: 'Sneak attack dice', f: 'ceil(@class.rogue.level / 2)', where: 'Macro damage dice count, d6, precision' },
    { what: 'Divine Favor (+1 per 3 levels, 1 to 3)', f: 'min(3, max(1, floor(@class.cleric.casterLevel / 3)))', where: 'Macro effect on attack and damage (luck)' },
    { what: 'Rage rounds per day', f: '4 + @con.mod + 2 * (@class.barbarian.level - 1)', where: 'Resource max' },
    { what: 'Ki pool', f: 'floor(@class.monk.level / 2) + @wis.mod', where: 'Resource max' },
    { what: 'Channel energy uses', f: '3 + @cha.mod', where: 'Special ability max uses' },
    { what: 'Arcane school power uses', f: '3 + @int.mod', where: 'Special ability max uses' },
    { what: 'At least one use', f: 'max(1, @wis.mod)', where: 'Special ability max uses' },
  ];

  /** Bonus keys grouped for the reference table. */
  const GROUPS: { title: string; test: (k: string) => boolean }[] = [
    { title: 'Ability scores', test: (k) => k.startsWith('ability.') },
    { title: 'Offense', test: (k) => /^(attack|damage|cmb)/.test(k) },
    { title: 'Defense', test: (k) => /^(ac|cmd|save|hp\.)/.test(k) },
    { title: 'Movement, size and carrying', test: (k) => /^(init|speed|size\.|capacity\.)/.test(k) },
    { title: 'Spellcasting', test: (k) => /^(cl|concentration|spell\.)/.test(k) },
    { title: 'Skills', test: (k) => k === 'skills' || k.startsWith('skill.') },
  ];

  let trial = $state('3 + @cha.mod');
  const trialError = $derived(trial.trim() ? checkExpr(trial, vars) : null);
</script>

<Section id="settings-formulas" title="Formula guide">
  <div class="flex flex-col gap-4 text-sm">
    <div class="flex flex-col gap-1">
      <p>
        Formulas work in macro effect values, the number of macro damage dice, resource maximums (Readiness) and special ability max uses. A formula is a
        number, a reference such as <code>@bab</code>, a function such as <code>floor(…)</code>, or any mix of them.
      </p>
      <label class="field max-w-xl">
        <input class="font-mono" bind:value={trial} aria-label="Try a formula" class:text-accent={!!trialError} />
        <span class="field-label">Try a formula on this character</span>
      </label>
      <p class="font-mono text-xs" class:text-accent={!!trialError}>
        {trial.trim() ? (trialError ?? `= ${tryEvaluate(trial, vars)}`) : 'Type a formula above.'}
      </p>
    </div>

    <div class="grid gap-4 lg:grid-cols-2">
      <div class="flex flex-col gap-1">
        <h3 class="font-semibold">Syntax</h3>
        <ul class="list-disc pl-5">
          <li>Arithmetic: <code>+</code> <code>-</code> <code>*</code> <code>/</code> and parentheses. <code>*</code> and <code>/</code> come before <code>+</code> and <code>-</code>.</li>
          <li>Division keeps fractions (<code>7 / 2</code> is 3.5); wrap it in <code>floor()</code> or <code>ceil()</code> to round.</li>
          <li>Macro values drop any fraction toward zero; resource and use maximums round down.</li>
          <li>Upper and lower case don't matter: <code>@STR.mod</code> works.</li>
          <li>Put spaces around a minus after a reference: <code>@bab - 1</code>, not <code>@bab-1</code> (that reads as a reference named <code>bab-1</code>).</li>
          <li>A formula with an error turns red. A macro effect with an error is skipped; a maximum falls back to the number typed in the box.</li>
        </ul>
      </div>

      <div class="flex flex-col gap-1">
        <h3 class="font-semibold">Functions</h3>
        <table class="w-full">
          <thead><tr><th>Function</th><th>Does</th><th>Example</th></tr></thead>
          <tbody>
            {#each FUNCS as f (f.fn)}
              <tr class="border-b border-ink/10">
                <td class="font-mono text-xs whitespace-nowrap">{f.fn}</td>
                <td>{f.does}</td>
                <td class="font-mono text-xs whitespace-nowrap">{f.ex} = {f.out}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>

      <div class="flex flex-col gap-1">
        <h3 class="font-semibold">References</h3>
        <table class="w-full">
          <thead><tr><th>Reference</th><th>Meaning</th><th class="w-14 text-center">Now</th></tr></thead>
          <tbody>
            {#each REFS as r (r.ref)}
              <tr class="border-b border-ink/10">
                <td class="font-mono text-xs whitespace-nowrap">{r.ref}</td>
                <td>{r.meaning}</td>
                <td class="text-center">{show(r.key)}</td>
              </tr>
            {/each}
            <tr class="border-b border-ink/10">
              <td class="font-mono text-xs whitespace-nowrap">@class.&lt;name&gt;.level</td>
              <td>Levels in one class. The name is lowercase with dashes for spaces: <code>@class.arcane-trickster.level</code></td>
              <td></td>
            </tr>
            <tr class="border-b border-ink/10">
              <td class="font-mono text-xs whitespace-nowrap">@class.&lt;name&gt;.casterLevel</td>
              <td>That class's caster level, counting prestige class advancement</td>
              <td></td>
            </tr>
            {#each classRefs as k (k)}
              <tr class="border-b border-ink/10">
                <td class="font-mono text-xs whitespace-nowrap">@{k}</td>
                <td class="italic opacity-70">This character</td>
                <td class="text-center">{show(k)}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>

      <div class="flex flex-col gap-1">
        <h3 class="font-semibold">Examples</h3>
        <table class="w-full">
          <thead><tr><th>For</th><th>Formula</th><th>Goes in</th></tr></thead>
          <tbody>
            {#each EXAMPLES as x (x.what)}
              <tr class="border-b border-ink/10">
                <td>{x.what}</td>
                <td class="font-mono text-xs">{x.f}</td>
                <td class="text-xs opacity-80">{x.where}</td>
              </tr>
            {/each}
          </tbody>
        </table>
        <h3 class="mt-3 font-semibold">Macro damage dice</h3>
        <p>
          <strong>+ damage dice</strong> adds dice to weapon damage rolls: a count (number or formula), the die size, a damage type and which weapons
          (all, melee or ranged). These dice are never multiplied on a critical hit, like sneak attack.
        </p>
      </div>

      <div class="flex flex-col gap-1">
        <h3 class="font-semibold">Bonus types and stacking</h3>
        <p>
          Each macro effect has a type. Bonuses of the same type don't stack; only the highest counts. The exceptions are
          {[...STACKING_TYPES].join(', ')}, which always add up. Penalties (negative values) always stack.
        </p>
        <p class="font-mono text-xs opacity-80">{BONUS_TYPES.join(' · ')}</p>
        <p>
          On the <code>ac</code> key the type decides which ACs a bonus reaches: armor, shield and natural armor bonuses don't count toward touch AC,
          and dodge bonuses don't count when flat-footed.
        </p>
      </div>
    </div>

    <div class="flex flex-col gap-1">
      <h3 class="font-semibold">Bonus keys</h3>
      <p>
        The key decides what an effect changes; type it or pick it from the list in the macro editor. A broad key covers everything under it:
        <code>attack</code> reaches melee and ranged, <code>save</code> all three saves, <code>skill.knowledge</code> every Knowledge. A Craft, Perform or
        Profession skill also takes its subtype in lowercase with dashes: <code>skill.craft.alchemy</code>.
      </p>
      <div class="columns-1 gap-4 sm:columns-2">
        {#each GROUPS as g (g.title)}
          <table class="mb-3 w-full break-inside-avoid">
            <thead><tr><th colspan="2">{g.title}</th></tr></thead>
            <tbody>
              {#each BONUS_KEYS.filter((k) => g.test(k.key)) as k (k.key)}
                <tr class="border-b border-ink/10">
                  <td class="font-mono text-xs whitespace-nowrap">{k.key}</td>
                  <td>{k.label}</td>
                </tr>
              {/each}
            </tbody>
          </table>
        {/each}
      </div>
    </div>
  </div>
</Section>
