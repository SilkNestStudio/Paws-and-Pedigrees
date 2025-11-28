import { Dog } from '../types';

/**
 * Dog Image Loader
 *
 * Automatically loads dog images based on genetics (color, pattern) and pose.
 * Falls back to placeholder if specific variant doesn't exist.
 *
 * File naming convention:
 * /dog-images/{breed_name}/{color}_{pattern}_{pose}.png
 *
 * Examples:
 * - /dog-images/golden-retriever/golden_solid_sitting.png
 * - /dog-images/dalmatian/white_spotted_standing.png
 * - /dog-images/german-shepherd/black_tan_playing.png
 */

// Placeholder image (simple dog silhouette)
const PLACEHOLDER_IMAGE = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"%3E%3Crect fill="%23e0e0e0" width="200" height="200"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%23999" font-size="14" font-family="Arial"%3EDog Image%3C/text%3E%3C/svg%3E';

/**
 * Normalizes breed name for file paths (lowercase, hyphens)
 */
function normalizeBreedName(breedName: string): string {
  return breedName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

/**
 * Normalizes color/pattern for file paths (lowercase, no spaces)
 */
function normalizeGenetic(value: string): string {
  return value.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
}

/**
 * Checks if an image exists at the given path
 */
async function imageExists(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, { method: 'HEAD' });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Gets the appropriate dog image based on genetics and pose
 */
export async function getDogImage(
  breedName: string,
  color: string,
  pattern: string,
  pose: 'sitting' | 'standing' | 'playing'
): Promise<string> {
  const normalizedBreed = normalizeBreedName(breedName);
  const normalizedColor = normalizeGenetic(color);
  const normalizedPattern = normalizeGenetic(pattern);

  // Try full path: /dog-images/{breed}/{color}_{pattern}_{pose}.png
  const fullPath = `/dog-images/${normalizedBreed}/${normalizedColor}_${normalizedPattern}_${pose}.png`;
  if (await imageExists(fullPath)) {
    return fullPath;
  }

  // Try without pattern: /dog-images/{breed}/{color}_solid_{pose}.png
  const solidPath = `/dog-images/${normalizedBreed}/${normalizedColor}_solid_${pose}.png`;
  if (await imageExists(solidPath)) {
    return solidPath;
  }

  // Try default color for breed: /dog-images/{breed}/default_{pose}.png
  const defaultPath = `/dog-images/${normalizedBreed}/default_${pose}.png`;
  if (await imageExists(defaultPath)) {
    return defaultPath;
  }

  // Fallback to placeholder
  return PLACEHOLDER_IMAGE;
}

/**
 * Synchronous version that returns the path without checking existence
 * Use this for initial render, then load actual image asynchronously
 */
export function getDogImagePath(
  breedName: string,
  color: string,
  pattern: string,
  pose: 'sitting' | 'standing' | 'playing'
): string {
  const normalizedBreed = normalizeBreedName(breedName);
  const normalizedColor = normalizeGenetic(color);
  const normalizedPattern = normalizeGenetic(pattern);

  // Return the expected path - browser will handle 404 if it doesn't exist
  return `/dog-images/${normalizedBreed}/${normalizedColor}_${normalizedPattern}_${pose}.png`;
}

/**
 * Get dog image for a Dog object based on its current state
 */
export function getDogImageByState(dog: Dog, breedName: string): string {
  // Determine pose based on dog's state
  let pose: 'sitting' | 'standing' | 'playing' = 'sitting';

  if (dog.energy_stat < 30 || dog.health < 50) {
    pose = 'playing'; // Tired/sick dogs lay down
  } else if (dog.energy_stat > 70 && dog.happiness > 70) {
    pose = 'standing'; // Energetic and happy dogs stand
  }

  return getDogImagePath(breedName, dog.coat_color, dog.coat_pattern, pose);
}

/**
 * Preload all images for a specific dog to avoid loading delays
 */
export function preloadDogImages(breedName: string, color: string, pattern: string): void {
  const poses: Array<'sitting' | 'standing' | 'playing'> = ['sitting', 'standing', 'playing'];

  poses.forEach(pose => {
    const img = new Image();
    img.src = getDogImagePath(breedName, color, pattern, pose);
  });
}
