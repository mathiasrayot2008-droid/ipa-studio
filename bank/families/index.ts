import type { FamilyDefinition } from '@/types/bank';
import accumulation from './accumulation';
import appelsMath from './appelsMath';
import affectations from './affectations';
import compteurs from './compteurs';
import convUnites from './convUnites';
import dessinScene from './dessinScene';
import diviseurs from './diviseurs';
import doubleBoucle from './doubleBoucle';
import grilleMotif from './grilleMotif';
import minMaxN from './minMaxN';
import predicats from './predicats';
import strAcces from './strAcces';
import strComparaison from './strComparaison';
import strCompte from './strCompte';
import switchMenu from './switchMenu';
import tab2DConv from './tab2DConv';
import tab2DInit from './tab2DInit';
import tabDeclAcces from './tabDeclAcces';
import tabInsertion from './tabInsertion';
import tabStat from './tabStat';
import tranches from './tranches';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const FAMILIES: FamilyDefinition<any>[] = [convUnites, minMaxN, accumulation, diviseurs, tabStat, tabInsertion, tab2DInit, strCompte, strAcces, grilleMotif, switchMenu, tranches, tabDeclAcces, affectations, predicats, compteurs, doubleBoucle, tab2DConv, strComparaison, appelsMath, dessinScene];
