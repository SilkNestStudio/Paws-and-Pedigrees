import { StoryChapter } from '../types/story';

/**
 * Story Mode Chapters - The Path to Championship
 * A guided journey teaching players how to create a champion dog
 */
export const storyChapters: StoryChapter[] = [
  {
    id: 'ch1_new_beginning',
    chapter_number: 1,
    title: 'A New Beginning',
    subtitle: 'Welcome to the world of dog breeding',
    icon: '🏠',
    story_text: [
      "Welcome to Paws & Pedigrees! You've just inherited a small kennel from your mentor, a legendary dog breeder who has retired.",
      "Your mentor left you with one piece of advice: 'A champion isn't born, they're raised with love, dedication, and knowledge.'",
      "Your journey begins with your first companion. Choose wisely, care for them well, and build the foundation of your future championship kennel.",
    ],
    objectives: [
      {
        id: 'adopt_first_dog',
        description: 'Adopt your first dog',
        type: 'custom',
        target_value: 1,
        completed: false,
        hint: 'Visit the kennel to select your first companion',
      },
      {
        id: 'feed_dog_3_times',
        description: 'Feed your dog 3 times',
        type: 'care',
        target_value: 3,
        completed: false,
        hint: 'Keep your dog well-fed to maintain their health',
      },
      {
        id: 'play_with_dog',
        description: 'Play with your dog 5 times',
        type: 'care',
        target_value: 5,
        completed: false,
        hint: 'Playing builds happiness and bond',
      },
    ],
    rewards: {
      cash: 500,
      xp: 100,
      items: ['energy_treat', 'tennis_ball'],
    },
  },
  {
    id: 'ch2_understanding_bond',
    chapter_number: 2,
    title: 'The Bond of Trust',
    subtitle: 'Building a relationship with your companion',
    icon: '❤️',
    story_text: [
      "Your mentor once said, 'A dog without bond is just an animal. A dog with bond is family, and family performs miracles.'",
      "The bond between you and your dog is the foundation of everything. The stronger your bond, the better they'll perform in training and competition.",
      "Spend time with your companion. Care for them, play with them, and watch as your relationship grows stronger each day.",
    ],
    objectives: [
      {
        id: 'reach_bond_level_2',
        description: 'Reach Bond Level 2 with your dog',
        type: 'bond',
        target_value: 2,
        completed: false,
        hint: 'Care for your dog and play with them to increase bond XP',
      },
      {
        id: 'keep_happiness_high',
        description: 'Keep happiness above 70% for 3 days',
        type: 'care',
        target_value: 3,
        completed: false,
        hint: 'Play with your dog regularly to maintain happiness',
      },
    ],
    rewards: {
      cash: 750,
      xp: 150,
      gems: 5,
      items: ['rope_toy'],
    },
    unlock_requirement: {
      previous_chapter: 'ch1_new_beginning',
    },
  },
  {
    id: 'ch3_training_basics',
    chapter_number: 3,
    title: 'Training Fundamentals',
    subtitle: 'Unlocking your dog\'s potential',
    icon: '🎯',
    story_text: [
      "Your mentor's journal reads: 'Every dog has potential. It's the trainer's job to unlock it through patient, consistent training.'",
      "Training Points (TP) are the key to improving your dog's stats. They regenerate daily, so make training a part of your routine.",
      "Focus on your dog's natural strengths first, but don't neglect their weaknesses. Balance makes a champion.",
    ],
    objectives: [
      {
        id: 'train_speed_10',
        description: 'Train Speed 10 times',
        type: 'train',
        target_value: 10,
        completed: false,
        hint: 'Use Training Points to increase Speed stat',
      },
      {
        id: 'train_agility_10',
        description: 'Train Agility 10 times',
        type: 'train',
        target_value: 10,
        completed: false,
        hint: 'Balance training across multiple stats',
      },
      {
        id: 'train_intelligence_5',
        description: 'Train Intelligence 5 times',
        type: 'train',
        target_value: 5,
        completed: false,
        hint: 'Don\'t forget mental training',
      },
    ],
    rewards: {
      cash: 1000,
      xp: 200,
      gems: 10,
      items: ['training_treats', 'energy_elixir'],
    },
    unlock_requirement: {
      previous_chapter: 'ch2_understanding_bond',
    },
  },
  {
    id: 'ch4_first_competition',
    chapter_number: 4,
    title: 'Trial by Competition',
    subtitle: 'Testing your skills',
    icon: '🏆',
    story_text: [
      "The journal continues: 'Competition reveals the truth. It shows you where you excel and where you must improve.'",
      "Your first competition won't be easy, but it's not about winning—it's about learning. Watch how your dog performs, see what works and what doesn't.",
      "Win or lose, every competition is a lesson. Study your competitors, understand the requirements, and come back stronger.",
    ],
    objectives: [
      {
        id: 'enter_competition',
        description: 'Enter any competition',
        type: 'compete',
        target_value: 1,
        completed: false,
        hint: 'Visit the competition page and enter a local event',
      },
      {
        id: 'win_any_competition',
        description: 'Win any competition',
        type: 'compete',
        target_value: 1,
        completed: false,
        hint: 'Make sure your dog is well-trained and rested',
      },
      {
        id: 'reach_level_3',
        description: 'Reach kennel level 3',
        type: 'level',
        target_value: 3,
        completed: false,
        hint: 'Gain XP through training and competitions',
      },
    ],
    rewards: {
      cash: 1500,
      xp: 300,
      gems: 15,
      items: ['power_meal', 'clicker_kit'],
    },
    unlock_requirement: {
      previous_chapter: 'ch3_training_basics',
      min_level: 2,
    },
  },
  {
    id: 'ch5_genetics_introduction',
    chapter_number: 5,
    title: 'The Science of Breeding',
    subtitle: 'Understanding genetics and lineage',
    icon: '🧬',
    story_text: [
      "A worn page in the journal: 'Champions aren't always adopted—sometimes they're born. But only if you understand what you're doing.'",
      "Breeding is both art and science. Choose compatible dogs, understand dominant and recessive traits, and watch as genetics unfold.",
      "Your first breeding won't create a champion, but it will teach you invaluable lessons about inheritance, potential, and patience.",
    ],
    objectives: [
      {
        id: 'breed_first_puppy',
        description: 'Successfully breed your first puppy',
        type: 'breed',
        target_value: 1,
        completed: false,
        hint: 'You need two adult dogs with good bond levels',
      },
      {
        id: 'raise_puppy_to_adult',
        description: 'Raise a puppy to adulthood',
        type: 'custom',
        target_value: 1,
        completed: false,
        hint: 'Care for your puppy as it grows',
      },
      {
        id: 'train_bred_dog',
        description: 'Train your bred dog 15 times',
        type: 'train',
        target_value: 15,
        completed: false,
        hint: 'Bred dogs often have better starting stats',
      },
    ],
    rewards: {
      cash: 2000,
      xp: 400,
      gems: 25,
      items: ['master_training_pack'],
    },
    unlock_requirement: {
      previous_chapter: 'ch4_first_competition',
      min_level: 4,
      min_dogs: 2,
    },
  },
  {
    id: 'ch6_championship_preparation',
    chapter_number: 6,
    title: 'The Road to Glory',
    subtitle: 'Preparing for the championship',
    icon: '⭐',
    story_text: [
      "The final entry: 'You've learned care, bonding, training, competition, and breeding. Now, combine everything you've learned.'",
      "A champion is more than just high stats. They're well-rounded, perfectly bonded, expertly trained, and battle-tested.",
      "Prepare your best dog. Max out their potential. Build an unbreakable bond. This is what you've been working toward.",
    ],
    objectives: [
      {
        id: 'max_bond_level',
        description: 'Reach maximum bond level (5) with a dog',
        type: 'bond',
        target_value: 5,
        completed: false,
        hint: 'Keep caring for and playing with your dog',
      },
      {
        id: 'win_regional_competition',
        description: 'Win a Regional competition',
        type: 'compete',
        target_value: 1,
        completed: false,
        hint: 'Train your dog well and ensure they\'re in peak condition',
      },
      {
        id: 'total_stats_400',
        description: 'Have a dog with 400+ total stats',
        type: 'custom',
        target_value: 400,
        completed: false,
        hint: 'Balance training across all stats',
      },
    ],
    rewards: {
      cash: 5000,
      xp: 1000,
      gems: 50,
      items: ['care_package', 'luxury_toy_set'],
      unlock_feature: 'championship_competitions',
    },
    unlock_requirement: {
      previous_chapter: 'ch5_genetics_introduction',
      min_level: 6,
    },
  },
  {
    id: 'ch7_legacy',
    chapter_number: 7,
    title: 'Building a Legacy',
    subtitle: 'The true master\'s journey',
    icon: '👑',
    story_text: [
      "You close the journal and realize—you've surpassed your mentor's teachings. Now you write your own story.",
      "True mastery isn't just about one champion. It's about building a kennel of excellence, a legacy that will last generations.",
      "The championship awaits. But more than that, your journey as a legendary breeder has only just begun.",
    ],
    objectives: [
      {
        id: 'win_championship',
        description: 'Win a Championship competition',
        type: 'compete',
        target_value: 1,
        completed: false,
        hint: 'Your best dog, perfectly trained and bonded',
      },
      {
        id: 'breed_champion_offspring',
        description: 'Breed offspring from your champion',
        type: 'breed',
        target_value: 1,
        completed: false,
        hint: 'Pass on champion genetics to the next generation',
      },
      {
        id: 'reach_level_10',
        description: 'Reach kennel level 10',
        type: 'level',
        target_value: 10,
        completed: false,
        hint: 'Continue training, competing, and breeding',
      },
    ],
    rewards: {
      cash: 10000,
      xp: 2000,
      gems: 100,
      unlock_feature: 'elite_breeding',
    },
    unlock_requirement: {
      previous_chapter: 'ch6_championship_preparation',
      min_level: 8,
    },
  },
];

/**
 * Get a chapter by ID
 */
export function getChapter(chapterId: string): StoryChapter | undefined {
  return storyChapters.find(ch => ch.id === chapterId);
}

/**
 * Get the next chapter after the current one
 */
export function getNextChapter(currentChapterId: string): StoryChapter | undefined {
  const currentIndex = storyChapters.findIndex(ch => ch.id === currentChapterId);
  if (currentIndex === -1 || currentIndex === storyChapters.length - 1) {
    return undefined;
  }
  return storyChapters[currentIndex + 1];
}

/**
 * Check if a chapter is unlocked based on requirements
 */
export function isChapterUnlocked(
  chapter: StoryChapter,
  completedChapters: string[],
  userLevel: number,
  dogCount: number
): boolean {
  if (!chapter.unlock_requirement) {
    return true; // No requirements, always unlocked
  }

  const { previous_chapter, min_level, min_dogs } = chapter.unlock_requirement;

  // Check previous chapter completion
  if (previous_chapter && !completedChapters.includes(previous_chapter)) {
    return false;
  }

  // Check level requirement
  if (min_level && userLevel < min_level) {
    return false;
  }

  // Check dog count requirement
  if (min_dogs && dogCount < min_dogs) {
    return false;
  }

  return true;
}
