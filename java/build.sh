#!/usr/bin/env bash
# Compile le harnais Java → public/java/ipa-harness.jar (cible Java 8 : tourne dans CheerpJ).
# Prérequis : JDK ≥ 17 ; ecj.jar et asm.jar présents dans public/java/ (voir docs/05 §4).
set -euo pipefail
cd "$(dirname "$0")/.."
OUT=build/java-classes
rm -rf "$OUT" && mkdir -p "$OUT" public/java
CP="public/java/ecj.jar:public/java/asm.jar"
javac --release 8 -nowarn -encoding UTF-8 -cp "$CP" -d "$OUT" java/harness/src/ipa/*.java
jar cf public/java/ipa-harness.jar -C "$OUT" .
echo "ipa-harness.jar : $(wc -c < public/java/ipa-harness.jar) octets"
