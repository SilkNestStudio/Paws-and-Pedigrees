-- Add weather system to user profiles
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS weather JSONB DEFAULT '{
  "currentSeason": "spring",
  "currentWeather": "sunny",
  "temperature": 70,
  "lastWeatherChange": null,
  "activeEvents": []
}'::jsonb;

-- Add comment for documentation
COMMENT ON COLUMN profiles.weather IS 'Stores current weather and seasonal information for the user';
