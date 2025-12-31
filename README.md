# ArbreGenealogique

Application Angular pour créer et explorer un arbre généalogique moderne.

## Démarrage rapide

- Installer les dépendances: `npm install`
- Lancer le serveur de dev: `npm start` puis ouvrir http://localhost:4200

## Guide d'utilisation

Un guide pas à pas est intégré à l'application:
- Cliquez sur le bouton « Guide » (icône ❓) dans l'en‑tête pour l'ouvrir.
- Naviguez avec « Suivant » et « Précédent ».
- Cliquez en dehors de la fenêtre ou appuyez sur Échap pour fermer.

Le guide vous accompagne pour:
- Créer votre première famille
- Ajouter vos premières personnes
- Parcourir les différentes vues (Arbre, Liste, Chronologie, Carte)
- Importer/Exporter vos données

## Scripts utiles

- `npm start`: démarre l'app en mode développement (rechargement à chaud)
- `npm run build`: construit l'app pour la prod dans `dist/`
- `npm test`: lance les tests unitaires

## Outils

Projet généré avec [Angular CLI](https://github.com/angular/angular-cli) 17.1.

# Arbre Généalogique — Connexion au backend Spring Boot

Cette application Angular peut fonctionner en mode local (stockage JSON/localStorage) ou se connecter à un backend Spring Boot via HTTP.

## Connexion backend (désormais activée par défaut)

1. Démarrez votre backend Spring Boot (par défaut sur http://localhost:8080) avec les endpoints:
   - GET /api/families
   - POST /api/families
   - PATCH /api/families/{id}
   - DELETE /api/families/{id}
   - GET /api/persons/by-family/{familyId}
   - POST /api/persons
   - PATCH /api/persons/{id}
   - DELETE /api/persons/{id}
   Assurez le CORS pour http://localhost:4200 (dev Angular).

2. L’application enregistre désormais par défaut via l’API Spring Boot. Si votre API n’est pas sur localhost:8080, configurez l’URL:
```js
localStorage.setItem('apiBaseUrl', 'http://localhost:8080/api');
```

3. Pour FORCER le mode local (sans backend), utilisez:
```js
localStorage.setItem('useBackend', 'false');
```
Puis rechargez l’application. Remettez le backend en retirant ce drapeau:
```js
localStorage.removeItem('useBackend');
```

4. Rechargez l'application Angular. Les familles et personnes seront chargées/sauvegardées via l’API quand disponible.

## Notes techniques

- Un service ApiService encapsule les appels HTTP.
- JsonDatabaseService conserve l'API utilisée par le composant mais délègue au backend si `useBackend==='true'`.
- AppComponent importe HttpClientModule pour permettre les requêtes.
- Mappage simple des personnes: `prenom/nom/genre` (front) <-> `firstName/lastName/gender` (backend). Le champ `parentId` côté front est converti en `fatherId` ou `motherId` côté backend suivant le genre (simplification initiale).
- En backend, prévoyez la configuration CORS (ex.: `@CrossOrigin(origins = "http://localhost:4200")` sur les contrôleurs, ou config globale).
- Sécurité anti-boucles: un intercepteur HTTP côté Angular nettoie les réponses de l'API pour éviter les objets récursifs (ex: Family.members -> Person.family -> ...). Il ne conserve que les champs utiles pour `/api/families` et `/api/persons/by-family/{id}`.

## Limitations actuelles
- La reconstruction de l'arbre à partir des personnes du backend se base sur `parentId` (dérivé de `fatherId` ou `motherId`). Adaptez selon votre modèle exact si nécessaire.
- Les opérations sont optimistes côté UI et un rafraîchissement depuis le backend est effectué après création/mise à jour/suppression.

