/** A die face from 1 to `sides`. */
export type Rng = (sides: number) => number;

/** Unbiased faces from the Web Crypto generator (rejection sampling). */
export const cryptoRng: Rng = (sides) => {
  const buf = new Uint32Array(1);
  const limit = Math.floor(0x1_0000_0000 / sides) * sides;
  for (;;) {
    crypto.getRandomValues(buf);
    if (buf[0] < limit) return (buf[0] % sides) + 1;
  }
};
