# Contribuer à Kigardeki

## Branches

Deux branches permanentes :

- **`main`** — production. Toujours stable et déployable.
- **`staging`** — préproduction. Sert à valider une fonctionnalité avant `main`.

Workflow pour toute fonctionnalité :

```
feature/ma-fonctionnalite  →  staging  →  main
```

1. Partir de `staging` : `git checkout staging && git pull && git checkout -b feature/ma-fonctionnalite`
2. Développer.
3. Vérifier localement : `npm run lint && npm run typecheck && npm test && npm run build`
4. Ouvrir une PR vers `staging`. La CI (`.github/workflows/ci.yml`) doit passer.
5. Une fois mergée, tester sur l'environnement de preview/staging Vercel.
6. Quand c'est validé, merger `staging` dans `main` → déploiement production.

Ne jamais commiter directement sur `main` ou `staging`.

Exemples de branches : `feature/calendar-view`, `feature/recurring-events`,
`feature/family-members`, `feature/pwa`.

## Environnements

Trois environnements strictement séparés, jamais partagés :

| Environnement | Branche Git | Base de données (Neon) |
| -------------- | ----------- | ------------------------ |
| Development     | branches `feature/*` (local) | branche Neon `development` |
| Staging          | `staging`   | branche Neon `staging`     |
| Production       | `main`      | branche Neon `production`  |

Le projet Neon (`kigardeki`) utilise une branche Postgres par environnement
(fonctionnalité native de Neon : chaque branche est une base indépendante,
qui ne partage aucune donnée avec les autres après sa création). **Ne
jamais** faire pointer un environnement de développement ou de staging vers
la base de production.

Chaque environnement a ses propres variables d'environnement (voir
`.env.example`) :

```
DATABASE_URL
NEXTAUTH_SECRET
NEXTAUTH_URL
NEXT_PUBLIC_APP_URL
ENCRYPTION_KEY
```

`ENCRYPTION_KEY` doit être **différente pour chaque environnement** et ne
doit jamais être committée. Si elle est perdue, les données déjà chiffrées
dans cet environnement deviennent illisibles — traitez-la comme un secret
critique (coffre-fort de secrets de l'équipe, variables d'environnement
Vercel chiffrées, jamais dans Git).

## Vercel

- **Production** : déploiement sur push vers `main`, variables
  d'environnement « Production » (branche Neon `production`).
- **Preview / Staging** : déploiement sur push vers `staging` (et sur chaque
  PR), variables d'environnement « Preview » (branche Neon `staging`).

Migrations de base de données : exécuter `npm run prisma:deploy` (utilise
les migrations versionnées dans `prisma/migrations/`) contre l'environnement
cible avant/pendant le déploiement — ne jamais utiliser `prisma migrate dev`
en dehors du développement local.

## Qualité

Avant qu'une branche puisse être mergée dans `staging` ou `main`, elle doit
passer :

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

La CI GitHub Actions applique ces mêmes contrôles sur chaque PR vers
`staging`/`main` et sur chaque push vers ces branches.
