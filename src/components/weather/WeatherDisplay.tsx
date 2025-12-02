import { useGameStore } from '../../stores/gameStore';
import { getWeatherDescription, getSeasonDescription, canDoOutdoorActivities } from '../../utils/weatherSystem';
import { WEATHER_EFFECTS, SEASONAL_EFFECTS } from '../../data/weatherData';

export default function WeatherDisplay() {
  const { user } = useGameStore();

  if (!user?.weather) {
    return null;
  }

  const { currentSeason, currentWeather, temperature } = user.weather;
  const weatherEmoji = WEATHER_EFFECTS[currentWeather].visualEffect;
  const seasonalEffects = SEASONAL_EFFECTS[currentSeason];
  const weatherEffects = WEATHER_EFFECTS[currentWeather];
  const outdoorAllowed = canDoOutdoorActivities(currentWeather);

  const seasonColors: Record<string, string> = {
    spring: 'from-green-400 to-green-600',
    summer: 'from-yellow-400 to-orange-500',
    fall: 'from-orange-400 to-red-500',
    winter: 'from-blue-400 to-cyan-500',
  };

  return (
    <div className="bg-white/90 backdrop-blur-sm rounded-lg shadow-lg p-4">
      {/* Header with Season */}
      <div className={`bg-gradient-to-r ${seasonColors[currentSeason]} rounded-lg p-3 mb-3 text-white`}>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold capitalize">{currentSeason}</h3>
            <p className="text-sm opacity-90">{getSeasonDescription(currentSeason)}</p>
          </div>
          <span className="text-4xl">{weatherEmoji}</span>
        </div>
      </div>

      {/* Current Weather */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-earth-900 capitalize">
              {currentWeather} Weather
            </p>
            <p className="text-xs text-earth-600">
              {getWeatherDescription(currentWeather, temperature)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-earth-900">{temperature}°F</p>
          </div>
        </div>

        {/* Weather Effects */}
        <div className="bg-earth-50 rounded-lg p-3 space-y-2">
          <p className="text-xs font-semibold text-earth-700 mb-2">Current Effects:</p>

          {/* Outdoor Activities Status */}
          <div className="flex items-center gap-2 text-sm">
            <span>{outdoorAllowed ? '✅' : '❌'}</span>
            <span className={outdoorAllowed ? 'text-green-700' : 'text-red-700'}>
              {outdoorAllowed ? 'Outdoor activities available' : 'Indoor activities only'}
            </span>
          </div>

          {/* Training Modifier */}
          {weatherEffects.trainingModifier !== 1.0 && (
            <div className="flex items-center gap-2 text-sm">
              <span>🎓</span>
              <span className={weatherEffects.trainingModifier > 1.0 ? 'text-green-700' : 'text-orange-700'}>
                Training: {weatherEffects.trainingModifier > 1.0 ? '+' : ''}
                {Math.round((weatherEffects.trainingModifier - 1.0) * 100)}%
              </span>
            </div>
          )}

          {/* Seasonal Training Bonus */}
          {seasonalEffects.trainingBonus > 0 && (
            <div className="flex items-center gap-2 text-sm">
              <span>⭐</span>
              <span className="text-blue-700">
                Seasonal training bonus: +{Math.round(seasonalEffects.trainingBonus * 100)}%
              </span>
            </div>
          )}

          {/* Mood Modifier */}
          {weatherEffects.moodModifier !== 1.0 && (
            <div className="flex items-center gap-2 text-sm">
              <span>💕</span>
              <span className={weatherEffects.moodModifier > 1.0 ? 'text-green-700' : 'text-orange-700'}>
                Mood: {weatherEffects.moodModifier > 1.0 ? '+' : ''}
                {Math.round((weatherEffects.moodModifier - 1.0) * 100)}%
              </span>
            </div>
          )}

          {/* Energy Modifier */}
          {(weatherEffects.energyModifier !== 1.0 || seasonalEffects.energyModifier !== 1.0) && (
            <div className="flex items-center gap-2 text-sm">
              <span>⚡</span>
              <span className="text-earth-700">
                Energy consumption: {weatherEffects.energyModifier * seasonalEffects.energyModifier > 1.0 ? '+' : ''}
                {Math.round(((weatherEffects.energyModifier * seasonalEffects.energyModifier) - 1.0) * 100)}%
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
