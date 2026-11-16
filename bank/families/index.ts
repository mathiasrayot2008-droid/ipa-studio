import type { FamilyDefinition } from '@/types/bank';
import accumulation from './accumulation';
import convUnites from './convUnites';
import diviseurs from './diviseurs';
import grilleMotif from './grilleMotif';
import minMaxN from './minMaxN';
import strAcces from './strAcces';
import strCompte from './strCompte';
import switchMenu from './switchMenu';
import tab2DInit from './tab2DInit';
import tabDeclAcces from './tabDeclAcces';
import tabInsertion from './tabInsertion';
import tabStat from './tabStat';
import tranches from './tranches';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const FAMILIES: FamilyDefinition<any>[] = [convUnites, minMaxN, accumulation, diviseurs, tabStat, tabInsertion, tab2DInit, strCompte, strAcces, grilleMotif, switchMenu, tranches, tabDeclAcces];
