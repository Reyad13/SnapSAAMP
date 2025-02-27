**SnapSAAMP**

**SnapSAAMP** est une application React Native (Expo) permettant de prendre des photos (avec ou sans signature), de gérer des lots (AS400), et d’uploader des images vers la GED (Maileva).

  

**Sommaire**

1.  Fonctionnalités
2.  Architecture
3.  Prérequis
4.  Installation
5.  Côté Serveur (Node.js)
6.  Côté Application (Expo)
7.  Lancement
8.  Serveur
9.  Application
10.  Création d’une APK
11.  Workflow Typique
12.  Auteurs

  

**Fonctionnalités**

-   **Saisie du code de lot** → Interrogation de l’AS400 (via ODBC).
-   **Prise de photo** (Expo Camera) + **Signature** (react-native-signature-canvas).
-   **Upload** vers la **GED** (Maileva) via API.
-   **Mise à jour** de NBAPEL si réception avec signature.

  

**Architecture**

bash

CopierModifier

snap-saamp/

├── server.js      # Serveur Node.js (Express + ODBC + node-fetch/axios)

├── package.json

├── .env (facultatif)

├── app.json (ou app.config.js)

├── App.tsx       # Application Expo/React Native

├── ...

└── README.md      # Cette documentation

1.  **server.js** : Définit les endpoints :

-   /api/lotinfo → Récupère infos lot (AS400)
-   /api/update-nbapel → Met à jour NBAPEL (AS400)
-   /upload-to-ged → Uploade la photo signée vers la GED

1.  **App.tsx** :

-   Gère l’interface utilisateur (Expo).
-   Appels API vers le serveur (Node.js).
-   Prise de photo + signature.

  

**Prérequis**

-   **Node.js** 18+ (ou 16 + node-fetch installé).
-   **npm** ou **yarn**.
-   **Expo CLI** (pour l’application).
-   **ODBC** configuré pour l’AS400 (DNS : AS400;UID=BOUREY;PWD=BOUREY).
-   **Android SDK** (si tu veux compiler l’APK localement).

  

**Installation**

**Côté Serveur (Node.js)**

1.  **Cloner** ce dépôt :bash
2.  CopierModifier

5.  git clone https://github.com/ton-organisation/snap-saamp.git
6.  cd snap-saamp
7.    
    

10.  **Installer** les dépendances (dans le même dossier que server.js) :bash
11.  CopierModifier

14.  npm install
15.    
    

18.  **Vérifier** que le DSN ODBC est accessible (ex : AS400).

**Côté Application (Expo)**

1.  Toujours dans le même dossier, assure-toi d’avoir **Expo CLI** (si besoin) :bash
2.  CopierModifier

5.  npm install -g expo-cli
6.    
    

9.  **Installer** les dépendances du projet Expo :bash
10.  CopierModifier

13.  npm install
14.    
    

17.  (les mêmes dépendances, mais contiennent Expo, react-native, etc.)

  

**Lancement**

**Lancement Serveur**

-   Vérifier ta version de Node (≥ 18 recommandé) :bash
-   CopierModifier

-   node -v
-     
    

-   Lancer :bash
-   CopierModifier

-   node server.js
-     
    

-   Par défaut, écoute sur **localhost:3000**.
-   _(Tu peux aussi le lancer avec PM2 : pm2 start server.js --name snap-saamp.)_

**Lancement Application**

-   Ouvrir un terminal, se placer dans le répertoire.
-   Lancer Expo :bash
-   CopierModifier

-   expo start
-     
    

-   Scanner le QR Code avec **Expo Go** (appli mobile).
-   → L’app se charge en mode dev.

  

**Création d’une APK**

Plusieurs possibilités :

1.  **Ancienne méthode** (Expo Legacy) :
2.  bash
3.  CopierModifier

6.  expo build:android -t apk
7.    
    

-   Expo génère un lien de téléchargement. Récupère le .apk.

1.  **Nouvelle méthode EAS** :

-   Installer EAS CLIbash
-   CopierModifier

-   npm install -g eas-cli
-     
    

-   Se connecterbash
-   CopierModifier

-   eas login
-     
    

-   Configurer le buildbash
-   CopierModifier

-   eas build:configure
-     
    

-   Lancer la buildbash
-   CopierModifier

-   eas build -p android --profile production
-     
    

-   Récupérer l’APK (ou AAB) depuis ton compte [expo.dev](https://expo.dev/).

1.  **Installer l’APK** sur un appareil :
2.  bash
3.  CopierModifier

6.  adb install -r app-release.apk
7.    
    

  

**Workflow Typique**

1.  **Utilisateur** lance l’app sur la tablette/Expo Go.
2.  **Saisie d’un code lot** → Requête POST /api/lotinfo (serveur Node.js, ODBC → AS400).
3.  **Photo** et (optionnel) **signature** → Fichier créé en local.
4.  **Upload** du fichier → POST /upload-to-ged → Le serveur s’occupe de Maileva.
5.  **NBAPEL** éventuellement **mis à jour** si réception + signature.

  

**Auteurs**

-   **Toi** et/ou ton équipe.
-   Projet supervisé/maintenu par SAAMP.

  

**Notes complémentaires**

-   Vérifie que fetch est **disponible** sur ta version Node (≥ 18) ou installe node-fetch@2.
-   ODBC configuré pour l’AS400 (DSN, identifiants).
-   Vérifie la **connexion réseau** entre l’app, le serveur, et l’AS400/GED.
