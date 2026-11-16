import type { FamilyDefinition, Rng } from '@/types/bank';
import { rows } from './kit';

interface T { v: string; out: string }
const params = (rng: Rng): T => ({ v: rng.pick(['poids', 'p', 'masse']), out: rng.pick(['prix', 'tarif', 'cout']) });

const family: FamilyDefinition<T> = {
  id: 'tranches', title: 'Conditions en cascade et tranches', notions: { primary: 'N07-conditions-cascades', secondary: ['N04-if-else', 'N05-logique-comparaisons'] }, kind: 'snippet',
  variants: [
    {
      id: 'mention', label: 'note → mention', difficulty: 2, estimatedMinutes: 8, params: (rng) => ({ v: rng.pick(['note', 'n', 'moyenne']), out: rng.pick(['mention', 'm', 'appreciation']) }),
      statement: (p) => `L’entier \`${p.v}\` (de 0 à 20) est déjà déclaré et initialisé.\n\nDéclarez une chaîne \`${p.out}\` valant :\n\n- "insuffisant" si ${p.v} < 10 ;\n- "passable" si 10 ≤ ${p.v} < 12 ;\n- "assez bien" si 12 ≤ ${p.v} < 14 ;\n- "bien" si 14 ≤ ${p.v} < 16 ;\n- "tres bien" si ${p.v} ≥ 16.`,
      given: (p) => [{ name: p.v, type: 'int', description: '' }],
      expect: (p) => [{ name: p.out, type: 'String' }],
      reference: (p) => `String ${p.out};\nif (${p.v} < 10) {\n    ${p.out} = "insuffisant";\n} else if (${p.v} < 12) {\n    ${p.out} = "passable";\n} else if (${p.v} < 14) {\n    ${p.out} = "assez bien";\n} else if (${p.v} < 16) {\n    ${p.out} = "bien";\n} else {\n    ${p.out} = "tres bien";\n}`,
      mutants: (p) => [
        { id: 'bornes-incluses', label: '<= au lieu de <', explanationFr: 'La tranche « passable » commence à 10 inclus et finit avant 12 : 12 est « assez bien ».', code: `String ${p.out};\nif (${p.v} <= 10) {\n    ${p.out} = "insuffisant";\n} else if (${p.v} <= 12) {\n    ${p.out} = "passable";\n} else if (${p.v} <= 14) {\n    ${p.out} = "assez bien";\n} else if (${p.v} <= 16) {\n    ${p.out} = "bien";\n} else {\n    ${p.out} = "tres bien";\n}` },
        { id: 'ordre-inverse', label: 'tests dans le mauvais ordre', explanationFr: 'Avec `>= 10` en premier, toutes les notes à partir de 10 sont « passable » : en cascade, teste les tranches dans l’ordre qui rend chaque test exact.', code: `String ${p.out};\nif (${p.v} >= 10) {\n    ${p.out} = "passable";\n} else if (${p.v} >= 12) {\n    ${p.out} = "assez bien";\n} else if (${p.v} >= 14) {\n    ${p.out} = "bien";\n} else if (${p.v} >= 16) {\n    ${p.out} = "tres bien";\n} else {\n    ${p.out} = "insuffisant";\n}` },
        { id: 'oublie-tranche', label: 'tranche « bien » oubliée', explanationFr: 'Il y a cinq mentions : n’en oublie aucune.', code: `String ${p.out};\nif (${p.v} < 10) {\n    ${p.out} = "insuffisant";\n} else if (${p.v} < 12) {\n    ${p.out} = "passable";\n} else if (${p.v} < 14) {\n    ${p.out} = "assez bien";\n} else if (${p.v} < 16) {\n    ${p.out} = "assez bien";\n} else {\n    ${p.out} = "tres bien";\n}` },
      ],
      tests: (p) => rows([p.v], [[8], [13], [10], [12], [14], [16], [20], [0]], 2, true),
      hints: () => ['Les tranches ne se chevauchent pas : une cascade de if / else if les teste dans l’ordre.', 'Teste du plus petit seuil au plus grand : `if (note < 10) … else if (note < 12) … else if (note < 14) …`. Chaque else if sait déjà que les conditions précédentes sont fausses.', 'Finis par un else pour la dernière tranche (note ≥ 16).'],
    },
    {
      id: 'tarif-poste', label: 'tarif postal par tranches de poids', difficulty: 3, estimatedMinutes: 10, params,
      statement: (p) => `L’entier \`${p.v}\` (≥ 1) donne le poids d’un colis en grammes.\n\nDéclarez un réel \`${p.out}\` (en euros) : 1.0 jusqu’à 20 g inclus ; 2.5 jusqu’à 100 g inclus ; 4.0 jusqu’à 250 g inclus ; 6.0 jusqu’à 500 g inclus ; 9.0 au-delà.`,
      given: (p) => [{ name: p.v, type: 'int', description: '' }],
      expect: (p) => [{ name: p.out, type: 'double' }],
      reference: (p) => `double ${p.out};\nif (${p.v} <= 20) {\n    ${p.out} = 1.0;\n} else if (${p.v} <= 100) {\n    ${p.out} = 2.5;\n} else if (${p.v} <= 250) {\n    ${p.out} = 4.0;\n} else if (${p.v} <= 500) {\n    ${p.out} = 6.0;\n} else {\n    ${p.out} = 9.0;\n}`,
      mutants: (p) => [
        { id: 'bornes-strictes', label: '< au lieu de <=', explanationFr: 'Les bornes sont incluses : 20 g coûte 1.0, 100 g coûte 2.5…', code: `double ${p.out};\nif (${p.v} < 20) {\n    ${p.out} = 1.0;\n} else if (${p.v} < 100) {\n    ${p.out} = 2.5;\n} else if (${p.v} < 250) {\n    ${p.out} = 4.0;\n} else if (${p.v} < 500) {\n    ${p.out} = 6.0;\n} else {\n    ${p.out} = 9.0;\n}` },
        { id: 'ordre-inverse', label: 'seuil le plus grand testé en premier', explanationFr: 'Si tu testes `<= 500` en premier, tous les petits colis tombent dans cette tranche. Teste les seuils du plus petit au plus grand.', code: `double ${p.out};\nif (${p.v} <= 500) {\n    ${p.out} = 6.0;\n} else if (${p.v} <= 250) {\n    ${p.out} = 4.0;\n} else if (${p.v} <= 100) {\n    ${p.out} = 2.5;\n} else if (${p.v} <= 20) {\n    ${p.out} = 1.0;\n} else {\n    ${p.out} = 9.0;\n}` },
        { id: 'tranche-oubliee', label: 'tranche 100–250 g oubliée', explanationFr: 'Il y a cinq tarifs : un colis de 150 g est dans la tranche « jusqu’à 250 g » (4.0).', code: `double ${p.out};\nif (${p.v} <= 20) {\n    ${p.out} = 1.0;\n} else if (${p.v} <= 100) {\n    ${p.out} = 2.5;\n} else if (${p.v} <= 500) {\n    ${p.out} = 6.0;\n} else {\n    ${p.out} = 9.0;\n}` },
      ],
      tests: (p) => rows([p.v], [[15], [180], [20], [100], [250], [500], [501], [1]], 2, true),
      hints: () => ['Ordonne les seuils du plus petit au plus grand ; le premier test vrai donne le tarif.', 'if (poids <= 20) … else if (poids <= 100) … : le « else » garantit que les cas précédents sont exclus.', 'Le dernier else gère tout ce qui dépasse 500 g.'],
    },
    {
      id: 'impot-progressif', label: 'impôt progressif par paliers', difficulty: 4, estimatedMinutes: 14, params: (rng) => ({ v: rng.pick(['revenu', 'r', 'salaire']), out: rng.pick(['impot', 'taxe', 'tax']) }),
      statement: (p) => `L’entier \`${p.v}\` (≥ 0) est un revenu annuel en euros.\n\nDéclarez un réel \`${p.out}\` égal à l’impôt, calculé **par tranches** : rien jusqu’à 10 000 € ; 10 % de la part comprise entre 10 000 € et 30 000 € ; 20 % de la part au-delà de 30 000 €.\n\nExemples : 8 000 → 0 ; 20 000 → 1 000 ; 40 000 → 2 000 + 2 000 = 4 000.`,
      given: (p) => [{ name: p.v, type: 'int', description: '' }],
      expect: (p) => [{ name: p.out, type: 'double' }],
      reference: (p) => `double ${p.out} = 0;\nif (${p.v} > 30000) {\n    ${p.out} = 2000 + (${p.v} - 30000) * 0.2;\n} else if (${p.v} > 10000) {\n    ${p.out} = (${p.v} - 10000) * 0.1;\n}`,
      mutants: (p) => [
        { id: 'oublie-palier-precedent', label: 'palier à 10 % oublié au-delà de 30 000', explanationFr: 'Au-delà de 30 000 €, il faut aussi compter les 2 000 € d’impôt de la tranche à 10 % (20 000 × 10 %).', code: `double ${p.out} = 0;\nif (${p.v} > 30000) {\n    ${p.out} = (${p.v} - 30000) * 0.2;\n} else if (${p.v} > 10000) {\n    ${p.out} = (${p.v} - 10000) * 0.1;\n}` },
        { id: 'taux-global', label: 'taux appliqué à tout le revenu', explanationFr: 'Le taux ne s’applique qu’à la part de revenu située dans la tranche, pas à tout le revenu.', code: `double ${p.out} = 0;\nif (${p.v} > 30000) {\n    ${p.out} = ${p.v} * 0.2;\n} else if (${p.v} > 10000) {\n    ${p.out} = ${p.v} * 0.1;\n}` },
        { id: 'seuil-inclus', label: '>= au lieu de >', explanationFr: 'Exactement 10 000 € n’est pas imposé ; la tranche commence au-dessus.', code: `double ${p.out} = 0;\nif (${p.v} >= 30000) {\n    ${p.out} = 2000 + (${p.v} - 30000) * 0.2;\n} else if (${p.v} >= 10000) {\n    ${p.out} = (${p.v} - 10000) * 0.1 + 1;\n}` },
      ],
      tests: (p) => rows([p.v], [[8000], [20000], [40000], [10000], [30000], [30001], [0], [100000]], 2, true),
      hints: () => ['Plusieurs tranches : on calcule la part du revenu dans chaque tranche, puis on applique le taux de la tranche.', 'Au-delà de 30 000 : impôt = (impôt complet de la tranche à 10 %, soit 2 000) + 20 % de la part au-dessus de 30 000.', 'if (revenu > 30000) { impot = 2000 + (revenu - 30000) * 0.2; } else if (revenu > 10000) { impot = (revenu - 10000) * 0.1; }'],
    },
  ],
};
export default family;
