/**
 * Memoized Selectors and Computations
 *
 * This file contains memoized functions for expensive calculations
 * that are used frequently throughout the app
 */

import { Dog, UserProfile, Breed } from '../types';

/**
 * Cache for memoized results
 */
const cache = new Map<string, { result: any; timestamp: number }>();
const CACHE_TTL = 5000; // 5 seconds

/**
 * Generic memoization function with TTL
 */
function memoize<T>(key: string, fn: () => T, ttl: number = CACHE_TTL): T {
  const cached = cache.get(key);
  const now = Date.now();

  if (cached && now - cached.timestamp < ttl) {
    return cached.result;
  }

  const result = fn();
  cache.set(key, { result, timestamp: now });
  return result;
}

/**
 * Clear all cache entries
 */
export function clearMemoizationCache() {
  cache.clear();
}

/**
 * Calculate total stats for a dog (memoized)
 */
export function getTotalStats(dog: Dog): number {
  const key = `stats-${dog.id}-${dog.speed}-${dog.agility}-${dog.strength}-${dog.endurance}`;
  return memoize(key, () => {
    return (
      dog.speed +
      dog.agility +
      dog.strength +
      dog.endurance +
      dog.intelligence +
      dog.obedience_trained
    );
  });
}

/**
 * Calculate dog's competition readiness (memoized)
 */
export function getCompetitionReadiness(dog: Dog): {
  ready: boolean;
  score: number;
  issues: string[];
} {
  const key = `readiness-${dog.id}-${dog.health}-${dog.energy_stat}-${dog.happiness}`;
  return memoize(key, () => {
    const issues: string[] = [];
    let score = 100;

    if (dog.health < 80) {
      issues.push('Low health');
      score -= 20;
    }
    if (dog.energy_stat < 50) {
      issues.push('Low energy');
      score -= 15;
    }
    if (dog.happiness < 70) {
      issues.push('Low happiness');
      score -= 15;
    }
    if (dog.hunger > 50) {
      issues.push('Hungry');
      score -= 10;
    }
    if (dog.thirst > 50) {
      issues.push('Thirsty');
      score -= 10;
    }

    return {
      ready: score >= 70,
      score,
      issues,
    };
  });
}

/**
 * Sort dogs by various criteria (memoized)
 */
export function sortDogs(
  dogs: Dog[],
  sortBy: 'name' | 'level' | 'stats' | 'health' | 'age'
): Dog[] {
  const key = `sort-${sortBy}-${dogs.map(d => d.id).join(',')}`;
  return memoize(key, () => {
    return [...dogs].sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'level':
          return (b.bond_level || 0) - (a.bond_level || 0);
        case 'stats':
          return getTotalStats(b) - getTotalStats(a);
        case 'health':
          return b.health - a.health;
        case 'age':
          return b.age_weeks - a.age_weeks;
        default:
          return 0;
      }
    });
  });
}

/**
 * Filter dogs by various criteria (memoized)
 */
export function filterDogs(
  dogs: Dog[],
  filters: {
    searchTerm?: string;
    breedId?: number;
    minHealth?: number;
    lifeStage?: 'puppy' | 'adult' | 'senior';
    hasSpecialization?: boolean;
  }
): Dog[] {
  const key = `filter-${JSON.stringify(filters)}-${dogs.map(d => d.id).join(',')}`;
  return memoize(key, () => {
    return dogs.filter(dog => {
      if (filters.searchTerm) {
        const term = filters.searchTerm.toLowerCase();
        if (!dog.name.toLowerCase().includes(term)) {
          return false;
        }
      }

      if (filters.breedId !== undefined && dog.breed_id !== filters.breedId) {
        return false;
      }

      if (filters.minHealth !== undefined && dog.health < filters.minHealth) {
        return false;
      }

      if (filters.lifeStage && dog.life_stage !== filters.lifeStage) {
        return false;
      }

      if (filters.hasSpecialization !== undefined) {
        const hasSpec = !!dog.specialization;
        if (hasSpec !== filters.hasSpecialization) {
          return false;
        }
      }

      return true;
    });
  });
}

/**
 * Calculate user statistics (memoized)
 */
export function getUserStats(user: UserProfile, dogs: Dog[]): {
  totalDogs: number;
  healthyDogs: number;
  totalPrestige: number;
  averageLevel: number;
  totalStaff: number;
} {
  const key = `user-stats-${user.id}-${dogs.length}-${user.prestigePoints || 0}`;
  return memoize(key, () => {
    const healthyDogs = dogs.filter(d => d.health >= 80).length;
    const totalLevels = dogs.reduce((sum, d) => sum + (d.bond_level || 0), 0);

    return {
      totalDogs: dogs.length,
      healthyDogs,
      totalPrestige: user.prestigePoints || 0,
      averageLevel: dogs.length > 0 ? totalLevels / dogs.length : 0,
      totalStaff: user.staff?.length || 0,
    };
  });
}

/**
 * Get dogs that need attention (memoized)
 */
export function getDogsNeedingAttention(dogs: Dog[]): {
  hungry: Dog[];
  thirsty: Dog[];
  unhappy: Dog[];
  unhealthy: Dog[];
  lowEnergy: Dog[];
} {
  const key = `attention-${dogs.map(d => `${d.id}-${d.hunger}-${d.thirst}-${d.happiness}-${d.health}`).join(',')}`;
  return memoize(key, () => {
    return {
      hungry: dogs.filter(d => d.hunger > 70),
      thirsty: dogs.filter(d => d.thirst > 70),
      unhappy: dogs.filter(d => d.happiness < 50),
      unhealthy: dogs.filter(d => d.health < 70),
      lowEnergy: dogs.filter(d => d.energy_stat < 30),
    };
  });
}

/**
 * Calculate breeding compatibility (memoized)
 */
export function getBreedingCompatibility(dog1: Dog, dog2: Dog): {
  compatible: boolean;
  score: number;
  reasons: string[];
} {
  const key = `breeding-${dog1.id}-${dog2.id}`;
  return memoize(key, () => {
    const reasons: string[] = [];
    let score = 100;

    // Same gender
    if (dog1.gender === dog2.gender) {
      reasons.push('Same gender');
      return { compatible: false, score: 0, reasons };
    }

    // Too young
    if (dog1.age_weeks < 52 || dog2.age_weeks < 52) {
      reasons.push('One or both dogs too young');
      score -= 50;
    }

    // Health issues
    if (dog1.health < 80 || dog2.health < 80) {
      reasons.push('One or both dogs have health issues');
      score -= 30;
    }

    // Recently bred
    const now = new Date();
    if (dog1.last_bred) {
      const daysSinceBreeding = (now.getTime() - new Date(dog1.last_bred).getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceBreeding < 30) {
        reasons.push('Dog 1 bred recently');
        score -= 40;
      }
    }
    if (dog2.last_bred) {
      const daysSinceBreeding = (now.getTime() - new Date(dog2.last_bred).getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceBreeding < 30) {
        reasons.push('Dog 2 bred recently');
        score -= 40;
      }
    }

    // Stat synergy
    const totalStats1 = getTotalStats(dog1);
    const totalStats2 = getTotalStats(dog2);
    const avgStats = (totalStats1 + totalStats2) / 2;
    if (avgStats > 400) {
      reasons.push('Excellent stat potential');
      score += 20;
    }

    return {
      compatible: score >= 50,
      score: Math.max(0, score),
      reasons,
    };
  });
}

/**
 * Get recommended training for a dog (memoized)
 */
export function getRecommendedTraining(dog: Dog): Array<{
  type: string;
  priority: number;
  reason: string;
}> {
  const key = `training-rec-${dog.id}-${dog.speed_trained}-${dog.agility_trained}-${dog.strength_trained}-${dog.endurance_trained}-${dog.obedience_trained}`;
  return memoize(key, () => {
    const recommendations: Array<{ type: string; priority: number; reason: string }> = [];

    const stats = {
      speed: dog.speed_trained,
      agility: dog.agility_trained,
      strength: dog.strength_trained,
      endurance: dog.endurance_trained,
      obedience: dog.obedience_trained,
    };

    // Find lowest trained stat
    const lowestStat = Object.entries(stats).reduce((lowest, [stat, value]) =>
      value < lowest.value ? { stat, value } : lowest,
      { stat: 'speed', value: stats.speed }
    );

    recommendations.push({
      type: lowestStat.stat,
      priority: 1,
      reason: `Lowest trained stat (${lowestStat.value})`,
    });

    // Specialization recommendations
    if (dog.specialization) {
      const specType = dog.specialization.specializationType;
      if (specType.includes('agility')) {
        recommendations.push({
          type: 'agility',
          priority: 2,
          reason: 'Matches specialization',
        });
      } else if (specType.includes('strength')) {
        recommendations.push({
          type: 'strength',
          priority: 2,
          reason: 'Matches specialization',
        });
      }
    }

    return recommendations.sort((a, b) => a.priority - b.priority);
  });
}
