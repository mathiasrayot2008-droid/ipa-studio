export interface NavItem {
  to: string;
  label: string;
  short: string;
  icon: string; // chemin SVG 24×24
  admin?: boolean;
}

export const NAV: NavItem[] = [
  { to: '/', label: 'Tableau de bord', short: 'Accueil', icon: 'M3 11l9-8 9 8v10a1 1 0 01-1 1h-5v-7H9v7H4a1 1 0 01-1-1z' },
  { to: '/tp', label: 'TP Schooding', short: 'TP', icon: 'M4 4h16v4H4zM4 10h16v10H4zM8 14h8' },
  { to: '/entrainement', label: 'Entraînement ciblé', short: 'Entraîn.', icon: 'M12 3l2.5 6H21l-5 4 2 7-6-4-6 4 2-7-5-4h6.5z' },
  { to: '/dst', label: 'DST', short: 'DST', icon: 'M12 7v5l3 2M12 3a9 9 0 100 18 9 9 0 000-18z' },
  { to: '/historique', label: 'Historique', short: 'Histo.', icon: 'M4 12a8 8 0 108-8M4 4v5h5M12 8v4l3 2' },
  { to: '/progression', label: 'Progression', short: 'Progr.', icon: 'M4 20V10M10 20V4M16 20v-8M22 20H2' },
  { to: '/fiches', label: 'Fiches de cours', short: 'Fiches', icon: 'M6 3h9l4 4v14H6zM14 3v5h5M9 13h7M9 17h7' },
  { to: '/atelier', label: 'Atelier Java', short: 'Atelier', icon: 'M8 7l-5 5 5 5M16 7l5 5-5 5M14 4l-4 16' },
  { to: '/parametres', label: 'Paramètres', short: 'Réglages', icon: 'M12 15a3 3 0 100-6 3 3 0 000 6zM19 12a7 7 0 00-.1-1.2l2-1.5-2-3.4-2.3 1a7 7 0 00-2-1.2L14 3h-4l-.6 2.7a7 7 0 00-2 1.2l-2.3-1-2 3.4 2 1.5A7 7 0 005 12c0 .4 0 .8.1 1.2l-2 1.5 2 3.4 2.3-1a7 7 0 002 1.2L10 21h4l.6-2.7a7 7 0 002-1.2l2.3 1 2-3.4-2-1.5c.1-.4.1-.8.1-1.2z' },
];

/** Les 5 entrées de la barre d'onglets mobile ; le reste passe par « Plus ». */
export const MOBILE_PRIMARY = ['/', '/tp', '/entrainement', '/dst'];
