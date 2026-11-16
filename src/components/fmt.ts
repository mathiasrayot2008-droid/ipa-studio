import type { JavaValue } from '@/types/bank';

export function fmtValue(type: string, v: unknown): string {
  if (v === null || v === undefined) return 'null';
  if (Array.isArray(v)) {
    const inner = type.endsWith('[]') ? type.slice(0, -2) : type;
    return '{' + v.map((x) => fmtValue(inner, x)).join(', ') + '}';
  }
  if (type === 'String') return JSON.stringify(v);
  if (type === 'char') return `'${String(v)}'`;
  return String(v);
}
export const fmtJv = (j: JavaValue) => fmtValue(j.type, j.value);
