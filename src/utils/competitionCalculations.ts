import { Dog } from '../types';
import { CompetitionType } from '../data/competitionTypes';

export function calculateCompetitionScore(
  dog: Dog,
  competition: CompetitionType,
  playerSkill: number // 0-100, affects manual play bonus
): number {
  let totalScore = 0;

  // Calculate weighted score from stats
  Object.entries(competition.statWeights).forEach(([stat, weight]) => {
    let statValue = 0;

    switch(stat) {
      case 'speed':
        statValue = dog.speed + (dog.speed_trained || 0);
        break;
      case 'agility':
        statValue = dog.agility + (dog.agility_trained || 0);
        break;
      case 'strength':
        statValue = dog.strength + (dog.strength_trained || 0);
        break;
      case 'endurance':
        statValue = dog.endurance + (dog.endurance_trained || 0);
        break;
      case 'obedience':
        statValue = dog.obedience_trained || 0;
        break;
      case 'intelligence':
        statValue = dog.intelligence;
        break;
      case 'trainability':
        statValue = dog.trainability;
        break;
    }

    totalScore += statValue * weight;
  });

  // Multiply by 10 to get scores in 0-100 range
  totalScore = totalScore * 10;

  // Add small random variance (±5%)
  const variance = (Math.random() - 0.5) * 0.1;
  totalScore = totalScore * (1 + variance);

  // Player skill bonus if manual play
  if (playerSkill > 0) {
    const skillBonus = playerSkill / 100 * 0.2; // Up to 20% bonus
    totalScore = totalScore * (1 + skillBonus);
  }

  // Bond level bonus (up to 10% at bond 10)
  const bondBonus = (dog.bond_level / 10) * 0.1;
  totalScore = totalScore * (1 + bondBonus);

  return Math.round(totalScore);
}

export function generateAICompetitors(count: number, minStat: number, maxStat: number): Array<{ name: string; score: number }> {
  const aiNames = [
    'Max', 'Bella', 'Charlie', 'Luna', 'Cooper', 'Daisy', 'Rocky', 'Sadie',
    'Duke', 'Molly', 'Bear', 'Maggie', 'Zeus', 'Sophie', 'Jack', 'Chloe'
  ];

  const competitors: Array<{ name: string; score: number }> = [];

  for (let i = 0; i < count; i++) {
    const name = aiNames[Math.floor(Math.random() * aiNames.length)];
    const baseScore = minStat + Math.random() * (maxStat - minStat);
    const score = Math.round(baseScore * 10 * (0.9 + Math.random() * 0.2));
    
    competitors.push({ name, score });
  }

  return competitors;
}

export function determineWinner(scores: Array<{ name: string; score: number }>) {
  const sorted = [...scores].sort((a, b) => b.score - a.score);
  
  return sorted.map((entry, index) => ({
    ...entry,
    placement: index + 1,
  }));
}