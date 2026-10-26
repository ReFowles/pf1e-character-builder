<script lang="ts">
  let dialog: HTMLDialogElement;
  let license = $state('');

  export async function open() {
    dialog.showModal();
    if (license) return;
    try {
      const base = import.meta.env.BASE_URL;
      const [ogl, notice] = await Promise.all(
        ['OGL.txt', 'NOTICE.txt'].map((f) => fetch(`${base}data/${f}`).then((r) => (r.ok ? r.text() : ''))),
      );
      license = `${ogl.trim()}\n\n${notice.trim()}`;
    } catch {
      license = 'The license text could not be loaded.';
    }
  }
</script>

<dialog
  bind:this={dialog}
  class="m-auto max-h-[85vh] w-full max-w-2xl rounded-sm bg-paper p-0 text-ink shadow-xl backdrop:bg-ink/50"
  aria-labelledby="about-title"
>
  <div class="flex flex-col gap-3 p-4">
    <div class="flex items-center justify-between">
      <h2 id="about-title" class="font-display text-lg font-bold">About</h2>
      <button type="button" class="icon-btn" aria-label="Close" onclick={() => dialog.close()}>✕</button>
    </div>
    <p class="text-sm">
      An offline Pathfinder 1st Edition character sheet. Characters are stored only in this browser; export them as JSON to
      back them up or move them.
    </p>
    <p class="text-sm">
      This website uses trademarks and/or copyrights owned by Paizo Inc., used under Paizo's Community Use Policy
      (<a class="underline" href="https://paizo.com/licenses/communityuse" target="_blank" rel="noreferrer">paizo.com/licenses/communityuse</a>).
      We are expressly prohibited from charging you to use or access this content. This website is not published, endorsed,
      or specifically approved by Paizo. For more information about Paizo Inc. and Paizo products, visit
      <a class="underline" href="https://paizo.com" target="_blank" rel="noreferrer">paizo.com</a>.
    </p>
    <p class="text-sm">
      Spell, feat and item data comes from the
      <a class="underline" href="https://gitlab.com/foundryvtt_pathfinder1e/foundryvtt-pathfinder1" target="_blank" rel="noreferrer">Foundry VTT Pathfinder 1e system</a>
      compendiums. All spell, feat and item text is Open Game Content under the Open Game License v1.0a below.
    </p>
    <details>
      <summary class="cursor-pointer text-sm font-semibold">Open Game License v1.0a</summary>
      <pre class="mt-2 max-h-[40vh] overflow-y-auto text-xs whitespace-pre-wrap">{license || 'Loading…'}</pre>
    </details>
  </div>
</dialog>
