export const BREEDING_CONSTANTS = {
  // Costs
  BREEDING_FEE: 350, // Reduced from 500 - early game balance

  // Age requirements (in weeks)
  MIN_BREEDING_AGE: 52, // 12 weeks to be an adult, but need mature for breeding (1 year = 52 weeks)
  MIN_TRAINING_AGE: 8, // Can start training at 8 weeks
  MIN_COMPETITION_AGE: 12, // Can compete at 12 weeks
  ADULT_AGE: 52, // Fully mature at 52 weeks

  // Bond and health requirements
  MIN_BOND_LEVEL: 5, // Both parents must have bond 5+
  MIN_HEALTH: 80, // Both parents must have 80%+ health

  // Cooldowns (in weeks)
  FEMALE_COOLDOWN: 16, // Females can breed every 16 weeks
  MALE_COOLDOWN: 4, // Males can breed every 4 weeks
  PREGNANCY_DURATION: 9, // Pregnancy lasts 9 weeks

  // Litter sizes
  LITTER_SIZE_MIN: 3,
  LITTER_SIZE_MAX: 7,

  // Genetics
  STAT_VARIANCE: 0.1, // ±10% variance from parent average

  // Puppy aging
  WEEKS_PER_DAY: 1, // Puppies age 1 week per real-world day

  // Gem skip costs
  GEM_COST_PER_WEEK: 10, // 10 gems to skip 1 week of pregnancy

  // Puppy pricing (base values, adjusted by stats)
  PUPPY_BASE_PRICE: 600, // Increased from 500 - better breeding ROI
  PUPPY_PRICE_PER_STAT_POINT: 15, // Increased from 10 - rewards quality breeding
};

// Helper to calculate total weeks to skip
export function calculateSkipCost(weeksRemaining: number): number {
  return weeksRemaining * BREEDING_CONSTANTS.GEM_COST_PER_WEEK;
}

// Helper to calculate puppy sale price based on stats
export function calculatePuppyPrice(dog: any): number {
  const relevantStats = [
    dog.speed,
    dog.agility,
    dog.strength,
    dog.endurance,
    dog.intelligence,
    dog.trainability,
  ];

  const avgStat = relevantStats.reduce((sum, stat) => sum + stat, 0) / relevantStats.length;
  const basePrice = BREEDING_CONSTANTS.PUPPY_BASE_PRICE;

  if (avgStat <= 50) {
    return basePrice;
  }

  const bonus = (avgStat - 50) * BREEDING_CONSTANTS.PUPPY_PRICE_PER_STAT_POINT;
  return Math.round(basePrice + bonus);
}
