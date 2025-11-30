import { StoryChapter } from '../types/story';

/**
 * Story Mode Chapters - The Path to Championship (Extended to 10 Chapters)
 * A guided journey teaching players how to create a champion dog
 * Final reward: Choose a rare breed dog!
 */
export const storyChapters: StoryChapter[] = [
  {
    id: 'ch1_new_beginning',
    chapter_number: 1,
    title: 'A New Beginning',
    subtitle: 'Welcome to the world of dog breeding',
    icon: '🏠',
    image_url: '/assets/story/chapter-1-new-beginning.png',
    story_text: [
      "Welcome to Paws & Pedigrees! You've just inherited a small kennel from your mentor, a legendary dog breeder who has retired.",
      "Your mentor left you with one piece of advice: 'A champion isn't born, they're raised with love, dedication, and knowledge.'",
      "Your journey begins with your first companion. Choose wisely, care for them well, and build the foundation of your future championship kennel.",
    ],
    objectives: [
      {
        id: 'adopt_first_dog',
        description: 'Have at least 1 dog in your kennel',
        type: 'custom',
        target_value: 1,
        completed: false,
        hint: 'You should already have your first companion',
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
        id: 'play_with_dog_5_times',
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
    image_url: '/assets/story/chapter-2-bond-of-trust.png',
    story_text: [
      "Your mentor once said, 'A dog without bond is just an animal. A dog with bond is family, and family performs miracles.'",
      "The bond between you and your dog is the foundation of everything. The stronger your bond, the better they'll perform in training and competition.",
      "Spend time with your companion. Care for them, play with them, and watch as your relationship grows stronger each day.",
    ],
    objectives: [
      {
        id: 'reach_bond_level_2',
        description: 'Reach Bond Level 2 with any dog',
        type: 'bond',
        target_value: 2,
        completed: false,
        hint: 'Care for your dog and play with them to increase bond XP',
      },
      {
        id: 'maintain_happiness',
        description: 'Keep a dog\'s happiness above 80 for 1 day',
        type: 'care',
        target_value: 1,
        completed: false,
        hint: 'Play with your dog regularly to maintain high happiness',
      },
      {
        id: 'purchase_toy',
        description: 'Buy a toy from the shop',
        type: 'shop',
        target_value: 1,
        completed: false,
        hint: 'Visit the shop and purchase a toy to make your dog happy',
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
    image_url: '/assets/story/chapter-3-training-fundamentals.png',
    story_text: [
      "Your mentor's journal reads: 'Every dog has potential. It's the trainer's job to unlock it through patient, consistent training.'",
      "Training Points (TP) are the key to improving your dog's stats. They regenerate daily, so make training a part of your routine.",
      "Focus on your dog's natural strengths first, but don't neglect their weaknesses. Balance makes a champion.",
    ],
    objectives: [
      {
        id: 'train_any_stat_15_times',
        description: 'Complete 15 training sessions (any stat)',
        type: 'train',
        target_value: 15,
        completed: false,
        hint: 'Use Training Points to increase your dog\'s stats',
      },
      {
        id: 'train_three_different_stats',
        description: 'Train 3 different stats at least once each',
        type: 'train',
        target_value: 3,
        completed: false,
        hint: 'Balance training across multiple stats',
      },
      {
        id: 'reach_100_in_any_stat',
        description: 'Reach 100 in any trained stat',
        type: 'custom',
        target_value: 100,
        completed: false,
        hint: 'Focus training on one stat to reach 100',
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
    title: 'Trial by Fire',
    subtitle: 'Your first competition',
    icon: '🏅',
    image_url: '/assets/story/chapter-4-first-competition.png',
    story_text: [
      "The journal continues: 'Competition reveals the truth. It shows you where you excel and where you must improve.'",
      "Your first competition won't be easy, but it's not about winning—it's about learning. Watch how your dog performs.",
      "Study the competition, understand what it takes to win, and come back stronger. Every loss is a lesson.",
    ],
    objectives: [
      {
        id: 'enter_local_competition',
        description: 'Enter a Local competition',
        type: 'compete',
        target_value: 1,
        completed: false,
        hint: 'Visit the competition page and enter a local event',
      },
      {
        id: 'win_local_competition',
        description: 'Win a Local competition',
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
    id: 'ch5_advanced_training',
    chapter_number: 5,
    title: 'Advanced Techniques',
    subtitle: 'Mastering specialized training',
    icon: '⚡',
    image_url: '/assets/story/chapter-5-advanced-techniques.png',
    story_text: [
      "A worn page reveals: 'Basic training creates competitors. Advanced training creates champions. Know the difference.'",
      "Now that you understand the fundamentals, it's time to push your dog to their limits. Specialized training yields specialized results.",
      "Different competitions require different strengths. A well-rounded dog is good, but a specialized champion is unstoppable in their domain.",
    ],
    objectives: [
      {
        id: 'train_to_150',
        description: 'Reach 150 in any trained stat',
        type: 'custom',
        target_value: 150,
        completed: false,
        hint: 'Continue focused training on your dog\'s best stat',
      },
      {
        id: 'complete_30_training_sessions',
        description: 'Complete 30 total training sessions',
        type: 'train',
        target_value: 30,
        completed: false,
        hint: 'Train consistently every day',
      },
      {
        id: 'reach_bond_level_3',
        description: 'Reach Bond Level 3 with any dog',
        type: 'bond',
        target_value: 3,
        completed: false,
        hint: 'Higher bond improves training effectiveness',
      },
    ],
    rewards: {
      cash: 2000,
      xp: 400,
      gems: 20,
      items: ['master_training_pack', 'interactive_puzzle'],
    },
    unlock_requirement: {
      previous_chapter: 'ch4_first_competition',
      min_level: 4,
    },
  },
  {
    id: 'ch6_regional_success',
    chapter_number: 6,
    title: 'Rising Through the Ranks',
    subtitle: 'Competing at the regional level',
    icon: '🏆',
    image_url: '/assets/story/chapter-6-rising-ranks.png',
    story_text: [
      "The journal's tone grows more serious: 'Local competitions are practice. Regional competitions are where reputations are made.'",
      "You've proven yourself locally. Now it's time to compete against the best in your region. The competition will be fierce.",
      "This is where you learn if your training methods truly work. This is where champions are separated from pretenders.",
    ],
    objectives: [
      {
        id: 'win_three_local_competitions',
        description: 'Win 3 Local competitions',
        type: 'compete',
        target_value: 3,
        completed: false,
        hint: 'Compete in local events to gain experience',
      },
      {
        id: 'enter_regional_competition',
        description: 'Enter a Regional competition',
        type: 'compete',
        target_value: 1,
        completed: false,
        hint: 'Regional competitions require higher stats',
      },
      {
        id: 'reach_level_5',
        description: 'Reach kennel level 5',
        type: 'level',
        target_value: 5,
        completed: false,
        hint: 'Continue training and competing',
      },
    ],
    rewards: {
      cash: 3000,
      xp: 500,
      gems: 25,
      items: ['care_package'],
    },
    unlock_requirement: {
      previous_chapter: 'ch5_advanced_training',
      min_level: 5,
    },
  },
  {
    id: 'ch7_genetics_introduction',
    chapter_number: 7,
    title: 'The Science of Breeding',
    subtitle: 'Understanding genetics and bloodlines',
    icon: '🧬',
    image_url: '/assets/story/chapter-7-science-breeding.png',
    story_text: [
      "A heavily annotated page: 'Champions aren't always bought or found. Sometimes, they must be created through careful breeding.'",
      "Breeding is both art and science. Choose compatible dogs, understand genetics, and watch as potential unfolds across generations.",
      "Your first breeding won't create a champion, but it will teach you about inheritance, potential, and patience. This knowledge is priceless.",
    ],
    objectives: [
      {
        id: 'own_two_adult_dogs',
        description: 'Own 2 adult dogs',
        type: 'custom',
        target_value: 2,
        completed: false,
        hint: 'You need multiple dogs to breed',
      },
      {
        id: 'breed_first_litter',
        description: 'Successfully breed your first litter',
        type: 'breed',
        target_value: 1,
        completed: false,
        hint: 'Both dogs must be adult with good bond levels',
      },
      {
        id: 'raise_puppy_to_adult',
        description: 'Raise a puppy to adulthood',
        type: 'custom',
        target_value: 1,
        completed: false,
        hint: 'Care for your puppy as it grows over time',
      },
    ],
    rewards: {
      cash: 3500,
      xp: 600,
      gems: 30,
      items: ['luxury_toy_set'],
    },
    unlock_requirement: {
      previous_chapter: 'ch6_regional_success',
      min_level: 6,
      min_dogs: 2,
    },
  },
  {
    id: 'ch8_mastering_bloodlines',
    chapter_number: 8,
    title: 'Perfecting the Bloodline',
    subtitle: 'Advanced breeding strategies',
    icon: '👑',
    image_url: '/assets/story/chapter-8-perfect-bloodline.png',
    story_text: [
      "An excited entry: 'I've done it! By selecting the right parents and understanding genetic potential, I've bred a dog superior to both parents!'",
      "This is the secret the legends never share: genetic selection and patience. Each generation can be better than the last.",
      "Study your dogs' stats, choose breeding pairs wisely, and create a bloodline that will dominate competitions for years to come.",
    ],
    objectives: [
      {
        id: 'breed_second_generation',
        description: 'Breed a second generation (puppy from bred dog)',
        type: 'breed',
        target_value: 2,
        completed: false,
        hint: 'Breed your bred dog to create a second generation',
      },
      {
        id: 'win_regional_competition',
        description: 'Win a Regional competition',
        type: 'compete',
        target_value: 1,
        completed: false,
        hint: 'Your bred dogs should have better stats',
      },
      {
        id: 'dog_with_200_stat',
        description: 'Have a dog with 200 in any trained stat',
        type: 'custom',
        target_value: 200,
        completed: false,
        hint: 'Bred dogs with good genetics train better',
      },
    ],
    rewards: {
      cash: 5000,
      xp: 800,
      gems: 40,
      items: ['master_training_pack', 'care_package'],
    },
    unlock_requirement: {
      previous_chapter: 'ch7_genetics_introduction',
      min_level: 8,
    },
  },
  {
    id: 'ch9_championship_preparation',
    chapter_number: 9,
    title: 'The Road to Glory',
    subtitle: 'Preparing for the ultimate test',
    icon: '⭐',
    image_url: '/assets/story/chapter-9-road-to-glory.png',
    story_text: [
      "The final entries: 'Everything I've learned—care, bonding, training, competition, breeding—it all leads to this moment.'",
      "A champion is more than stats. They're perfectly bonded, expertly trained, from superior bloodlines, and battle-tested.",
      "Prepare your best dog. Max out their potential. Build an unbreakable bond. This is what you've been working toward.",
    ],
    objectives: [
      {
        id: 'reach_bond_level_5',
        description: 'Reach maximum bond level (5) with a dog',
        type: 'bond',
        target_value: 5,
        completed: false,
        hint: 'Keep caring for and playing with your best dog',
      },
      {
        id: 'total_stats_500',
        description: 'Have a dog with 500+ total trained stats',
        type: 'custom',
        target_value: 500,
        completed: false,
        hint: 'Balance training across all stats',
      },
      {
        id: 'win_three_regional',
        description: 'Win 3 Regional competitions',
        type: 'compete',
        target_value: 3,
        completed: false,
        hint: 'Prove yourself at the regional level',
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
      cash: 7500,
      xp: 1000,
      gems: 50,
      unlock_feature: 'championship_competitions',
    },
    unlock_requirement: {
      previous_chapter: 'ch8_mastering_bloodlines',
      min_level: 9,
    },
  },
  {
    id: 'ch10_grand_championship',
    chapter_number: 10,
    title: 'The Grand Championship',
    subtitle: 'Proving you are the best',
    icon: '🌟',
    image_url: '/assets/story/chapter-10-grand-championship.png',
    story_text: [
      "You close the journal. Your mentor's final words echo in your mind: 'The student has become the master.'",
      "The Grand Championship awaits—the ultimate test of everything you've learned. Only the finest dogs and trainers compete here.",
      "Win this, and you'll have proven yourself worthy of your mentor's legacy. Win this, and you'll earn a reward beyond measure: the choice of a rare, legendary dog to join your kennel.",
      "This is your moment. This is your championship. Show the world what you've learned.",
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
        id: 'dog_with_600_stats',
        description: 'Have a dog with 600+ total trained stats',
        type: 'custom',
        target_value: 600,
        completed: false,
        hint: 'Maximum training creates champions',
      },
      {
        id: 'perfect_bloodline',
        description: 'Breed a third generation champion',
        type: 'breed',
        target_value: 3,
        completed: false,
        hint: 'Your bloodline is your legacy',
      },
    ],
    rewards: {
      cash: 15000,
      xp: 2500,
      gems: 100,
      unlock_feature: 'rare_dog_selection',
    },
    unlock_requirement: {
      previous_chapter: 'ch9_championship_preparation',
      min_level: 12,
    },
  },
];

/**
 * Rare dog breeds available as final chapter reward
 * These are special dogs not available in the normal shop
 */
export const rareRewardDogs = [
  {
    id: 'rare_doberman',
    name: 'Elite Doberman',
    description: 'A perfectly bred Doberman with exceptional stats and champion bloodlines',
    icon: '🦮',
  },
  {
    id: 'rare_german_shepherd',
    name: 'Champion German Shepherd',
    description: 'An elite German Shepherd from a legendary breeding program',
    icon: '🐕‍🦺',
  },
  {
    id: 'rare_border_collie',
    name: 'Master Border Collie',
    description: 'An incredibly intelligent Border Collie with superior agility',
    icon: '🐕',
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
