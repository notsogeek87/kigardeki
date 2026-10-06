# Ajouter, modifier ou supprimer une garde

**Pour qui / pourquoi** : les parents qui gèrent le planning. Ce guide décrit
où l'on atterrit après avoir enregistré une garde.

## Comportement après enregistrement

Après création ou modification d'une garde, l'app redirige vers la **vue
mois** du planning, ancrée sur la date saisie. La suppression redirige vers
la vue mois (sans date précise). La vue semaine reste la vue par défaut
lorsqu'on ouvre `/planning` directement.

Implémentation : `monthPlanningPath()` dans
`src/app/(app)/events/actions.ts`.

```ts
// Exemple : garde créée le 2026-10-14
redirect("/planning?view=month&date=2026-10-14");
```

## Voir aussi

- Récurrence et créneaux : section « Événements » du `README.md`.
