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

snap-saamp/

├── server.js      # Serveur Node.js (Express + ODBC + node-fetch/axios)

├── package.json

├── .env (facultatif)

├── app.json (ou app.config.js)

├── App.tsx       # Application Expo/React Native

├── ...

└── README.md      # documentation

1.  **server.js** : Définit les endpoints :

-   /api/lotinfo → Récupère infos lot (AS400)
-   /api/update-nbapel → Met à jour NBAPEL (AS400)
-   /upload-to-ged → Uploade la photo signée vers la GED

1.  **App.tsx** :

-   Gère l’interface utilisateur (Expo).
-   Appels API vers le serveur (Node.js).
-   Prise de photo + signature.

**Prérequis**

-   **Node.js** 20+.
-   **npm** ou **yarn**.
-   **Expo CLI** (pour l’application).
-   **ODBC** configuré pour l’AS400 (DNS : AS400;UID=BOUREY;PWD=BOUREY).
-   **Android SDK** (APK).

**Installation**

**Côté Serveur (Node.js)**

1.  **Cloner** ce dépôt :
        Git clone https://github.com/ton-organisation/snap-saamp.git
        cd snap-saamp
2.  **Installer** les dépendances (dans le même dossier que server.js) :
         npm install
3.  **Vérifier** que le DSN ODBC est accessible (ex : AS400).

**Côté Application (Expo)**

1.  Toujours dans le même dossier, assure-toi d’avoir **Expo CLI** :
          npm install -g expo-cli
2.  **Installer** les dépendances du projet Expo :
          npm install (les mêmes dépendances, mais contiennent Expo, react-native, etc.)
    
**Lancement**

**Lancement Serveur**

-   Vérifier ta version de Node (≥ 18 recommandé) :
          node -v
-   Lancer :
          node server.js
-   Par défaut, écoute sur **localhost:3000**.
-   _(PM2 : pm2 start server.js --name snap-saamp.)_

**Lancement Application**

-   Ouvrir un terminal, se placer dans le répertoire.
-   Lancer Expo :
        expo start
-   Scanner le QR Code avec **Expo Go**.
   → L’app se charge en mode dev.

**Création d’une APK**

Plusieurs possibilités :

1.  **Expo Legacy** :
       expo build:android -t apk

-   Expo génère un lien de téléchargement.

1bis.  **EAS** :
-   Installer EAS CLI
       npm install -g eas-cli
-   Se connecter
       eas login
-   Configurer le build
       eas build:configure
-   Lancer la build
       eas build -p android --profile production
-   Récupérer l’APK (ou AAB) depuis [expo.dev](https://expo.dev/).

2.  **Installer l’APK** sur un appareil :
        adb install -r app-release.apk
    
**Workflow Typique**

1.  **Utilisateur** lance l’app sur la tablette/Expo Go.
2.  **Saisie d’un code lot** → Requête POST /api/lotinfo (serveur Node.js, ODBC → AS400).
3.  **Photo** et (optionnel) **signature** → Fichier créé en local.
4.  **Upload** du fichier → POST /upload-to-ged → Le serveur s’occupe de Maileva.
5.  **NBAPEL** éventuellement **mis à jour** si réception + signature.

**Auteurs**

-   Reyad BOUZEBOUDJA
-   Projet supervisé/maintenu par SAAMP et Reyad BOUZEBOUDJA.

**Notes complémentaires**

-   Vérifie que fetch est **disponible** sur la version Node (≥ 18) ou installe node-fetch@2.
-   ODBC configuré pour l’AS400 (DSN, identifiants).
-   Vérifie la **connexion réseau** entre l’app, le serveur, et l’AS400/GED.
