import { Dog, Breed } from '../types';
import { generatePersonality } from './personalityGenerator';

export function generateDog(
  breed: Breed,
  name: string,
  userId: string,
  isRescue: boolean = false,
  preferredGender?: 'male' | 'female'
): Dog {
  const gender: 'male' | 'female' = preferredGender || (Math.random() > 0.5 ? 'male' : 'female');

  // Generate random stats within breed ranges (rescue dogs get slightly lower stats)
  const statMultiplier = isRescue ? 0.6 : 1.0;

  const randomStat = (min: number, max: number) => {
    const range = max - min;
    const value = min + Math.random() * range;
    return Math.round(value * statMultiplier);
  };

  const coatColors = ['black', 'brown', 'tan', 'white', 'gold', 'red', 'blue', 'cream'];
  const coatPatterns = ['solid', 'spotted', 'brindle', 'merle', 'tuxedo'];
  const eyeColors = ['brown', 'amber', 'blue', 'green', 'hazel'];

  const rescueStories = [
    "Found wandering the streets, hungry and alone.",
    "Previous owner couldn't keep them due to moving.",
    "Rescued from a neglectful home.",
    "Found abandoned in a park.",
    "Owner passed away, family couldn't take care of them.",
    "Breed restrictions forced surrender.",
    "Lost and never claimed from the shelter."
  ];

  return {
    id: crypto.randomUUID(),
    user_id: userId,
    breed_id: breed.id,
    name,
    gender,
    birth_date: new Date().toISOString(),

    // Base stats
    size: randomStat(breed.size_min, breed.size_max),
    energy: randomStat(breed.energy_min, breed.energy_max),
    friendliness: randomStat(breed.friendliness_min, breed.friendliness_max),
    trainability: randomStat(breed.trainability_min, breed.trainability_max),
    intelligence: randomStat(breed.intelligence_min, breed.intelligence_max),
    speed: randomStat(breed.speed_min, breed.speed_max),
    agility: randomStat(breed.agility_min, breed.agility_max),
    strength: randomStat(breed.strength_min, breed.strength_max),
    endurance: randomStat(breed.endurance_min, breed.endurance_max),
    prey_drive: randomStat(breed.prey_drive_min, breed.prey_drive_max),
    protectiveness: randomStat(breed.protectiveness_min, breed.protectiveness_max),

    // Trained stats (start at 0)
    speed_trained: 0,
    agility_trained: 0,
    strength_trained: 0,
    endurance_trained: 0,
    obedience_trained: 0,

    // Appearance
    coat_type: breed.coat_types[Math.floor(Math.random() * breed.coat_types.length)],
    coat_color: coatColors[Math.floor(Math.random() * coatColors.length)],
    coat_pattern: coatPatterns[Math.floor(Math.random() * coatPatterns.length)],
    eye_color: eyeColors[Math.floor(Math.random() * eyeColors.length)],

    // Personality
    personality: generatePersonality(breed),

    // Care stats (rescue dogs start slightly lower)
    hunger: isRescue ? 60 : 100,
    thirst: isRescue ? 60 : 100,
    happiness: isRescue ? 50 : 100,
    energy_stat: isRescue ? 70 : 100,
    health: isRescue ? 80 : 100,

    // Training
    training_points: 100,
    training_sessions_today: 0,
    last_training_reset: new Date().toISOString(),
    tp_refills_today: 0,

    // Bond (rescue dogs start at 0)
    bond_level: isRescue ? 0 : 1,
    bond_xp: 0,

    // Origin
    is_rescue: isRescue,
    rescue_story: isRescue ? rescueStories[Math.floor(Math.random() * rescueStories.length)] : undefined,

    // Breeding fields (rescue dogs are adults, bred puppies start at 0 weeks)
    age_weeks: isRescue ? 52 : 0, // Rescues are 1 year old (52 weeks), puppies start at 0
    is_pregnant: false,
    pregnancy_due: undefined,
    last_bred: undefined,
    litter_size: undefined,

    created_at: new Date().toISOString(),
    last_fed: new Date().toISOString(),
    last_watered: new Date().toISOString(),
    last_played: new Date().toISOString(),
  };
}
