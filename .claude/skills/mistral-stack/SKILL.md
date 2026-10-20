---
name: mistral-stack
description: Choisir le modèle Mistral et l'appeler correctement — chat, raisonnement, vision, sorties structurées, modération, TTS/STT, cache de prompt, coût. À utiliser quand on ajoute ou modifie un appel IA côté serveur, qu'on hésite entre deux modèles, ou qu'un coût de tokens dérape. Toute la stack IA est Mistral, endpoint UE.
---

# Stack IA — casting et réglages

Contrainte non négociable : **stack 100 % Mistral, inférence en UE**. Les rôles, les modèles,
leurs réglages et l'endpoint UE : `docs/tuteur.md` §2 ; le coût et le quota : §11. Ce skill ne
garde que ce qu'il faut savoir pour écrire un appel.

## Casting

- **Mistral Small 4** (`mistral-small-2603`) pour tout rôle de LLM, juge compris : jamais
  Medium, Large ni Ministral, et une seule variable (`MISTRAL_MODEL`). Pour la voix, à son
  arrivée : `voxtral-mini-2602` en transcription ; en synthèse, les voix françaises sont
  `fr_marie_*` et le champ `language` est refusé.
- **IDs datés uniquement.** `src/config.ts` refuse tout `-latest` au boot.
- **Débit** : en mode gratuit, 100 000 tokens par minute pour l'organisation, et une fiche
  d'exercice en prend environ 78 000. Sur un 429, lire les en-têtes `x-ratelimit-*` : un plafond
  à 0 veut dire « modèle hors offre », pas « quota épuisé ».

## Appeler l'API

- Le client se crée à la racine de composition (`src/main.ts`) et se
  passe en paramètre : `createAi`
  (`src/platform/ai/client.ts`) pour `generateText` et `generateStructured`, `createModeration`
  (`src/platform/ai/moderation.ts`). Jamais un SDK appelé depuis un service, jamais
  l'environnement lu ailleurs : la clé est toujours passée, même vide, sans quoi les SDK liraient
  `MISTRAL_API_KEY` eux-mêmes.
- Réglages Mistral uniquement via `providerOptions.mistral` (`promptCacheKey`,
  `reasoningEffort`, `strictJsonSchema`) — pas de wrapper `fetch`.
- `reasoningEffort` n'accepte que `'none' | 'high'` dans `@ai-sdk/mistral`, et n'est
  envoyé que pour les IDs de sa liste interne : vérifier qu'un nouveau modèle y figure.
- Pas de `safePrompt` : déprécié par Mistral. Ce qui atteint l'élève passe par la modération ; le
  résumé de séance, jamais montré, non.
- Tests : `fakeMistral()` (`src/testing/mistral.ts`), un vrai serveur qui répond comme Mistral ;
  chaque test met en file les réponses qu'il attend.

## Coût

Ce que trace `ai_cost` et comment le quota le lit : `docs/tuteur.md` §11. À l'écriture d'un appel :

- Le coût s'écrit au nom de l'élève (`owner` ; `null` hors d'un élève : rien n'est écrit), une
  réponse hors schéma comprise. Un appel qui ne passera pas par `createAi` (la voix) devra
  écrire son coût lui aussi, et une route qui appellera Mistral hors d'un tour vérifiera le
  quota à son entrée : jamais un appel facturé hors du quota.
- **Tarif** : `src/platform/ai/cost.ts`. Un modèle sans prix fait échouer `createAi`, donc le
  démarrage : l'ajouter à la table.
- **Réduire le coût** : cache de prompt, clé = ID de session pour le chat, ID de workflow
  versionné pour les tâches templatées, contenu stable en tête du prompt ;
  `maxOutputTokens` fixé par tâche à l'appel, sauf sur un appel qui raisonne (la borne est alors
  le timeout).

## Sources

[Regional inference](https://docs.mistral.ai/inference/regional-inference) ·
[Prompt caching](https://docs.mistral.ai/studio/conversations/advanced/prompt-caching) ·
[Reasoning](https://docs.mistral.ai/studio/conversations/reasoning) ·
[Small 4](https://docs.mistral.ai/models/mistral-small-4-0-26-03) ·
[Known limitations](https://docs.mistral.ai/resources/known-limitations)
