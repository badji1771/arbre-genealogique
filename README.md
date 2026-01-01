# 🌳 Arbre Généalogique Moderne

Une application Angular interactive et intuitive pour créer, visualiser et explorer votre histoire familiale.

![Angular](https://img.shields.io/badge/Angular-17.1-DD0031?style=for-the-badge&logo=angular)
![Spring Boot](https://img.shields.io/badge/Spring_Boot-3.2-6DB33F?style=for-the-badge&logo=spring-boot)

## ✨ Fonctionnalités Clés

### 🗂️ Gestion Complète
- **Familles & Personnes** : Créez plusieurs arbres indépendants. Ajoutez des membres avec des détails riches (dates, notes, photos, coordonnées).
- **Relations Complexes** : Support des liens parents-enfants et des conjoints.

### 📊 Visualisations Multiples
- **Vue Arbre** : Visualisation hiérarchique classique et dynamique.
- **Vue Liste** : Recherche et filtrage rapide de tous les membres.
- **Vue Chronologique** : Frise historique des événements familiaux.
- **Vue Carte** : Localisation géographique des membres (basée sur les adresses).

### 📤 Échanges & Sauvegarde
- **Import/Export JSON** : Sauvegardez l'intégralité de vos données dans un fichier simple.
- **Support GEDCOM** : Importez vos données depuis d'autres logiciels de généalogie.
- **Export Excel** : Générez des tableaux récapitulatifs de vos membres.

### 🛠️ Flexibilité Technique
- **Mode Hybride** : Fonctionne en local (localStorage) ou connecté à un serveur **Spring Boot**.
- **Interface Responsive** : Optimisé pour ordinateur et tablettes.

---

## 🚀 Démarrage Rapide

### Prérequis
- Node.js (v18+)
- npm

### Installation
1. Clonez le dépôt.
2. Installez les dépendances :
   ```bash
   npm install
   ```
3. Lancez le serveur de développement :
   ```bash
   npm start
   ```
4. Ouvrez [http://localhost:4200](http://localhost:4200) dans votre navigateur.

---

## 🔌 Connexion au Backend (Spring Boot)

L'application est configurée pour communiquer avec une API REST. Par défaut, elle cherche à joindre `http://localhost:8080/api`.

### Configuration de l'API
Vous pouvez changer l'URL de l'API directement depuis la console de votre navigateur :
```javascript
localStorage.setItem('apiBaseUrl', 'http://localhost:8080/api');
```

### Basculer en mode local uniquement
Pour ignorer le backend et utiliser uniquement le stockage du navigateur :
```javascript
localStorage.setItem('useBackend', 'false');
```

---

## 📖 Guide d'Utilisation

Un **Guide Interactif** est intégré ! Cliquez sur l'icône ❓ dans l'en-tête de l'application pour lancer une visite guidée des fonctionnalités.

---

## 🛠️ Scripts Utiles

| Commande | Description |
| :--- | :--- |
| `npm start` | Démarre l'application en mode dev |
| `npm run build` | Compile l'application pour la production (`dist/`) |
| `npm test` | Lance les tests unitaires avec Karma |

---

## 📝 Notes Techniques

- **CORS** : Si vous utilisez un backend personnalisé, assurez-vous d'autoriser les requêtes venant de `http://localhost:4200`.
- **Mappage des données** : L'application gère automatiquement la conversion entre le modèle de données Front (camelCase) et les attentes du Backend.
- **Sécurité** : Un intercepteur HTTP est inclus pour nettoyer les références circulaires lors des échanges avec l'API.

---
Développé avec ❤️ pour les passionnés de généalogie.

