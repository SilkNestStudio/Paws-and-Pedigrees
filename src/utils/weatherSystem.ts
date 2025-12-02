import {
  Season,
  WeatherCondition,
  GameWeather,
  SeasonalEvent,
} from '../types/weather';
import {
  SEASONAL_EFFECTS,
  WEATHER_EFFECTS,
  SEASONAL_EVENTS,
  WEATHER_PROBABILITIES,
} from '../data/weatherData';

// Determine current season based on date
export function getCurrentSeason(date: Date = new Date()): Season {
  const month = date.getMonth(); // 0-11

  if (month >= 2 && month <= 4) return 'spring'; // Mar, Apr, May
  if (month >= 5 && month <= 7) return 'summer'; // Jun, Jul, Aug
  if (month >= 8 && month <= 10) return 'fall'; // Sep, Oct, Nov
  return 'winter'; // Dec, Jan, Feb
}

// Get season start date
export function getSeasonStartDate(season: Season, year: number): Date {
  const seasonStarts: Record<Season, [number, number]> = {
    spring: [2, 1], // March 1
    summer: [5, 1], // June 1
    fall: [8, 1], // September 1
    winter: [11, 1], // December 1
  };

  const [month, day] = seasonStarts[season];
  return new Date(year, month, day);
}

// Generate random weather based on season probabilities
export function generateWeather(season: Season): WeatherCondition {
  const probabilities = WEATHER_PROBABILITIES[season];
  const conditions = Object.keys(probabilities) as WeatherCondition[];
  const weights = Object.values(probabilities);

  // Weighted random selection
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  let random = Math.random() * totalWeight;

  for (let i = 0; i < conditions.length; i++) {
    random -= weights[i];
    if (random <= 0) {
      return conditions[i];
    }
  }

  return conditions[0]; // Fallback
}

// Calculate temperature based on season and weather
export function calculateTemperature(
  season: Season,
  weather: WeatherCondition
): number {
  const baseTemps: Record<Season, [number, number]> = {
    spring: [55, 70],
    summer: [75, 95],
    fall: [50, 65],
    winter: [25, 45],
  };

  const [min, max] = baseTemps[season];
  let temp = min + Math.random() * (max - min);

  // Adjust for weather
  if (weather === 'sunny') temp += 5;
  if (weather === 'rainy') temp -= 5;
  if (weather === 'snowy') temp -= 10;
  if (weather === 'cloudy') temp -= 2;

  return Math.round(temp);
}

// Initialize weather system
export function initializeWeather(): GameWeather {
  const now = new Date();
  const season = getCurrentSeason(now);
  const weather = generateWeather(season);
  const temperature = calculateTemperature(season, weather);

  return {
    currentSeason: season,
    currentWeather: weather,
    temperature,
    lastWeatherChange: now.toISOString(),
    seasonStartDate: getSeasonStartDate(season, now.getFullYear()).toISOString(),
  };
}

// Update weather (call this periodically, e.g., every hour)
export function updateWeather(currentWeather: GameWeather): GameWeather {
  const now = new Date();
  const lastChange = new Date(currentWeather.lastWeatherChange);
  const hoursSinceChange = (now.getTime() - lastChange.getTime()) / (1000 * 60 * 60);

  // Update season if needed
  const newSeason = getCurrentSeason(now);
  const seasonChanged = newSeason !== currentWeather.currentSeason;

  // Change weather every 4-8 hours
  const shouldChangeWeather = hoursSinceChange >= 4;

  if (shouldChangeWeather || seasonChanged) {
    const newWeather = generateWeather(newSeason);
    const newTemp = calculateTemperature(newSeason, newWeather);

    return {
      currentSeason: newSeason,
      currentWeather: newWeather,
      temperature: newTemp,
      lastWeatherChange: now.toISOString(),
      seasonStartDate: seasonChanged
        ? getSeasonStartDate(newSeason, now.getFullYear()).toISOString()
        : currentWeather.seasonStartDate,
    };
  }

  return currentWeather;
}

// Get active seasonal events
export function getActiveSeasonalEvents(date: Date = new Date()): SeasonalEvent[] {
  const month = date.getMonth() + 1; // 1-12
  const day = date.getDate();
  const currentDate = `${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;

  return SEASONAL_EVENTS.filter(event => {
    return currentDate >= event.startDate && currentDate <= event.endDate;
  });
}

// Get seasonal effects for current season
export function getSeasonalEffects(season: Season) {
  return SEASONAL_EFFECTS[season];
}

// Get weather effects for current weather
export function getWeatherEffects(weather: WeatherCondition) {
  return WEATHER_EFFECTS[weather];
}

// Calculate combined modifier for training
export function getTrainingModifier(season: Season, weather: WeatherCondition): number {
  const seasonalEffects = SEASONAL_EFFECTS[season];
  const weatherEffects = WEATHER_EFFECTS[weather];

  const baseModifier = 1.0;
  const seasonBonus = seasonalEffects.trainingBonus;
  const weatherMod = weatherEffects.trainingModifier;

  return baseModifier + seasonBonus * weatherMod;
}

// Calculate combined modifier for competitions
export function getCompetitionModifier(season: Season, weather: WeatherCondition): number {
  const seasonalEffects = SEASONAL_EFFECTS[season];
  const weatherEffects = WEATHER_EFFECTS[weather];

  const seasonBonus = seasonalEffects.competitionBonus || 0;
  const weatherMod = weatherEffects.competitionModifier || 1.0;

  return (1.0 + seasonBonus) * weatherMod;
}

// Check if outdoor activities are allowed
export function canDoOutdoorActivities(weather: WeatherCondition): boolean {
  return WEATHER_EFFECTS[weather].outdoorActivitiesAllowed;
}

// Get weather description
export function getWeatherDescription(weather: WeatherCondition, temp: number): string {
  const descriptions: Record<WeatherCondition, string> = {
    sunny: `Beautiful sunny day at ${temp}°F - perfect for outdoor activities!`,
    cloudy: `Overcast skies at ${temp}°F - comfortable weather for training.`,
    rainy: `Rainy weather at ${temp}°F - indoor activities only.`,
    snowy: `Snowy conditions at ${temp}°F - dogs love playing in the snow!`,
    stormy: `Severe storm at ${temp}°F - stay indoors for safety!`,
    foggy: `Foggy conditions at ${temp}°F - limited visibility outside.`,
    windy: `Windy day at ${temp}°F - hold onto those leashes!`,
  };

  return descriptions[weather];
}

// Get season description
export function getSeasonDescription(season: Season): string {
  const descriptions: Record<Season, string> = {
    spring: 'Spring - The season of renewal and growth',
    summer: 'Summer - Warm weather and outdoor fun',
    fall: 'Fall - Perfect training weather',
    winter: 'Winter - Cozy season with snowy adventures',
  };

  return descriptions[season];
}
