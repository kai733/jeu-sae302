# IA ou IA pas ?

Ce projet est un jeu web "IA ou IA pas ?" inpiré du jeu Linkterpol qui met au défi les joueurs de distinguer les images générées par une intelligence artificielle des images réelles. Il propose un mode solo et un mode multijoueur.

* Essayer en ligne [IA ou IA pas ?](https://ia-ou-ia-pas.onrender.com/)

## Fonctionnalités

*   **Mode Solo** : Jouez contre la montre pour identifier autant d'images que possible.
*   **Mode Multijoueur** : Créez ou rejoignez des salons (lobbies) pour affronter d'autres joueurs en temps réel.
*   **Système de Lobby** : Gestion des joueurs, paramètres de partie personnalisables (nombre de manches, temps par manche, catégories).

## Prérequis

*   [Node.js](https://nodejs.org/) (version 14 ou supérieure recommandée)
*   NPM (inclus avec Node.js)

## Installation et Lancement

Suivez ces étapes pour installer et lancer le projet sur votre machine locale :

1.  **Cloner ou télécharger le projet**
    Assurez-vous d'avoir les fichiers du projet sur votre ordinateur.

2.  **Ouvrir un terminal**
    Ouvrez votre invite de commande (cmd, PowerShell ou terminal).

3.  **Accéder au dossier backend**
    Naviguez vers le dossier `backend` du projet :
    ```bash
    cd backend
    ```

4.  **Installer les dépendances**
    Installez les paquets nécessaires listés dans `package.json` :
    ```bash
    npm install
    ```

5.  **Lancer le serveur**
    Démarrez le serveur Node.js :
    ```bash
    npm start
    ```
    *Pour le développement avec redémarrage automatique, vous pouvez utiliser `npm run dev`.*

6.  **Accéder au jeu**
    Ouvrez votre navigateur web et allez à l'adresse suivante :
    [http://localhost:3000](http://localhost:3000)

## Structure du Projet

*   `backend/` : Contient le code du serveur (Node.js, Express, Socket.io) et la base de données SQLite.
*   `frontend/` : Contient les fichiers statiques (HTML, CSS, JavaScript) pour l'interface utilisateur.
*   `media/` : Contient les images utilisées pour le jeu.

## Technologies Utilisées

*   **Backend** : Node.js, Express, Socket.io, SQLite3
*   **Frontend** : HTML5, CSS3, JavaScript (Vanilla)
