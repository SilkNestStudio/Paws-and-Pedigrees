import { useState } from 'react';
import type { CompetitionEvent } from '../../types/competition';
import type { Dog } from '../../types';
import { useGameStore } from '../../stores/gameStore';
import { generateAICompetitors, determineWinners, getScoreRange } from '../../utils/competitionAI';
import { submitCompetitionScore } from '../../utils/leaderboardService';
import { showToast } from '../../lib/toast';
import AgilityGameV2 from './minigames/AgilityGameV2';
import ObedienceGameV2 from './minigames/ObedienceGameV2';
import WeightPullGameV2 from './minigames/WeightPullGameV2';
import RacingGameV2 from './minigames/RacingGameV2';
import ConformationGameV2 from './minigames/ConformationGameV2';

interface CompetitionRunnerProps {
  event: CompetitionEvent;
  dog: Dog;
  onComplete: () => void;
}

interface CompetitionResult {
  name: string;
  breed: string;
  score: number;
  placement: number;
  isPlayer: boolean;
}

export default function CompetitionRunner({ event, dog, onComplete }: CompetitionRunnerProps) {
  const [gameState, setGameState] = useState<'ready' | 'playing' | 'results'>('ready');
  const [results, setResults] = useState<CompetitionResult[] | null>(null);
  const { user, updateUserCash, awardChampionshipPoints } = useGameStore();

  const handleMiniGameComplete = async (playerScore: number) => {
    setGameState('results');

    // If player cancelled (score = 0), don't run competition
    if (playerScore === 0) {
      onComplete();
      return;
    }

    // Generate AI competitors
    const aiCompetitors = generateAICompetitors(
      event.discipline,
      event.eventType,
      event.maxEntries,
      event.currentEntries
    );

    // Combine player and AI scores
    const allScores = [
      { name: dog.name, score: playerScore },
      ...aiCompetitors,
    ];

    // Determine placements
    const winners = determineWinners(allScores);

    // Find player's result
    const playerResult = winners.find(w => w.name === dog.name);
    if (!playerResult) {
      showToast.error('Error calculating results!');
      onComplete();
      return;
    }

    // Format results with breed info
    const formattedResults: CompetitionResult[] = winners.slice(0, 8).map(w => ({
      ...w,
      breed: w.name === dog.name ? 'Your Dog' : aiCompetitors.find(ai => ai.name === w.name)?.breed || 'Mixed',
      isPlayer: w.name === dog.name,
    }));

    setResults(formattedResults);

    // Award prize money
    const placement = playerResult.placement;
    let prizeMoney = 0;

    if (placement === 1) prizeMoney = event.prizes.first;
    else if (placement === 2) prizeMoney = event.prizes.second;
    else if (placement === 3) prizeMoney = event.prizes.third;
    else prizeMoney = event.prizes.participation;

    if (prizeMoney > 0) {
      updateUserCash(prizeMoney);
      showToast.success(`Won $${prizeMoney}!`);
    }

    // Award championship points if applicable
    const pointsResult = awardChampionshipPoints(
      dog.id,
      event.id,
      placement,
      playerScore
    );

    if (pointsResult.success && pointsResult.titleEarned) {
      showToast.success(`🏆 ${pointsResult.message}`, 5000);
    }

    // Submit to leaderboards
    if (user) {
      try {
        await submitCompetitionScore(
          user.id,
          dog.id,
          event.discipline as any, // CompetitionDiscipline includes more types than CompetitionType
          event.eventType as any, // EventType includes 'championship' which is not in CompetitionTier
          playerScore,
          placement,
          playerScore,
          event.id
        );
      } catch (error) {
        console.error('Failed to submit score to leaderboard:', error);
      }
    }
  };

  const renderMinigame = () => {
    switch (event.discipline) {
      case 'agility':
        return <AgilityGameV2 dog={dog} onComplete={handleMiniGameComplete} />;
      case 'obedience':
        return <ObedienceGameV2 dog={dog} onComplete={handleMiniGameComplete} />;
      case 'weight_pull':
        return <WeightPullGameV2 dog={dog} onComplete={handleMiniGameComplete} />;
      case 'racing':
        return <RacingGameV2 dog={dog} onComplete={handleMiniGameComplete} />;
      case 'conformation':
        return <ConformationGameV2 dog={dog} onComplete={handleMiniGameComplete} />;
      default:
        return (
          <div className="bg-white rounded-lg p-8 text-center">
            <p className="text-red-600 font-bold">This discipline is not yet available!</p>
            <button
              onClick={onComplete}
              className="mt-4 px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
            >
              Back
            </button>
          </div>
        );
    }
  };

  if (gameState === 'playing') {
    return <div>{renderMinigame()}</div>;
  }

  if (gameState === 'results' && results) {
    const playerResult = results.find(r => r.isPlayer);
    const scoreRange = getScoreRange(event.eventType);

    return (
      <div className="bg-gradient-to-b from-purple-50 to-blue-50 rounded-lg p-8 min-h-[600px]">
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">
            {playerResult?.placement === 1 ? '🏆' : playerResult?.placement === 2 ? '🥈' : playerResult?.placement === 3 ? '🥉' : '🎯'}
          </div>
          <h2 className="text-3xl font-bold text-earth-900 mb-2">
            {playerResult?.placement === 1 ? 'CHAMPION!' : playerResult?.placement && playerResult.placement <= 3 ? 'PODIUM FINISH!' : 'Competition Complete'}
          </h2>
          <p className="text-earth-600">
            {dog.name} placed <strong className="text-kennel-700">#{playerResult?.placement}</strong> out of {results.length} competitors
          </p>
        </div>

        {/* Results Table */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden mb-6">
          <div className="bg-kennel-600 text-white px-6 py-3 font-bold">
            Final Standings
          </div>
          <div className="divide-y divide-gray-200">
            {results.map((result) => (
              <div
                key={result.name}
                className={`px-6 py-4 flex items-center justify-between ${
                  result.isPlayer ? 'bg-yellow-50 font-bold' : ''
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className={`text-2xl font-bold ${
                    result.placement === 1 ? 'text-yellow-500' :
                    result.placement === 2 ? 'text-gray-400' :
                    result.placement === 3 ? 'text-amber-600' :
                    'text-gray-600'
                  }`}>
                    #{result.placement}
                  </div>
                  <div>
                    <div className="font-semibold text-earth-900">
                      {result.name} {result.isPlayer && '(You)'}
                    </div>
                    <div className="text-sm text-earth-600">{result.breed}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-kennel-700">{result.score}</div>
                  <div className="text-xs text-gray-500">
                    {Math.round((result.score / scoreRange.max) * 100)}% of max
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Player Stats */}
        {playerResult && (
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-white rounded-lg p-4 text-center">
              <p className="text-sm text-gray-600">Placement</p>
              <p className="text-3xl font-bold text-kennel-700">#{playerResult.placement}</p>
            </div>
            <div className="bg-white rounded-lg p-4 text-center">
              <p className="text-sm text-gray-600">Score</p>
              <p className="text-3xl font-bold text-blue-700">{playerResult.score}</p>
            </div>
            <div className="bg-white rounded-lg p-4 text-center">
              <p className="text-sm text-gray-600">Prize</p>
              <p className="text-3xl font-bold text-green-700">
                ${playerResult.placement === 1 ? event.prizes.first :
                  playerResult.placement === 2 ? event.prizes.second :
                  playerResult.placement === 3 ? event.prizes.third :
                  event.prizes.participation}
              </p>
            </div>
          </div>
        )}

        <button
          onClick={onComplete}
          className="w-full py-4 bg-kennel-600 text-white rounded-lg hover:bg-kennel-700 transition-colors font-bold text-lg"
        >
          Return to Event Board
        </button>
      </div>
    );
  }

  // Ready state - show event info and start button
  return (
    <div className="bg-gradient-to-b from-blue-50 to-purple-50 rounded-lg p-8 min-h-[600px]">
      <div className="text-center mb-8">
        <div className="text-6xl mb-4">🏁</div>
        <h2 className="text-3xl font-bold text-earth-900 mb-2">{event.name}</h2>
        <p className="text-earth-600 text-lg">
          {event.discipline.charAt(0).toUpperCase() + event.discipline.slice(1)} Competition
        </p>
      </div>

      <div className="bg-white rounded-lg p-6 mb-6 max-w-2xl mx-auto">
        <h3 className="font-bold text-earth-900 mb-4">Competition Details</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-600">Event Type</p>
            <p className="font-semibold">{event.eventType.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}</p>
          </div>
          <div>
            <p className="text-gray-600">Competitors</p>
            <p className="font-semibold">{event.maxEntries} entries</p>
          </div>
          <div>
            <p className="text-gray-600">Prize Pool</p>
            <p className="font-semibold">${event.prizes.first + event.prizes.second + event.prizes.third + event.prizes.participation}</p>
          </div>
          <div>
            <p className="text-gray-600">Championship Points</p>
            <p className="font-semibold">
              1st: {event.pointsAwarded.first} pts {event.isMajor && '⭐ (Major)'}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-blue-50 rounded-lg p-4 mb-6 max-w-2xl mx-auto">
        <p className="text-sm text-blue-900">
          <strong>Competing:</strong> {dog.name}
        </p>
        <p className="text-sm text-blue-800 mt-2">
          Your performance in the minigame will determine your final score. Good luck!
        </p>
      </div>

      <div className="flex gap-4 justify-center max-w-md mx-auto">
        <button
          onClick={onComplete}
          className="px-8 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors font-bold text-lg"
        >
          Cancel
        </button>
        <button
          onClick={() => setGameState('playing')}
          className="px-8 py-3 bg-kennel-600 text-white rounded-lg hover:bg-kennel-700 transition-colors font-bold text-lg"
        >
          Start Competition!
        </button>
      </div>
    </div>
  );
}
