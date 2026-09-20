# Kigardeki

Application web (PWA) de planning familial pour la garde des enfants : les
parents organisent, les grands-parents et personnes de confiance consultent.

> **Principe central : les parents organisent et modifient le planning. Les
> grands-parents et personnes de confiance consultent uniquement — et cette
> règle est appliquée côté serveur, pas seulement dans l'interface.**

## Stack technique

- **Next.js 14** (App Router, Server Actions) + **TypeScript strict**
- **PostgreSQL** (hébergé sur **Neon**, un environnement par étage : dev / staging / production) via **Prisma**
- **NextAuth.js (Auth.js) v5**, credentials (email + mot de passe), sessions JWT
- **Tailwind CSS**, interface mobile-first
- **PWA** : manifest, service worker, icônes — installable sur iOS/Android/desktop
- Chiffrement applicatif (AES-256-GCM) des données personnelles (voir plus bas)
- Déploiement cible : **Vercel**

Le choix Next.js + Postgres + Tailwind + PWA suit la stack demandée. Pour
l'auth/BDD, ce projet utilise **Neon + Prisma + NextAuth** plutôt que
Supabase (aucune intégration Supabase n'était disponible dans cet
environnement) — l'architecture (isolation par famille appliquée dans la
couche d'accès aux données, jamais dans la BDD ou l'UI seule) reste identique
à ce qu'on ferait avec des policies RLS Supabase.

## Sécurité et confidentialité des données

Ce projet gère des données concernant des enfants ; la sécurité n'est pas
une option :

- **Authentification obligatoire** partout (middleware Next.js) sauf
  `/login`, `/register`, `/invite/:token`, et `/share/:token` (voir
  ci-dessous — exception délibérée et opt-in, pas un accès public par
  défaut).
- **Autorisation strictement côté serveur** : chaque Server Action et chaque
  fonction de `src/lib/data/*` passe par `requireSession()` /
  `requireParent()` (voir `src/lib/permissions.ts`). Masquer un bouton côté
  client n'est jamais le seul rempart.
- **Isolation stricte par famille** : chaque ligne (`Child`, `Caregiver`,
  `Event`, ...) est filtrée par `familyId`, et `assertSameFamily()` vérifie
  systématiquement qu'une ressource appartient bien à la famille de
  l'utilisateur avant lecture/écriture.
- **Aucune adhésion à une famille par simple connaissance d'un identifiant** :
  on ne rejoint une famille que via une invitation nominative
  (email + jeton à usage unique, expirant sous 7 jours).
- **Chiffrement applicatif (AES-256-GCM)** des champs personnels — prénoms,
  noms, notes, téléphones, lieux, date de naissance — en plus du TLS en
  transit et du chiffrement au repos déjà fourni par Neon. Voir
  `src/lib/crypto.ts` pour le détail et le raisonnement. Les horaires
  d'événements (`startAt`/`endAt`) et les identifiants restent en clair :
  le calendrier doit pouvoir les filtrer/trier en SQL, et un enfant est déjà
  identifié par son prénom (chiffré) — chiffrer l'horaire casserait le
  planning sans gain de confidentialité réel.
- Les mots de passe sont hachés avec **bcrypt** (jamais « chiffrés » de
  façon réversible).
- **Partage public en lecture seule (`/share/:token`)** : un parent peut
  générer un lien sans authentification pour laisser des tiers consulter le
  planning. C'est une exception délibérée et **opt-in** au principe
  « aucune donnée publique » — jamais activée par défaut, révocable à tout
  moment (`Réglages`), et le jeton (24 octets aléatoires) est le seul
  élément d'accès : à traiter comme un mot de passe.

## Démarrage local

```bash
cp .env.example .env
# renseigner DATABASE_URL, NEXTAUTH_SECRET, ENCRYPTION_KEY (voir .env.example)

npm install
npm run prisma:migrate   # applique les migrations sur la base configurée
npm run seed             # données de démonstration (famille, enfants, gardes...)
npm run dev
```

Comptes de démonstration (après `npm run seed`) :

| Rôle    | Email                       | Mot de passe |
| ------- | ---------------------------- | ------------ |
| Parent  | `papa@demo.kigardeki.app`    | `Demo1234!`  |
| Parent  | `maman@demo.kigardeki.app`   | `Demo1234!`  |
| Viewer  | `mamie@demo.kigardeki.app`   | `Demo1234!`  |

## Scripts

| Commande                | Description                                   |
| ------------------------ | ---------------------------------------------- |
| `npm run dev`             | Serveur de développement                       |
| `npm run build`           | Build de production (génère aussi le client Prisma) |
| `npm run lint`            | ESLint                                         |
| `npm run typecheck`       | `tsc --noEmit`                                 |
| `npm test`                | Tests unitaires (Vitest)                       |
| `npm run prisma:migrate`  | Nouvelle migration en développement            |
| `npm run prisma:deploy`   | Applique les migrations (staging/production)   |
| `npm run seed`            | Données de démonstration                       |

## Tests

- `tests/recurrence.test.ts`, `tests/wall-time.test.ts`, `tests/crypto.test.ts` :
  logique pure, aucune base de données requise.
- `tests/permissions.integration.test.ts` : couvre la checklist « parent vs
  viewer » et l'isolation famille A / famille B contre une **vraie** base
  Postgres. Ces tests sont **désactivés tant que `DATABASE_URL` ne pointe
  pas vers une base jetable dédiée aux tests** (jamais une base contenant de
  vraies données de famille) :

  ```bash
  DATABASE_URL="postgresql://.../test_db" npm test
  ```

## Architecture des données

Voir `prisma/schema.prisma`. Modèles : `Family`, `User`, `Child`,
`Caregiver`, `Event`, `EventChild`, `EventCaregiver`, `Invitation`. Un
événement peut avoir plusieurs enfants et plusieurs responsables (un parent
est représenté comme un `Caregiver` lié à son `User`, exactement comme une
nounou ou un grand-parent — un seul mécanisme d'assignation pour tout le
monde).

Les événements récurrents sont volontairement simples : fréquence
hebdomadaire, jours sélectionnés, date de début/fin optionnelle — pas de
règles calendaires complexes (voir `src/lib/recurrence.ts`).

## PWA

- `public/manifest.webmanifest`, `public/sw.js`, icônes dans `public/icons/`
- Le service worker met en cache l'app shell et les pages déjà visitées
  (pas de synchronisation offline complète dans ce MVP — l'architecture le
  permet plus tard sans changer la structure).
- Bannière réseau (`src/components/network-status-banner.tsx`) et aide à
  l'installation (`src/components/install-pwa-hint.tsx`, page Réglages).

## Git, environnements et déploiement

Voir [`CONTRIBUTING.md`](./CONTRIBUTING.md).
