# Révizo – l'app de révision connectée à Pronote

Application Android (Expo / React Native, TypeScript) pour lycéens : emploi du temps, devoirs, contenu des cours, notes et vie scolaire synchronisés depuis Pronote à chaque ouverture, avec une IA (Claude) qui connaît toutes tes données.

## Fonctionnalités

- **Connexion** : monlycee.net (WebView, tu tapes toi-même ton mot de passe sur la page officielle), QR code Pronote + code PIN, identifiants Pronote directs, ou compte démo.
- **Synchro automatique** à chaque ouverture (et au retour dans l'app après 15 min), tirer vers le bas pour forcer. Les données restent consultables hors-ligne.
- **Accueil** : cours en cours / prochain cours, plan de travail du soir généré par l'IA, devoirs à rendre, contrôles à venir, priorités, dernières notes.
- **Emploi du temps** sur 2 semaines (cours annulés, évaluations, salles, profs).
- **Devoirs** : liste par jour, coché synchronisé avec Pronote, résumé et découpage par l'IA, récap global.
- **Notes** : moyennes par période et par matière, comparaison avec la classe, détail des notes, simulateur « quelle note me faut-il ».
- **Réviser** :
  - Contrôles détectés automatiquement (évaluations Pronote + devoirs contenant « contrôle », « DS », « interro »…) ou ajoutés à la main → planning de révision, fiche, flashcards, quiz QCM corrigé.
  - Priorités : classement des matières (coefficient × écart à l'objectif × urgence × charge), coefficients réglables.
  - Lacunes : analyse IA de toutes les notes + exercices ciblés corrigés.
  - Cours : cahier de textes par matière + fiche de révision IA + quiz.
  - Coach IA : chat qui connaît ton emploi du temps, tes devoirs, tes cours et tes notes.
- **Vie scolaire** : absences et retards.
- Mode clair / sombre automatique.

## IA

Dans *Réglages*, colle ta clé API Claude (console.anthropic.com → API Keys). Elle est chiffrée sur le téléphone (expo-secure-store). Toutes les données Pronote sont envoyées à l'IA, sans filtrage (usage personnel). Modèle par défaut : `claude-sonnet-5-5` (modifiable).

## Développer

```bash
npm install
npx expo run:android      # sur un téléphone branché ou un émulateur
```

Compte de démonstration Pronote : bouton « Essayer avec le compte démo ».

## Construire l'APK

Option 1 – EAS (cloud Expo) :
```bash
npm i -g eas-cli && eas login
eas build -p android --profile preview
```

Option 2 – en local (SDK Android + NDK 27.1 installés) :
```bash
npx expo prebuild -p android
cd android && ./gradlew assembleRelease
# → android/app/build/outputs/apk/release/app-release.apk
```

L'APK est signé avec la clé de debug : parfait pour l'installer sur ton téléphone, pas pour le Play Store.

## Structure

```
App.tsx                 navigation (onglets + pile d'écrans)
src/pronote/auth.ts     connexions (ENT, QR, identifiants, démo), jeton chiffré, reconnexion
src/pronote/sync.ts     récupération EDT, devoirs, cahier de textes, notes, vie scolaire
src/ai/claude.ts        appel API Claude + contexte complet + prompts
src/priority.ts         algorithme de priorisation
src/store.tsx           état global, cache hors-ligne, réglages
src/screens/*           écrans
```

Données Pronote via [Pawnote](https://github.com/LiterateInk/Pawnote) (fork `@blockshub/pawnote-lts`), API non officielle et non affiliée à Index-Éducation. La technique de connexion ENT s'inspire de l'app open source Papillon.
