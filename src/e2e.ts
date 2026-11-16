// Crochet de test E2E : chargé UNIQUEMENT quand le build est fait avec VITE_E2E=1 (jamais en production).
import { evaluate } from '@/java/evaluate';
import { javaRunner, useJavaStatus } from '@/java/runner';

(window as unknown as { __ipa: unknown }).__ipa = { evaluate, javaRunner, useJavaStatus };
