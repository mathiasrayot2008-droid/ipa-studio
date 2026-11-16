import type { JavaType, JavaValue } from '@/types/bank';

function jstr(s: string): string {
  let o = '"';
  for (const ch of s) {
    const c = ch.codePointAt(0)!;
    if (ch === '"') o += '\\"';
    else if (ch === '\\') o += '\\\\';
    else if (ch === '\n') o += '\\n';
    else if (ch === '\r') o += '\\r';
    else if (ch === '\t') o += '\\t';
    else if (c < 0x20 || c > 0x7e) {
      if (c > 0xffff) { const h = Math.floor((c - 0x10000) / 0x400) + 0xd800, l = ((c - 0x10000) % 0x400) + 0xdc00; o += u(h) + u(l); }
      else o += u(c);
    } else o += ch;
  }
  return o + '"';
}
const u = (c: number) => '\\u' + c.toString(16).padStart(4, '0');

function jchar(s: string): string {
  if (s.length !== 1) throw new Error(`char attendu, reçu « ${s} »`);
  if (s === "'") return "'\\''";
  if (s === '\\') return "'\\\\'";
  const c = s.charCodeAt(0);
  if (c < 0x20 || c > 0x7e) return `'${u(c)}'`;
  return `'${s}'`;
}

function jdouble(n: number): string {
  if (Number.isNaN(n)) return 'Double.NaN';
  if (n === Infinity) return 'Double.POSITIVE_INFINITY';
  if (n === -Infinity) return 'Double.NEGATIVE_INFINITY';
  if (Number.isInteger(n) && Math.abs(n) < 1e15) return `${n}.0`;
  const s = String(n);
  return /^-?\d+$/.test(s) ? s + '.0' : s;
}

function scalar(type: string, v: unknown): string {
  switch (type) {
    case 'int': return String(v as number);
    case 'long': return `${v as number}L`;
    case 'double': return jdouble(v as number);
    case 'boolean': return v ? 'true' : 'false';
    case 'char': return jchar(v as string);
    case 'String': return v === null ? 'null' : jstr(v as string);
    default: throw new Error(`Type non géré : ${type}`);
  }
}

/** Littéral Java d'une valeur typée (entrées de tests). */
export function javaLiteral(t: JavaType, v: unknown): string {
  if (t.endsWith('[][]')) {
    const base = t.slice(0, -4);
    if (v === null) return 'null';
    return `new ${base}[][]{${(v as unknown[][]).map((row) => `{${row.map((x) => scalar(base, x)).join(', ')}}`).join(', ')}}`;
  }
  if (t.endsWith('[]')) {
    const base = t.slice(0, -2);
    if (v === null) return 'null';
    return `new ${base}[]{${(v as unknown[]).map((x) => scalar(base, x)).join(', ')}}`;
  }
  return scalar(t, v);
}

export const literalOf = (jv: JavaValue) => javaLiteral(jv.type, jv.value);
