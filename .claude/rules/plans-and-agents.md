---
paths:
  - "docs/**"
  - "CLAUDE.md"
  - ".claude/**"
---

# Plans et suivi

Le mode plan écrit ses plans dans `docs/plans/` (`plansDirectory`) ; un plan s'écrit contre `main`
à jour, porte en tête les décisions de Victor, et se supprime au dernier commit de sa PR.

## Interdits

- Jamais un constat hors du périmètre d'une PR laissé sans trace : il entre dans `docs/etat.md`,
  et le plan qui le reprend en fait une tâche ou le renvoie explicitement.
- Jamais l'environnement décrit dans la doc : il renvoie à `apps/server/src/config.ts`.
- Jamais un chiffre cité au-delà de ce que sa source mesure (un site, un échantillon), ni un
  contraste écrit sans être recalculé sur les valeurs du document qui le porte.
