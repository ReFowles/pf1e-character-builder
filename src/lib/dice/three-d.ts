// 3D dice through @3d-dice/dice-box (Babylon + ammo physics), loaded only when
// the preference is on. The physics results become the roll's die values.
import type DiceBox from '@3d-dice/dice-box';
import type { Notation } from './notation';
import type { DieResult } from './roll';

export interface ThreeDOptions {
  color: string;
  scale: number;
}

let boxPromise: Promise<DiceBox> | null = null;
let clearTimer: ReturnType<typeof setTimeout> | undefined;
let applied: ThreeDOptions | null = null;

async function getBox(opts: ThreeDOptions): Promise<DiceBox> {
  boxPromise ??= (async () => {
    const { default: DiceBox } = await import('@3d-dice/dice-box');
    let layer = document.getElementById('dice-layer');
    if (!layer) {
      layer = document.createElement('div');
      layer.id = 'dice-layer';
      layer.className = 'dice-layer';
      document.body.append(layer);
    }
    const box = new DiceBox({
      assetPath: `${import.meta.env.BASE_URL}assets/dice-box/`,
      container: '#dice-layer',
      theme: 'default',
      themeColor: opts.color,
      scale: opts.scale,
      offscreen: true,
      enableShadows: true,
      settleTimeout: 4000,
    });
    await box.init();
    applied = { ...opts };
    return box;
  })().catch((e) => {
    boxPromise = null;
    throw e;
  });
  return boxPromise;
}

/** Throw the dice and resolve with their faces, in notation order. */
export async function roll3d(n: Notation, opts: ThreeDOptions): Promise<DieResult[]> {
  const box = await getBox(opts);
  if (applied && (applied.color !== opts.color || applied.scale !== opts.scale)) {
    box.updateConfig({ themeColor: opts.color, scale: opts.scale });
    applied = { ...opts };
  }
  clearTimeout(clearTimer);
  const results = await box.roll(n.dice.map((t) => ({ qty: t.count, sides: t.sides })));
  clearTimer = setTimeout(() => box.clear(), 6000);
  // Group order keeps each term's dice together, so callers can split the throw by term.
  return [...results].sort((a, b) => a.groupId - b.groupId).map((r) => ({ sides: r.sides, value: r.value, sign: n.dice[r.groupId]?.sign ?? 1 }));
}

/** Drop the scene (e.g. when 3D is switched off). */
export function dispose3d() {
  clearTimeout(clearTimer);
  boxPromise?.then((b) => b.clear()).catch(() => {});
  document.getElementById('dice-layer')?.remove();
  boxPromise = null;
  applied = null;
}
