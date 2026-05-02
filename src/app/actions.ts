// Re-exports for backward compatibility — logic lives in src/app/actions/
export type { ExtractionResultState, ResolvedItem } from './actions/extraction.actions';
export { processLogEntry } from './actions/extraction.actions';
export { saveMealEntry, deleteMealAction, deleteMealItemAction, updateMealItemGramsAction, updateMealSlotAction, updateMealItemAction } from './actions/meals.actions';
export { updateGoalsAction } from './actions/goals.actions';
export { transcribeAudioAction } from './actions/transcription.actions';
export { toggleFavoriteAction, quickLogFavoriteAction } from './actions/favorites.actions';
export { getRecipeRecommendationsAction, logRecommendationAction, favoriteRecommendationAction } from './actions/recommendations.actions';
export { deleteAliasAction } from './actions/aliases.actions';
