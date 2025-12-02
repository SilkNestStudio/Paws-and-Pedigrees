export type Season = 'spring' | 'summer' | 'fall' | 'winter';

export type WeatherCondition =
  | 'sunny'
  | 'cloudy'
  | 'rainy'
  | 'snowy'
  | 'stormy'
  | 'foggy'
  | 'windy';

export interface SeasonalEffects {
  energyModifier: number; // Multiplier for energy consumption (0.8 - 1.2)
  happinessModifier: number; // Modifier for happiness decay rate
  trainingBonus: number; // Bonus to training effectiveness
  competitionBonus?: number; // Bonus to specific competition types
  availableWeather: WeatherCondition[];
  specialEvents?: string[]; // IDs of seasonal events
}

export interface WeatherEffects {
  outdoorActivitiesAllowed: boolean; // Can do outdoor training/competitions
  energyModifier: number; // Affects energy consumption
  moodModifier: number; // Affects happiness gain/loss
  trainingModifier: number; // Affects training effectiveness
  competitionModifier?: number; // Affects competition scores
  visualEffect: string; // CSS class or emoji for visual representation
}

export interface GameWeather {
  currentSeason: Season;
  currentWeather: WeatherCondition;
  temperature: number; // In Fahrenheit
  lastWeatherChange: string; // ISO timestamp
  seasonStartDate: string; // ISO timestamp when current season started
  forecastWeather?: WeatherCondition; // Next weather condition
  forecastChangesAt?: string; // When weather will change
}

export interface SeasonalEvent {
  id: string;
  name: string;
  season: Season;
  description: string;
  icon: string;
  startDate: string; // MM-DD format
  endDate: string; // MM-DD format
  rewards?: {
    cash?: number;
    gems?: number;
    xp?: number;
  };
  specialBonus?: string; // Description of special bonus during event
}
