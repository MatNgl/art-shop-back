<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

<p align="center">
  <a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
  <a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
  <a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
</p>

# 🎨 Art Shop — Backend API

> Plateforme de vente en ligne dédiée à un artiste unique, valorisant la dimension artistique des œuvres.

---

## 📋 Table des matières

- [Stack technique](#-stack-technique)
- [Prérequis](#-prérequis)
- [Installation](#-installation)
- [Docker](#-docker)
- [Lancement du projet](#-lancement-du-projet)
- [Migrations TypeORM](#-migrations-typeorm)
- [Seeds (données initiales)](#-seeds-données-initiales)
- [Prettier (formatage)](#-prettier-formatage)
- [ESLint (qualité de code)](#-eslint-qualité-de-code)
- [Tests](#-tests)
- [Documentation API](#-documentation-api)
- [Structure du projet](#-structure-du-projet)

---

## 🛠 Stack technique

| Technologie | Rôle |
|-------------|------|
| **NestJS** | Framework backend Node.js |
| **TypeScript** | Typage strict |
| **PostgreSQL** | Base de données relationnelle |
| **TypeORM** | ORM pour la gestion des entités |
| **Passport + JWT** | Authentification |
| **Swagger** | Documentation API |
| **Docker** | Conteneurisation |

---

## 📦 Prérequis

- **Node.js** >= 18.x
- **npm** >= 9.x
- **Docker** et **Docker Compose**
- **Git**

---

## 🚀 Installation

```bash
# Cloner le repository
git clone <url-du-repo>
cd art-shop-back

# Installer les dépendances
npm install

# Copier le fichier d'environnement
cp .env.example .env
# Puis éditer .env avec vos valeurs
```

---

## 🐳 Docker

Docker Compose gère PostgreSQL, CloudBeaver (interface BDD) et le Dev Hub.

### Commandes Docker

```bash
# Démarrer tous les services (en arrière-plan)
docker-compose up -d

# Démarrer et voir les logs
docker-compose up

# Arrêter tous les services
docker-compose down

# Arrêter et supprimer les volumes (reset complet de la BDD)
docker-compose down -v

# Voir les logs d'un service spécifique
docker-compose logs postgres
docker-compose logs cloudbeaver

# Reconstruire les images après modification
docker-compose up -d --build

# Vérifier l'état des conteneurs
docker-compose ps
```

### Services disponibles

| Service | URL | Description |
|---------|-----|-------------|
| **PostgreSQL** | `localhost:5432` | Base de données |
| **CloudBeaver** | `http://localhost:8080` | Interface web pour la BDD |
| **Dev Hub** | `http://localhost:8000` | Page d'accueil développeur |

---

## ▶️ Lancement du projet

```bash
# Mode développement (avec hot-reload)
npm run start:dev

# Mode standard
npm run start

# Mode debug (avec inspection)
npm run start:debug

# Mode production
npm run build
npm run start:prod
```

### URLs après lancement

| Service | URL |
|---------|-----|
| **API Backend** | `http://localhost:3000` |
| **Swagger (Documentation)** | `http://localhost:3000/api` |
| **Dev Hub** | `http://localhost:8000` |
| **CloudBeaver** | `http://localhost:8080` |

---

## 🗄️ Migrations TypeORM

Les migrations permettent de versionner les modifications de la base de données.

### Principe

```
Entité TypeScript  →  Migration générée  →  Base de données
    (User)              (CREATE TABLE)        (table users)
```

### Commandes

```bash
# ⚠️ IMPORTANT : Toujours compiler avant les migrations
npm run build

# Générer une migration après modification d'une entité
npm run migration:generate src/migrations/NomDeLaMigration

# Exécuter les migrations en attente
npm run migration:run

# Annuler la dernière migration
npm run migration:revert

# Voir le statut des migrations (via TypeORM CLI)
npm run typeorm migration:show
```

### Workflow typique

```bash
# 1. Modifier une entité (ex: ajouter un champ dans User)
# 2. Compiler le projet
npm run build

# 3. Générer la migration
npm run migration:generate src/migrations/AddFieldToUser

# 4. Vérifier le fichier généré dans src/migrations/
# 5. Appliquer la migration
npm run migration:run
```

---

## 🌱 Seeds (données initiales)

Les seeds permettent d'insérer des données de base (rôles, admin, etc.).

```bash
# Exécuter le seed (crée les rôles par défaut)
npm run seed:run
```

Rôles créés par défaut :
- `SUPER_ADMIN` — Super Administrateur
- `ADMIN` — Administrateur
- `USER` — Utilisateur
- `GUEST` — Invité

---

## 🎨 Prettier (formatage)

Prettier garantit un style de code cohérent dans tout le projet.

### Configuration

Le fichier `.prettierrc` définit les règles :
```json
{
  "semi": true,
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 120,
  "endOfLine": "auto"
}
```

### Commandes

```bash
# Vérifier le formatage (sans modifier les fichiers)
npx prettier --check "src/**/*.ts"

# Formater tout le code automatiquement
npx prettier --write "src/**/*.ts"

# Formater un fichier spécifique
npx prettier --write src/app.module.ts

# Formater tout le projet (src + test)
npm run format
```

### Intégration VS Code

1. Installer l'extension **Prettier - Code formatter**
2. Ajouter dans `.vscode/settings.json` :

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode"
}
```

---

## 🔍 ESLint (qualité de code)

ESLint détecte les erreurs et enforce les bonnes pratiques TypeScript.

### Commandes

```bash
# Vérifier le code et corriger automatiquement
npm run lint

# Vérifier sans corriger
npx eslint "src/**/*.ts"

# Vérifier un fichier spécifique
npx eslint src/app.module.ts
```

---

## 🧪 Tests

```bash
# Tests unitaires
npm run test

# Tests unitaires en mode watch
npm run test:watch

# Tests end-to-end (e2e)
npm run test:e2e

# Couverture de code
npm run test:cov

# Tests en mode debug
npm run test:debug
```

---

## 📘 Documentation API

La documentation Swagger est générée automatiquement.

**URL** : `http://localhost:3000/api`

### Endpoints disponibles (Auth)

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| `POST` | `/auth/register` | Créer un compte |
| `POST` | `/auth/login` | Se connecter |
| `GET` | `/auth/me` | Profil utilisateur (🔒 JWT) |
| `POST` | `/auth/logout` | Se déconnecter (🔒 JWT) |

---

## 📁 Structure du projet

```
src/
├── config/                 # Configuration (TypeORM, etc.)
│   └── typeorm.config.ts
├── database/               # Seeds et scripts BDD
│   └── seed.ts
├── migrations/             # Migrations TypeORM
│   ├── 1768905046957-CreateRolesTable.ts
│   └── 1768919532114-CreateUsersTable.ts
├── modules/                # Modules métier
│   ├── auth/               # Authentification
│   │   ├── decorators/     # Décorateurs personnalisés
│   │   ├── dto/            # Data Transfer Objects
│   │   ├── guards/         # Guards (JWT, Roles)
│   │   ├── strategies/     # Stratégies Passport
│   │   ├── auth.controller.ts
│   │   ├── auth.module.ts
│   │   └── auth.service.ts
│   ├── roles/              # Gestion des rôles
│   │   └── entities/
│   │       └── role.entity.ts
│   └── users/              # Gestion des utilisateurs
│       └── entities/
│           └── user.entity.ts
├── app.controller.ts
├── app.module.ts
├── app.service.ts
└── main.ts                 # Point d'entrée
```

---

## 🔐 Variables d'environnement

Créer un fichier `.env` à la racine :

```env
# Base de données
DB_HOST=127.0.0.1
DB_PORT=5432
DB_USERNAME=artshop_user
DB_PASSWORD=artshop_secret_2026
DB_NAME=artshop_db

# JWT
JWT_SECRET=votre_secret_super_securise
JWT_EXPIRES_IN=7d

# Google OAuth (optionnel)
GOOGLE_CLIENT_ID=votre_client_id
GOOGLE_CLIENT_SECRET=votre_client_secret
GOOGLE_CALLBACK_URL=http://localhost:3000/auth/google/callback
```

---

## 📝 Commandes utiles — Résumé

| Action | Commande |
|--------|----------|
| Installer les dépendances | `npm install` |
| Démarrer Docker | `docker-compose up -d` |
| Arrêter Docker | `docker-compose down` |
| Lancer en dev | `npm run start:dev` |
| Compiler | `npm run build` |
| Générer migration | `npm run migration:generate src/migrations/Nom` |
| Exécuter migrations | `npm run migration:run` |
| Annuler migration | `npm run migration:revert` |
| Lancer les seeds | `npm run seed:run` |
| Formater le code | `npm run format` |
| Linter le code | `npm run lint` |
| Tests unitaires | `npm run test` |
| Tests e2e | `npm run test:e2e` |

---

## 📚 Ressources NestJS

- [Documentation NestJS](https://docs.nestjs.com)
- [Discord NestJS](https://discord.gg/G7Qnnhy)
- [Cours officiels](https://courses.nestjs.com/)
- [NestJS Devtools](https://devtools.nestjs.com)

---

## 📄 Licence

Ce projet est sous licence [MIT](LICENSE).
