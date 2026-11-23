import type { Exercise, ExerciseKind, JavaType, TestCase, ToolConfig } from '@/types/bank';
import type { JavaSourceFile } from './harnessTypes';
import { javaLiteral } from './literals';
import { envSource } from './tools';

export interface ExecSpec {
  kind: ExerciseKind;
  tools: ToolConfig[];
  givenVariables: { name: string; type: JavaType }[];
  expectedVariables: { name: string; type: JavaType; declareOnly?: boolean }[];
  tests: Pick<TestCase, 'id' | 'inputs' | 'scene'>[];
  /** kind 'members' : appel de la fonction de l'étudiant ; `result` = type de la valeur retournée (capturée sous le nom « resultat »). */
  member?: { call: string; result?: JavaType };
}

export const specOf = (e: Pick<Exercise, 'kind' | 'tools' | 'givenVariables' | 'expectedVariables' | 'tests'> & Partial<Pick<Exercise, 'member'>>, tests = e.tests): ExecSpec => ({
  kind: e.kind, tools: e.tools, givenVariables: e.givenVariables, expectedVariables: e.expectedVariables, tests, member: e.member,
});

export interface BuiltProject {
  files: JavaSourceFile[];
  mainClass: 'Exercice';
  /** Nombre de lignes du gabarit avant le code étudiant : ligne étudiant = ligne Java − lineOffset. */
  lineOffset: number;
  studentLines: number;
  expectedVariables: string[];
}

/** Scène d'un test : [cw, ch, gw, gh, hasRunner, rw, rh, sx, sy, gx, gy, nWalls, walls…] (cf. Env.reset). */
export function sceneArray(kind: ExerciseKind, t: Pick<TestCase, 'scene'>): number[] {
  const s = t.scene ?? {};
  const cv = s.canvas ?? (kind === 'drawing' ? { width: 300, height: 300 } : undefined);
  const g = s.grid;
  const r = s.runner;
  const out = [cv?.width ?? 0, cv?.height ?? 0, g?.largeur ?? 0, g?.hauteur ?? 0];
  if (r) {
    out.push(1, r.width, r.height, r.start[0], r.start[1], r.goal[0], r.goal[1], r.walls.length);
    for (const [x, y] of r.walls) out.push(x, y);
  } else out.push(0, 0, 0, 0, 0, 0, 0, 0);
  return out;
}

export interface BuildOptions { perTestMs?: number; totalMs?: number }

export function buildProject(spec: ExecSpec, studentCode: string, opts: BuildOptions = {}): BuiltProject {
  const per = opts.perTestMs ?? 2000;
  const total = opts.totalMs ?? 8000;
  const params = spec.givenVariables.map((v) => `${v.type} ${v.name}`).join(', ');
  const members = spec.kind === 'members';
  if (members && !spec.member) throw new Error("kind 'members' : appel de test (member.call) manquant");
  const header = members
    ? ['import java.util.*;', 'public class Exercice extends __Env {']
    : ['import java.util.*;', 'public class Exercice extends __Env {', `static void __run(${params}) {`];
  const code = studentCode.replace(/\r\n?/g, '\n').replace(/^﻿/, '');
  // declareOnly : on affecte « (Type) null » pour vérifier existence + type SANS lire la variable (Java refuse de lire une variable non initialisée).
  const caps = spec.expectedVariables.map((v) => (v.declareOnly ? `${v.name} = (${v.type}) null;` : `ipa.Cap.v("${v.name}", ${v.name});`)).join(' ');

  const calls = spec.tests.map((t) => {
    const args = spec.givenVariables.map((v) => {
      const jv = t.inputs[v.name];
      if (!jv) throw new Error(`Test ${t.id} : entrée « ${v.name} » manquante`);
      return javaLiteral(v.type, jv.value);
    });
    const scene = sceneArray(spec.kind, t);
    const dims = spec.kind === 'drawing' ? ` __Env.width = ${scene[0]}; __Env.height = ${scene[1]};` : '';
    return `    if (ipa.Driver.test(${JSON.stringify(t.id)}, new int[]{${scene.join(',')}})) {${dims} try { __run(${args.join(', ')}); } catch (Throwable __e) { ipa.Driver.fail(__e); } } ipa.Driver.end();`;
  });

  // 'members' : le code de l'étudiant (méthodes) est au niveau de la classe ; __run appelle sa méthode sur une instance (static ou non).
  const memberRun = members ? [
    `void __go(${params}) { ${spec.member!.result ? `ipa.Cap.v("resultat", ${spec.member!.call});` : `${spec.member!.call};`} }`,
    `static void __run(${params}) { new Exercice().__go(${spec.givenVariables.map((v) => v.name).join(', ')}); }`,
  ] : [];
  const exercice = [
    ...header, code, ...(members ? ['', ...memberRun] : [`;${caps}`, '}']),
    'public static void main(String[] __a) {',
    `    ipa.Driver.begin(${per}, ${total});`,
    ...calls,
    '}', '}',
  ].join('\n');

  return {
    files: [
      { name: '__Env.java', source: envSource(spec.tools, { canvasVars: spec.kind === 'drawing' }) },
      { name: 'Exercice.java', source: exercice },
    ],
    mainClass: 'Exercice',
    lineOffset: header.length,
    studentLines: code.split('\n').length,
    expectedVariables: spec.expectedVariables.map((v) => v.name),
  };
}

export function packFiles(files: JavaSourceFile[]): string {
  return files.map((f) => `${f.name}\u0001${f.source}`).join('\u0000');
}

/** Options ECJ communes navigateur / tests locaux : syntaxe Java 8, API limitée par stub-rt.jar. */
export function ecjOptions(stubJar: string, harnessJar: string): string {
  return `-1.8 -bootclasspath ${stubJar} -classpath ${harnessJar}`;
}
