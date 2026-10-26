// A small, safe arithmetic evaluator for user formulas such as
// `-1 - floor(@bab / 4)` or `max(1, @wis.mod)`. No eval, no property access.

export type Vars = Record<string, number>;

export class ExprError extends Error {}

const FUNCS: Record<string, (...a: number[]) => number> = {
  floor: Math.floor,
  ceil: Math.ceil,
  round: Math.round,
  abs: Math.abs,
  min: Math.min,
  max: Math.max,
};

type Token =
  | { t: 'num'; v: number }
  | { t: 'ref'; v: string }
  | { t: 'id'; v: string }
  | { t: 'op'; v: string };

function tokenize(src: string): Token[] {
  const out: Token[] = [];
  const re = /\s*(?:(\d+(?:\.\d+)?)|@([a-zA-Z_][\w.-]*)|([a-zA-Z_]\w*)|([-+*/(),]))/y;
  let i = 0;
  while (i < src.length) {
    if (/^\s*$/.test(src.slice(i))) break;
    re.lastIndex = i;
    const m = re.exec(src);
    if (!m) throw new ExprError(`Unexpected "${src.slice(i).trim()[0]}"`);
    if (m[1]) out.push({ t: 'num', v: Number(m[1]) });
    else if (m[2]) out.push({ t: 'ref', v: m[2].toLowerCase() });
    else if (m[3]) out.push({ t: 'id', v: m[3].toLowerCase() });
    else out.push({ t: 'op', v: m[4] });
    i = re.lastIndex;
  }
  return out;
}

export function evaluate(src: string, vars: Vars = {}): number {
  const toks = tokenize(src);
  let pos = 0;
  const peek = () => toks[pos];
  const isOp = (v: string) => peek()?.t === 'op' && peek()!.v === v;
  const expect = (v: string) => {
    if (!isOp(v)) throw new ExprError(`Expected "${v}"`);
    pos++;
  };

  function expr(): number {
    let v = term();
    while (isOp('+') || isOp('-')) v = toks[pos++].v === '+' ? v + term() : v - term();
    return v;
  }
  function term(): number {
    let v = unary();
    while (isOp('*') || isOp('/')) {
      const op = toks[pos++].v;
      const r = unary();
      if (op === '/' && r === 0) throw new ExprError('Division by zero');
      v = op === '*' ? v * r : v / r;
    }
    return v;
  }
  function unary(): number {
    if (isOp('-')) return pos++, -unary();
    if (isOp('+')) return pos++, unary();
    return primary();
  }
  function primary(): number {
    const tok = toks[pos++];
    if (!tok) throw new ExprError('Unexpected end of formula');
    if (tok.t === 'num') return tok.v;
    if (tok.t === 'ref') {
      if (!Object.hasOwn(vars, tok.v)) throw new ExprError(`Unknown reference @${tok.v}`);
      return vars[tok.v];
    }
    if (tok.t === 'id') {
      const fn = Object.hasOwn(FUNCS, tok.v) ? FUNCS[tok.v] : undefined;
      if (!fn) throw new ExprError(`Unknown function ${tok.v}`);
      expect('(');
      const args = [expr()];
      while (isOp(',')) pos++, args.push(expr());
      expect(')');
      return fn(...args);
    }
    if (tok.v === '(') {
      const v = expr();
      expect(')');
      return v;
    }
    throw new ExprError(`Unexpected "${tok.v}"`);
  }

  const v = expr();
  if (pos < toks.length) throw new ExprError(`Unexpected "${(toks[pos] as Token).v}"`);
  return v;
}

/** Evaluate, returning `fallback` on any error or empty formula. */
export function tryEvaluate(src: string, vars: Vars, fallback = 0): number {
  if (!src.trim()) return fallback;
  try {
    const v = evaluate(src, vars);
    return Number.isFinite(v) ? v : fallback;
  } catch {
    return fallback;
  }
}

/** Error message for a formula, or null if it evaluates. */
export function checkExpr(src: string, vars: Vars): string | null {
  try {
    evaluate(src, vars);
    return null;
  } catch (e) {
    return e instanceof Error ? e.message : String(e);
  }
}
