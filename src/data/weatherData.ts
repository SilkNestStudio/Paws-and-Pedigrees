import {
  Season,
  WeatherCondition,
  SeasonalEffects,
  WeatherEffects,
  SeasonalEvent,
} from '../types/weather';

// Seasonal effects on gameplay
export const SEASONAL_EFFECTS: Record<Season, SeasonalEffects> = {
  spring: {
    energyModifier: 1.0,
    happinessModifier: 1.1, // Dogs are happier in spring
    trainingBonus: 0.1, // 10% bonus to training
    availableWeather: ['sunny', 'cloudy', 'rainy', 'windy'],
    specialEvents: ['spring_trials', 'easter_egg_hunt'],
  },
  summer: {
    energyModifier: 1.2, // Dogs tire faster in heat
    happinessModifier: 1.0,
    trainingBonus: 0.0,
    competitionBonus: 0.05, // Small bonus for outdoor competitions
    availableWeather: ['sunny', 'cloudy', 'stormy', 'windy'],
    specialEvents: ['summer_championship', 'beach_day'],
  },
  fall: {
    energyModifier: 0.9, // Cooler weather, dogs have more energy
    happinessModifier: 1.05,
    trainingBonus: 0.15, // Best season for training
    availableWeather: ['sunny', 'cloudy', 'rainy', 'windy', 'foggy'],
    specialEvents: ['harvest_festival', 'autumn_agility'],
  },
  winter: {
    energyModifier: 1.1, // Cold weather tires dogs
    happinessModifier: 0.9, // Dogs less happy in cold
    trainingBonus: 0.05,
    availableWeather: ['cloudy', 'snowy', 'foggy', 'windy'],
    specialEvents: ['winter_wonderland', 'new_years_race'],
  },
};

// Weather effects on gameplay
export const WEATHER_EFFECTS: Record<WeatherCondition, WeatherEffects> = {
  sunny: {
    outdoorActivitiesAllowed: true,
    energyModifier: 1.0,
    moodModifier: 1.1, // Dogs love sunny days
    trainingModifier: 1.0,
    competitionModifier: 1.05,
    visualEffect: '☀️',
  },
  cloudy: {
    outdoorActivitiesAllowed: true,
    energyModifier: 0.95,
    moodModifier: 1.0,
    trainingModifier: 1.0,
    visualEffect: '☁️',
  },
  rainy: {
    outdoorActivitiesAllowed: false, // Can't train/compete outdoors
    energyModifier: 1.0,
    moodModifier: 0.9, // Dogs don't like rain
    trainingModifier: 0.8, // Indoor training less effective
    competitionModifier: 0.85,
    visualEffect: '🌧️',
  },
  snowy: {
    outdoorActivitiesAllowed: true,
    energyModifier: 1.15, // Snow is tiring
    moodModifier: 1.05, // Some dogs love snow
    trainingModifier: 0.9,
    competitionModifier: 0.9,
    visualEffect: '❄️',
  },
  stormy: {
    outdoorActivitiesAllowed: false, // Too dangerous
    energyModifier: 1.0,
    moodModifier: 0.8, // Dogs are scared
    trainingModifier: 0.7,
    competitionModifier: 0.0, // No competitions during storms
    visualEffect: '⛈️',
  },
  foggy: {
    outdoorActivitiesAllowed: true,
    energyModifier: 1.0,
    moodModifier: 0.95,
    trainingModifier: 0.95,
    competitionModifier: 0.95,
    visualEffect: '🌫️',
  },
  windy: {
    outdoorActivitiesAllowed: true,
    energyModifier: 1.05,
    moodModifier: 1.0,
    trainingModifier: 0.95,
    competitionModifier: 0.95,
    visualEffect: '💨',
  },
};

// Seasonal events throughout the year
export const SEASONAL_EVENTS: SeasonalEvent[] = [
  {
    id: 'spring_trials',
    name: 'Spring Trials',
    season: 'spring',
    description: 'Celebrate the new season with agility competitions!',
    icon: '🌸',
    startDate: '03-20',
    endDate: '04-05',
    rewards: { cash: 500, xp: 100 },
    specialBonus: '2x XP for agility competitions',
  },
  {
    id: 'easter_egg_hunt',
    name: 'Easter Egg Hunt',
    season: 'spring',
    description: 'Train your dogs to find hidden treats!',
    icon: '🥚',
    startDate: '04-10',
    endDate: '04-17',
    rewards: { gems: 10, cash: 300 },
    specialBonus: 'Bonus intelligence training',
  },
  {
    id: 'summer_championship',
    name: 'Summer Championship',
    season: 'summer',
    description: 'The biggest competition event of the year!',
    icon: '🏆',
    startDate: '07-01',
    endDate: '07-15',
    rewards: { cash: 2000, gems: 25, xp: 500 },
    specialBonus: 'Triple prize money for all competitions',
  },
  {
    id: 'beach_day',
    name: 'Beach Day Festival',
    season: 'summer',
    description: 'Take your dogs to the beach for fun activities!',
    icon: '🏖️',
    startDate: '08-01',
    endDate: '08-07',
    rewards: { cash: 400, xp: 150 },
    specialBonus: 'Happiness boost for all dogs',
  },
  {
    id: 'harvest_festival',
    name: 'Harvest Festival',
    season: 'fall',
    description: 'Celebrate the harvest with special challenges!',
    icon: '🍂',
    startDate: '10-01',
    endDate: '10-15',
    rewards: { cash: 750, xp: 200 },
    specialBonus: 'Reduced training costs',
  },
  {
    id: 'autumn_agility',
    name: 'Autumn Agility Championship',
    season: 'fall',
    description: 'Perfect weather for agility training!',
    icon: '🎯',
    startDate: '10-20',
    endDate: '11-05',
    rewards: { cash: 1000, gems: 15, xp: 300 },
    specialBonus: '50% faster training progression',
  },
  {
    id: 'winter_wonderland',
    name: 'Winter Wonderland',
    season: 'winter',
    description: 'Celebrate the holidays with your furry friends!',
    icon: '🎄',
    startDate: '12-15',
    endDate: '12-31',
    rewards: { gems: 20, cash: 1000, xp: 250 },
    specialBonus: 'Daily login rewards doubled',
  },
  {
    id: 'new_years_race',
    name: "New Year's Racing Cup",
    season: 'winter',
    description: 'Start the new year with exciting races!',
    icon: '🎊',
    startDate: '01-01',
    endDate: '01-07',
    rewards: { cash: 1500, gems: 20, xp: 400 },
    specialBonus: '2x XP for racing competitions',
  },
];

// Weather probability by season (weights for random selection)
export const WEATHER_PROBABILITIES: Record<Season, Record<WeatherCondition, number>> = {
  spring: {
    sunny: 0.35,
    cloudy: 0.25,
    rainy: 0.25,
    snowy: 0.0,
    stormy: 0.05,
    foggy: 0.05,
    windy: 0.05,
  },
  summer: {
    sunny: 0.50,
    cloudy: 0.20,
    rainy: 0.10,
    snowy: 0.0,
    stormy: 0.10,
    foggy: 0.0,
    windy: 0.10,
  },
  fall: {
    sunny: 0.30,
    cloudy: 0.30,
    rainy: 0.20,
    snowy: 0.0,
    stormy: 0.05,
    foggy: 0.10,
    windy: 0.05,
  },
  winter: {
    sunny: 0.20,
    cloudy: 0.35,
    rainy: 0.0,
    snowy: 0.30,
    stormy: 0.0,
    foggy: 0.10,
    windy: 0.05,
  },
};
