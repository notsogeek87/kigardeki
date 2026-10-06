# Server actions des événements (gardes)

**Pour qui / pourquoi** : développeurs qui branchent un formulaire ou un
bouton sur la création, modification ou suppression d'une garde.
Fichier source : `src/app/(app)/events/actions.ts`.

## `createEventAction(formData: FormData): Promise<void>`

Crée une garde. Champs du formulaire :

| Champ | Type | Règle |
|---|---|---|
| `type` | `SCHOOL \| DAYCARE \| CAREGIVING \| PARENT \| OTHER` | requis |
| `date` | `YYYY-MM-DD` | requis |
| `dateEnd` | `YYYY-MM-DD` | optionnel ; si > `date` → récurrence `DAILY` |
| `slots` | `MORNING \| AFTERNOON` (multiple) | au moins un |
| `childIds` | `string` (multiple) | au moins un |
| `caregiverIds` | `string` (multiple) | optionnel |
| `location`, `notes` | `string` | optionnels |
| `recurring` | `"on"` | active la récurrence `WEEKLY` |
| `recurrenceDays` | jours 0–6 (multiple) | avec `recurring` |
| `recurrenceEndDate` | `YYYY-MM-DD` | optionnel, avec `recurring` |

## `updateEventAction(eventId: string, formData: FormData): Promise<void>`

Mêmes champs que la création.

## `deleteEventAction(eventId: string): Promise<void>`

Supprime la garde.

## Redirections

| Résultat | Destination |
|---|---|
| Création / modification réussie | `/planning?view=month&date=<date>` |
| Suppression réussie | `/planning?view=month` |
| Erreur | `/events/new` ou `/events/<id>/edit` avec `?error=<message>` |

```ts
// <form action={createEventAction}> ... </form>
// <form action={updateEventAction.bind(null, event.id)}> ... </form>
```
