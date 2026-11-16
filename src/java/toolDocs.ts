import type { ToolConfig } from '@/types/bank';

export interface ToolDoc { signature: string; description: string; kind: 'output' | 'math' | 'draw' | 'grid' | 'runner' | 'debug' }

/** Documentation des outils affichée dans l'énoncé (rubrique « Outils ») et utilisée par l'autocomplétion. */
export function toolDoc(c: ToolConfig): ToolDoc {
  const nl = c.newline === false ? 'sans passer à la ligne' : 'puis retourne à la ligne';
  switch (c.id) {
    case 'affiche': return { kind: 'output', signature: 'void affiche(String message)', description: `Affiche le message passé en paramètre, ${nl}.` };
    case 'afficheEntier': return { kind: 'output', signature: 'void afficheEntier(int i)', description: `Affiche l'entier passé en paramètre, ${nl}.` };
    case 'afficheReel': return { kind: 'output', signature: 'void afficheReel(double d)', description: c.decimals ? `Affiche le réel avec ${c.decimals} décimales, ${nl}.` : `Affiche le réel passé en paramètre, ${nl}.` };
    case 'afficheReels': return { kind: 'output', signature: 'void afficheReels(double f, double g)', description: `Affiche les réels f et g${c.decimals ? ` avec ${c.decimals} décimales` : ''}, l'un après l'autre.` };
    case 'afficheBooleen': return { kind: 'output', signature: 'void afficheBooleen(boolean b)', description: `Affiche le booléen passé en paramètre, ${nl}.` };
    case 'debug': return { kind: 'debug', signature: 'void debug(TYPE value)', description: 'Affiche dans la sortie de debug la valeur passée en paramètre (n\'importe quel type primitif ou String). Cette sortie n\'est pas notée.' };
    case 'PI': return { kind: 'math', signature: 'PI', description: 'Un réel représentant la valeur de π, avec une précision de 10 décimales.' };
    case 'pgcd': return { kind: 'math', signature: 'int pgcd(int a, int b)', description: 'Retourne le plus grand diviseur commun des deux entiers passés en paramètre.' };
    case 'sqrt': return { kind: 'math', signature: 'double sqrt(double f)', description: 'Retourne la racine carrée de l\'argument.' };
    case 'sin': return { kind: 'math', signature: 'double sin(double angle)', description: 'Calcule le sinus de l\'angle passé en paramètre, exprimé en radians.' };
    case 'cos': return { kind: 'math', signature: 'double cos(double angle)', description: 'Calcule le cosinus de l\'angle passé en paramètre, exprimé en radians.' };
    case 'distance': return { kind: 'math', signature: 'double distance(double x1, double y1, double x2, double y2)', description: 'Calcule et retourne la distance euclidienne entre les points (x1, y1) et (x2, y2).' };
    case 'setFillColor': return { kind: 'draw', signature: 'void setFillColor(String color)', description: 'Règle la couleur de remplissage. Valeurs possibles : "white", "black", "red", "green", "blue", "yellow", "orange", "brown", "gray", "pink", "purple", "cyan".' };
    case 'rectangle': return { kind: 'draw', signature: 'void rectangle(int x, int y, int width, int height)', description: 'Dessine un rectangle rempli commençant en (x, y) et de dimensions width × height.' };
    case 'isoTriangle': return { kind: 'draw', signature: 'void isoTriangle(int x, int y, int width, int height)', description: 'Dessine un triangle isocèle rempli : base horizontale en y, de x à x + width ; sommet à y + height (une hauteur négative donne un triangle pointe en haut).' };
    case 'circle': return { kind: 'draw', signature: 'void circle(int x, int y, int radius)', description: 'Dessine un disque de centre (x, y) et de rayon radius.' };
    case 'line': return { kind: 'draw', signature: 'void line(int x1, int y1, int x2, int y2)', description: 'Trace un trait de la couleur de remplissage courante entre (x1, y1) et (x2, y2).' };
    case 'startPolygon': return { kind: 'draw', signature: 'void startPolygon()', description: 'Commence un nouveau polygone. Le polygone précédent, s\'il existe, doit être terminé d\'abord.' };
    case 'addPoint': return { kind: 'draw', signature: 'void addPoint(int x, int y)', description: 'Ajoute un point au polygone courant, de coordonnées (x, y).' };
    case 'stopPolygon': return { kind: 'draw', signature: 'void stopPolygon()', description: 'Termine le polygone courant : le dernier point est relié au premier et l\'intérieur est rempli avec la couleur courante.' };
    case 'fillCase': return { kind: 'grid', signature: 'void fillCase(int x, int y)', description: 'Remplit la case de coordonnées (x, y) avec la couleur de remplissage courante.' };
    case 'moveUp': return { kind: 'runner', signature: 'void moveUp()', description: 'Déplace le personnage d\'une case vers le nord.' };
    case 'moveDown': return { kind: 'runner', signature: 'void moveDown()', description: 'Déplace le personnage d\'une case vers le sud.' };
    case 'moveLeft': return { kind: 'runner', signature: 'void moveLeft()', description: 'Déplace le personnage d\'une case vers l\'ouest.' };
    case 'moveRight': return { kind: 'runner', signature: 'void moveRight()', description: 'Déplace le personnage d\'une case vers l\'est.' };
    case 'warmer': return { kind: 'runner', signature: 'boolean warmer()', description: 'Retourne true si le dernier déplacement nous a rapproché du but, false autrement.' };
    case 'canvasSize': return { kind: 'draw', signature: 'int width, height', description: 'Dimensions de la toile.' };
  }
}

/** Nom d'appel pour l'autocomplétion (« fillCase », « PI »…). */
export const toolName = (d: ToolDoc) => d.signature.replace(/^(?:void|int|double|boolean)\s+/, '').replace(/\(.*$/, '').trim();
