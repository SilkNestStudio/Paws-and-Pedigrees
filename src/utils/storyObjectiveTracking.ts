import { useGameStore } from '../stores/gameStore';
import { storyChapters } from '../data/storyChapters';
import { StoryObjective } from '../types/story';

/**
 * Track a game action and update relevant story objectives
 */
export function trackStoryAction(
  actionType: 'care' | 'train' | 'compete' | 'breed' | 'bond' | 'shop' | 'level' | 'custom',
  details: {
    action?: string; // Specific action like 'feed', 'water', 'rest'
    competitionTier?: 'local' | 'regional' | 'national';
    competitionWon?: boolean;
    breedingAction?: 'breed' | 'birth';
    shopAction?: 'buy_food' | 'buy_breed';
    levelGained?: number;
    customId?: string;
    amount?: number; // Amount to increment (default 1)
  } = {}
) {
  const { storyProgress, updateObjectiveProgress } = useGameStore.getState();
  const amount = details.amount || 1;

  // Find all active (not completed) chapters
  const activeChapters = storyChapters.filter(
    chapter => !storyProgress.completedChapters.includes(chapter.id)
  );

  // Check each active chapter for matching objectives
  activeChapters.forEach(chapter => {
    chapter.objectives.forEach(objective => {
      // Check if this objective matches the action type
      if (objective.type === actionType) {
        let shouldTrack = false;

        // Type-specific matching logic
        switch (actionType) {
          case 'care':
            if (objective.action === details.action || !objective.action) {
              shouldTrack = true;
            }
            break;

          case 'train':
            shouldTrack = true; // Any training counts
            break;

          case 'compete':
            if (objective.competition_tier) {
              // Check if competition tier matches
              if (objective.competition_tier === details.competitionTier) {
                // If objective requires wins, only count wins
                if (objective.competition_requirement === 'win') {
                  shouldTrack = details.competitionWon === true;
                } else {
                  shouldTrack = true; // Any participation counts
                }
              }
            } else {
              // No tier specified, any competition counts
              shouldTrack = true;
            }
            break;

          case 'breed':
            if (objective.breeding_action === details.breedingAction || !objective.breeding_action) {
              shouldTrack = true;
            }
            break;

          case 'bond':
            shouldTrack = true; // Any bonding action counts
            break;

          case 'shop':
            if (objective.shop_action === details.shopAction || !objective.shop_action) {
              shouldTrack = true;
            }
            break;

          case 'level':
            // Track level ups
            if (details.levelGained) {
              shouldTrack = true;
            }
            break;

          case 'custom':
            // Custom objectives need exact ID match
            if (objective.custom_id === details.customId) {
              shouldTrack = true;
            }
            break;
        }

        // Update progress if this objective should be tracked
        if (shouldTrack) {
          updateObjectiveProgress(chapter.id, objective.id, amount);
        }
      }
    });
  });
}

/**
 * Check if a specific chapter has all objectives completed
 */
export function isChapterFullyCompleted(chapterId: string): boolean {
  const { storyProgress } = useGameStore.getState();
  const chapter = storyChapters.find(c => c.id === chapterId);

  if (!chapter) return false;

  // Check if all objectives are completed
  return chapter.objectives.every(objective => {
    const progress = storyProgress.objectiveProgress[chapterId]?.[objective.id] || 0;
    return progress >= objective.target_value;
  });
}

/**
 * Auto-complete chapter if all objectives are met
 */
export function checkAndCompleteChapter(chapterId: string) {
  const { storyProgress, completeChapter } = useGameStore.getState();

  // Don't complete if already completed
  if (storyProgress.completedChapters.includes(chapterId)) {
    return false;
  }

  // Check if fully completed
  if (isChapterFullyCompleted(chapterId)) {
    completeChapter(chapterId);
    return true;
  }

  return false;
}

/**
 * Get current progress for an objective
 */
export function getObjectiveProgress(chapterId: string, objectiveId: string): number {
  const { storyProgress } = useGameStore.getState();
  return storyProgress.objectiveProgress[chapterId]?.[objectiveId] || 0;
}

/**
 * Check if an objective is completed
 */
export function isObjectiveCompleted(chapterId: string, objective: StoryObjective): boolean {
  const progress = getObjectiveProgress(chapterId, objective.id);
  return progress >= objective.target_value;
}

/**
 * Get chapter completion percentage
 */
export function getChapterCompletionPercentage(chapterId: string): number {
  const chapter = storyChapters.find(c => c.id === chapterId);
  if (!chapter) return 0;

  const completedObjectives = chapter.objectives.filter(obj =>
    isObjectiveCompleted(chapterId, obj)
  ).length;

  return (completedObjectives / chapter.objectives.length) * 100;
}
