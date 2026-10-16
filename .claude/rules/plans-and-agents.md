---
description: Plans de PR et suivi — chargé en ouvrant la doc ou la config
paths:
  - "docs/**"
  - "CLAUDE.md"
  - ".claude/**"
---

# Plans et suivi

Le mode plan écrit ses plans dans `docs/plans/` (`plansDirectory`) ; un plan s'écrit contre `main`
à jour, porte en tête les décisions de Victor, et se supprime au dernier commit de sa PR.

## Interdits

- Jamais un point reporté dans `docs/suivi.md` sans l'étape ou le lot qui le reprend ; quand le
  plan de celle-ci s'écrit, le point y devient une tâche ou est renvoyé explicitement.
- Jamais l'environnement décrit dans la doc : il renvoie à `apps/server/src/config.ts`.
- Jamais un chiffre cité au-delà de ce que sa source mesure (un site, un échantillon), ni un
  contraste écrit sans être recalculé sur les valeurs du document qui le porte.
