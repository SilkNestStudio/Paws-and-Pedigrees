import { useEffect, useState } from 'react';
import { useGameStore } from '../../stores/gameStore';
import type { ChampionshipProgress, CompetitionDiscipline } from '../../types/competition';
import {
  calculateChampionshipProgress,
  getTitleProgressPercentage,
  getTopDiscipline,
  TITLE_REQUIREMENTS,
} from '../../utils/championshipCalculations';

// Helper to get discipline display name and icon
const getDisciplineInfo = (discipline: CompetitionDiscipline): { name: string; icon: string } => {
  const map: Record<CompetitionDiscipline, { name: string; icon: string }> = {
    conformation: { name: 'Conformation', icon: '🏆' },
    agility: { name: 'Agility', icon: '🏃' },
    obedience: { name: 'Obedience', icon: '🎓' },
    rally: { name: 'Rally', icon: '🎯' },
    racing: { name: 'Racing', icon: '⚡' },
    weight_pull: { name: 'Weight Pull', icon: '💪' },
    tracking: { name: 'Tracking', icon: '🔍' },
    herding: { name: 'Herding', icon: '🐑' },
  };
  return map[discipline];
};

export default function ChampionshipProgressPanel() {
  const { selectedDog } = useGameStore();
  const [progress, setProgress] = useState<ChampionshipProgress | null>(null);

  // Calculate progress whenever selected dog changes
  useEffect(() => {
    if (selectedDog) {
      const dogProgress = calculateChampionshipProgress(selectedDog);
      setProgress(dogProgress);
    } else {
      setProgress(null);
    }
  }, [selectedDog]);

  if (!selectedDog) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6 text-center">
        <div className="text-6xl mb-4">🏆</div>
        <h3 className="text-xl font-bold text-earth-900 mb-2">Championship Progress</h3>
        <p className="text-earth-600">Select a dog to view championship progress</p>
      </div>
    );
  }

  if (!progress) {
    return null;
  }

  const currentTitleInfo = TITLE_REQUIREMENTS[progress.currentTitle];
  const nextTitleInfo = TITLE_REQUIREMENTS[progress.nextTitle];
  const progressPercent = getTitleProgressPercentage(progress);
  const topDiscipline = getTopDiscipline(progress.disciplinePoints);
  const isMaxTitle = progress.currentTitle === progress.nextTitle;

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
      {/* Header with current title */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-6 text-white">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-sm opacity-90 mb-1">Championship Title</p>
            <h3 className="text-3xl font-bold flex items-center gap-2">
              <span className="text-4xl">{currentTitleInfo.icon}</span>
              <span>{currentTitleInfo.displayName}</span>
            </h3>
            <p className="text-sm opacity-75 mt-2">{currentTitleInfo.description}</p>
          </div>
          <div className="text-right">
            <p className="text-sm opacity-90">Total Points</p>
            <p className="text-4xl font-bold">{progress.totalPoints}</p>
          </div>
        </div>
      </div>

      {/* Progress toward next title */}
      {!isMaxTitle && (
        <div className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-indigo-200">
          <div className="mb-3">
            <div className="flex justify-between items-center mb-2">
              <p className="text-sm font-semibold text-indigo-900">
                Progress to {nextTitleInfo.icon} {nextTitleInfo.displayName}
              </p>
              <p className="text-sm font-bold text-indigo-700">{Math.round(progressPercent)}%</p>
            </div>
            <div className="w-full bg-indigo-200 rounded-full h-4 overflow-hidden">
              <div
                className="bg-gradient-to-r from-indigo-500 to-purple-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Requirements */}
          <div className="grid grid-cols-3 gap-3 mt-4">
            <div className="bg-white rounded-lg p-3 border border-indigo-200">
              <p className="text-xs text-indigo-600 mb-1">Points Needed</p>
              <p className="text-2xl font-bold text-indigo-900">
                {progress.pointsToNext}
                <span className="text-sm text-indigo-600 ml-1">/ {nextTitleInfo.totalPoints - currentTitleInfo.totalPoints}</span>
              </p>
            </div>
            <div className="bg-white rounded-lg p-3 border border-indigo-200">
              <p className="text-xs text-indigo-600 mb-1">Majors Needed</p>
              <p className="text-2xl font-bold text-indigo-900">
                {progress.majorsNeeded}
                <span className="text-sm text-indigo-600 ml-1">/ {nextTitleInfo.majorWinsRequired - currentTitleInfo.majorWinsRequired}</span>
              </p>
            </div>
            <div className="bg-white rounded-lg p-3 border border-indigo-200">
              <p className="text-xs text-indigo-600 mb-1">Judges Needed</p>
              <p className="text-2xl font-bold text-indigo-900">
                {progress.judgesNeeded}
                <span className="text-sm text-indigo-600 ml-1">/ {nextTitleInfo.judgesRequired - currentTitleInfo.judgesRequired}</span>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Max title achieved */}
      {isMaxTitle && progress.currentTitle !== 'none' && (
        <div className="p-6 bg-gradient-to-r from-yellow-50 to-amber-50 border-b border-amber-200">
          <div className="text-center">
            <p className="text-2xl font-bold text-amber-900 mb-2">🎉 Maximum Title Achieved! 🎉</p>
            <p className="text-sm text-amber-700">
              {selectedDog.name} has reached the highest championship title!
            </p>
          </div>
        </div>
      )}

      {/* Statistics */}
      <div className="p-6 border-b border-earth-200">
        <h4 className="text-lg font-bold text-earth-900 mb-4">Championship Statistics</h4>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-600 mb-1">Major Wins</p>
            <p className="text-2xl font-bold text-amber-600">⭐ {progress.majorWins}</p>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-600 mb-1">Unique Judges</p>
            <p className="text-2xl font-bold text-purple-600">👨‍⚖️ {progress.judgesWonUnder.length}</p>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-600 mb-1">Specialty Wins</p>
            <p className="text-2xl font-bold text-pink-600">🎖️ {progress.specialtyWins}</p>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-600 mb-1">Group Wins</p>
            <p className="text-2xl font-bold text-indigo-600">👑 {progress.groupWins}</p>
          </div>
        </div>

        {progress.allBreedWins > 0 && (
          <div className="mt-4 p-3 bg-gradient-to-r from-amber-50 to-yellow-50 border-2 border-amber-300 rounded-lg">
            <p className="text-center text-sm font-bold text-amber-900">
              🏆 All-Breed Championships: {progress.allBreedWins}
            </p>
          </div>
        )}

        {progress.bestInShowWins > 0 && (
          <div className="mt-4 p-3 bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-300 rounded-lg">
            <p className="text-center text-sm font-bold text-purple-900">
              💎 Best in Show Awards: {progress.bestInShowWins}
            </p>
          </div>
        )}
      </div>

      {/* Discipline breakdown */}
      <div className="p-6">
        <h4 className="text-lg font-bold text-earth-900 mb-4">Points by Discipline</h4>

        {topDiscipline && (
          <div className="mb-4 p-3 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-300 rounded-lg">
            <p className="text-sm text-green-900">
              <strong>Top Discipline:</strong> {getDisciplineInfo(topDiscipline.discipline).icon}{' '}
              {getDisciplineInfo(topDiscipline.discipline).name} ({topDiscipline.points} points)
            </p>
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {(Object.entries(progress.disciplinePoints) as [CompetitionDiscipline, number][])
            .sort((a, b) => b[1] - a[1])
            .map(([discipline, points]) => {
              const info = getDisciplineInfo(discipline);
              return (
                <div key={discipline} className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-600 mb-1 flex items-center gap-1">
                    <span>{info.icon}</span>
                    <span>{info.name}</span>
                  </p>
                  <p className="text-xl font-bold text-kennel-700">{points} pts</p>
                  {points > 0 && (
                    <div className="w-full bg-gray-200 rounded-full h-1 mt-2">
                      <div
                        className="bg-kennel-500 h-full rounded-full"
                        style={{ width: `${Math.min(100, (points / progress.totalPoints) * 100)}%` }}
                      />
                    </div>
                  )}
                </div>
              );
            })}
        </div>
      </div>

      {/* Info footer */}
      <div className="p-4 bg-blue-50 border-t border-blue-200">
        <p className="text-xs text-blue-900">
          <strong>💡 How to Earn Titles:</strong> Compete in shows to earn championship points. Win major shows (⭐ 3+ points) and place under different judges to advance through titles.
        </p>
      </div>
    </div>
  );
}
