import { useState } from 'react';
import { useGameStore } from '../../stores/gameStore';
import { competitionTypes, competitionTiers, type CompetitionType, type CompetitionTier } from '../../data/competitionTypes';
import { rescueBreeds } from '../../data/rescueBreeds';
import { calculateCompetitionScore, generateAICompetitors, determineWinner } from '../../utils/competitionCalculations';
import AgilityMiniGame from './AgilityMiniGame';

interface CompetitionResult {
  name: string;
  score: number;
  placement: number;
}

interface Results {
  competition: string;
  tier: string;
  finalResults: CompetitionResult[];
  playerResult: CompetitionResult;
  prizeMoney: number;
}

export default function CompetitionView() {
  const { dogs, selectedDog, selectDog, user, updateUserCash, updateCompetitionWins } = useGameStore();
  const [selectedCompType, setSelectedCompType] = useState(competitionTypes[0].id);

  // Find first unlocked tier
  const getFirstUnlockedTier = () => {
    if ((user?.competition_wins_local || 0) >= 15) {
      if ((user?.competition_wins_regional || 0) >= 25) return 'national';
      return 'regional';
    }
    return 'local';
  };

  const [selectedTier, setSelectedTier] = useState(getFirstUnlockedTier());
  const [isCompeting, setIsCompeting] = useState(false);
  const [results, setResults] = useState<Results | null>(null);
  const [showMiniGame, setShowMiniGame] = useState(false);

  if (dogs.length === 0) {
    return (
      <div className="text-center py-20">
        <p className="text-white drop-shadow-lg text-xl">You need a dog to compete!</p>
      </div>
    );
  }

  const handleEnterCompetition = (manual: boolean) => {
    if (!selectedDog) {
      alert('Please select a dog first!');
      return;
    }

    const tier = competitionTiers.find(t => t.id === selectedTier);
    if (!tier) return;

    if ((user?.cash || 0) < tier.entryFee) {
      alert(`Not enough cash! Entry fee is $${tier.entryFee}.`);
      return;
    }

    const competition = competitionTypes.find(c => c.id === selectedCompType);
    if (!competition) return;

    // Deduct entry fee
    updateUserCash(-tier.entryFee);

    if (manual && selectedCompType === 'agility') {
      // Show mini-game for manual agility
      setShowMiniGame(true);
    } else {
      // Auto-compete or manual for other types (not implemented yet)
      runCompetition(manual ? (user?.competition_strategy || 1) : 0);
    }
  };

  const handleMiniGameComplete = (miniGameScore: number) => {
    setShowMiniGame(false);
    // Convert mini-game score (0-100) to skill bonus (0-50%)
    const skillBonus = miniGameScore / 2;
    runCompetition(skillBonus);
  };

  const runCompetition = (playerSkillBonus: number) => {
    const tier = competitionTiers.find(t => t.id === selectedTier);
    const competition = competitionTypes.find(c => c.id === selectedCompType);
    if (!tier || !competition || !selectedDog) return;

    setIsCompeting(true);

    setTimeout(() => {
      const playerScore = calculateCompetitionScore(
        selectedDog,
        competition,
        playerSkillBonus
      );

      const aiCompetitors = generateAICompetitors(
        7,
        tier.aiDifficulty.min,
        tier.aiDifficulty.max
      );

      const allScores = [
        { name: selectedDog.name, score: playerScore },
        ...aiCompetitors,
      ];

      const finalResults = determineWinner(allScores);
      const playerResult = finalResults.find(r => r.name === selectedDog.name);

      let prizeMoney = 0;
      if (playerResult?.placement === 1) prizeMoney = tier.prizes.first;
      else if (playerResult?.placement === 2) prizeMoney = tier.prizes.second;
      else if (playerResult?.placement === 3) prizeMoney = tier.prizes.third;
      else prizeMoney = tier.prizes.participation;

      updateUserCash(prizeMoney);

      // Track competition wins
      if (playerResult?.placement === 1) {
        if (tier.id === 'local') updateCompetitionWins('local');
        else if (tier.id === 'regional') updateCompetitionWins('regional');
        else if (tier.id === 'national') updateCompetitionWins('national');
      }

      setResults({
        competition: competition.name,
        tier: tier.name,
        finalResults,
        playerResult: playerResult!,
        prizeMoney,
      });

      setIsCompeting(false);
    }, 3000);
  };

  // Check if a tier is unlocked
  const isTierUnlocked = (tier: typeof competitionTiers[0]) => {
    if (tier.id === 'local') return true; // Always unlocked
    if (tier.id === 'regional') return (user?.competition_wins_local || 0) >= tier.minRequirement;
    if (tier.id === 'national') return (user?.competition_wins_regional || 0) >= tier.minRequirement;
    return false;
  };

  // Check if dog meets stat requirements for competition
  const meetsStatRequirement = (dog: any, competition: CompetitionType, tier: CompetitionTier): { meets: boolean; total: number } => {
    let totalRelevantStats = 0;

    Object.keys(competition.statWeights).forEach((stat) => {
      let value = 0;

      switch(stat) {
        case 'speed':
          value = dog.speed + (dog.speed_trained || 0);
          break;
        case 'agility':
          value = dog.agility + (dog.agility_trained || 0);
          break;
        case 'strength':
          value = dog.strength + (dog.strength_trained || 0);
          break;
        case 'endurance':
          value = dog.endurance + (dog.endurance_trained || 0);
          break;
        case 'obedience':
          value = dog.obedience_trained || 0;
          break;
        case 'intelligence':
          value = dog.intelligence;
          break;
        case 'trainability':
          value = dog.trainability;
          break;
      }

      totalRelevantStats += value;
    });

    return {
      meets: totalRelevantStats >= tier.minRequirement,
      total: Math.round(totalRelevantStats)
    };
  };

  const breedData = selectedDog ? rescueBreeds.find(b => b.id === selectedDog.breed_id) : null;
  const currentCompetition = competitionTypes.find(c => c.id === selectedCompType);
  const currentTier = competitionTiers.find(t => t.id === selectedTier);

  return (
    <div className="max-w-6xl mx-auto">
      {/* Dog Selection */}
      <div className="bg-white/90 backdrop-blur-sm rounded-lg shadow-lg p-6 mb-6">
        <h2 className="text-2xl font-bold text-earth-900 mb-4">Select Your Competitor</h2>
        <div className="flex gap-4 overflow-x-auto">
          {dogs.map((dog) => (
            <button
              key={dog.id}
              onClick={() => selectDog(dog)}
              className={`flex-shrink-0 p-4 rounded-lg border-2 transition-all ${
                selectedDog?.id === dog.id
                  ? 'border-kennel-500 bg-kennel-50'
                  : 'border-earth-300 bg-white hover:border-kennel-400'
              }`}
            >
              <p className="font-bold text-earth-900">{dog.name}</p>
              <p className="text-sm text-earth-600">{rescueBreeds.find(b => b.id === dog.breed_id)?.name}</p>
            </button>
          ))}
        </div>
      </div>

      {selectedDog && (
        <>
          {/* Competition Type Selection */}
          <div className="bg-white/90 backdrop-blur-sm rounded-lg shadow-lg p-6 mb-6">
            <h3 className="text-xl font-bold text-earth-900 mb-4">Competition Type</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {competitionTypes.map((comp) => (
                <button
                  key={comp.id}
                  onClick={() => setSelectedCompType(comp.id)}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    selectedCompType === comp.id
                      ? 'border-kennel-500 bg-kennel-50'
                      : 'border-earth-300 bg-white hover:border-kennel-400'
                  }`}
                >
                  <div className="text-4xl mb-2">{comp.icon}</div>
                  <p className="font-bold text-earth-900">{comp.name}</p>
                  <p className="text-xs text-earth-600 mt-1">{comp.description}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Tier Selection */}
          <div className="bg-white/90 backdrop-blur-sm rounded-lg shadow-lg p-6 mb-6">
            <h3 className="text-xl font-bold text-earth-900 mb-4">Competition Tier</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {competitionTiers.map((tier) => {
                const isUnlocked = isTierUnlocked(tier);
                const isSelected = selectedTier === tier.id;

                return (
                  <button
                    key={tier.id}
                    onClick={() => isUnlocked && setSelectedTier(tier.id)}
                    disabled={!isUnlocked}
                    className={`p-4 rounded-lg border-2 transition-all text-left relative ${
                      isSelected
                        ? 'border-kennel-500 bg-kennel-50'
                        : isUnlocked
                        ? 'border-earth-300 bg-white hover:border-kennel-400'
                        : 'border-gray-300 bg-gray-100 opacity-60 cursor-not-allowed'
                    }`}
                  >
                    {!isUnlocked && (
                      <div className="absolute top-2 right-2 text-2xl">🔒</div>
                    )}
                    <p className="font-bold text-earth-900 text-lg">{tier.name}</p>
                    {isUnlocked ? (
                      <>
                        <p className="text-sm text-earth-600 mb-2">Entry: ${tier.entryFee}</p>
                        <div className="text-xs text-earth-700 space-y-1">
                          <p>🥇 1st: ${tier.prizes.first}</p>
                          <p>🥈 2nd: ${tier.prizes.second}</p>
                          <p>🥉 3rd: ${tier.prizes.third}</p>
                        </div>
                      </>
                    ) : (
                      <div className="text-sm text-gray-600 mt-2">
                        {tier.id === 'regional' && (
                          <p>Requires {tier.minRequirement} local wins<br/>
                          ({user?.competition_wins_local || 0}/{tier.minRequirement})</p>
                        )}
                        {tier.id === 'national' && (
                          <p>Requires {tier.minRequirement} regional wins<br/>
                          ({user?.competition_wins_regional || 0}/{tier.minRequirement})</p>
                        )}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Dog Stats Preview */}
          <div className="bg-white/90 backdrop-blur-sm rounded-lg shadow-lg p-6 mb-6">
            <div className="flex items-center gap-6 mb-4">
              <div className="w-24 h-24">
                <img 
                  src={breedData?.img_sitting || ''} 
                  alt={selectedDog.name}
                  className="w-full h-full object-contain"
                />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-earth-900">{selectedDog.name}</h3>
                <p className="text-earth-600">{breedData?.name}</p>
              </div>
            </div>

            <h4 className="font-bold text-earth-900 mb-2">Key Stats for {currentCompetition?.name}:</h4>
            <div className="grid grid-cols-3 gap-4">
              {currentCompetition?.secondaryStats.concat(currentCompetition.primaryStat).map((stat) => {
                let value = 0;
                let trained = 0;

                switch(stat) {
                  case 'speed':
                    value = selectedDog.speed;
                    trained = selectedDog.speed_trained || 0;
                    break;
                  case 'agility':
                    value = selectedDog.agility;
                    trained = selectedDog.agility_trained || 0;
                    break;
                  case 'strength':
                    value = selectedDog.strength;
                    trained = selectedDog.strength_trained || 0;
                    break;
                  case 'endurance':
                    value = selectedDog.endurance;
                    trained = selectedDog.endurance_trained || 0;
                    break;
                  case 'obedience':
                    value = 0;
                    trained = selectedDog.obedience_trained || 0;
                    break;
                  case 'intelligence':
                    value = selectedDog.intelligence;
                    break;
                  case 'trainability':
                    value = selectedDog.trainability;
                    break;
                }

                const total = value + trained;
                const isPrimary = stat === currentCompetition?.primaryStat;

                return (
                  <div key={stat} className={`text-center p-3 rounded ${isPrimary ? 'bg-kennel-100' : 'bg-earth-50'}`}>
                    <p className={`text-sm capitalize ${isPrimary ? 'font-bold text-kennel-800' : 'text-earth-600'}`}>
                      {stat} {isPrimary && '⭐'}
                    </p>
                    <p className="text-2xl font-bold text-earth-900">{total.toFixed(1)}</p>
                    {trained > 0 && <p className="text-xs text-green-600">+{trained.toFixed(1)}</p>}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Enter Competition Buttons */}
          <div className="bg-white/90 backdrop-blur-sm rounded-lg shadow-lg p-6">
            {(() => {
              const statsCheck = currentCompetition && currentTier && selectedDog
                ? meetsStatRequirement(selectedDog, currentCompetition, currentTier)
                : { meets: true, total: 0 };

              return (
                <>
                  <h3 className="text-xl font-bold text-earth-900 mb-4">Enter Competition</h3>
                  <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => handleEnterCompetition(false)}
                disabled={isCompeting || (user?.cash || 0) < (currentTier?.entryFee || 0) || !statsCheck.meets}
                className="p-6 bg-earth-600 text-white rounded-lg hover:bg-earth-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                <p className="text-2xl mb-2">🤖</p>
                <p className="font-bold text-lg">Auto-Compete</p>
                <p className="text-sm opacity-90">Let {selectedDog.name} compete on their own</p>
                <p className="text-sm mt-2">Entry: ${currentTier?.entryFee}</p>
                {!statsCheck.meets && (
                  <p className="text-xs text-red-300 mt-1">
                    ⚠️ Need {currentTier?.minRequirement} total stats (have {statsCheck.total})
                  </p>
                )}
              </button>

              <button
                onClick={() => handleEnterCompetition(true)}
                disabled={isCompeting || (user?.cash || 0) < (currentTier?.entryFee || 0) || !statsCheck.meets}
                className="p-6 bg-kennel-600 text-white rounded-lg hover:bg-kennel-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                <p className="text-2xl mb-2">🎮</p>
                <p className="font-bold text-lg">Manual Play</p>
                <p className="text-sm opacity-90">Control {selectedDog.name} for bonus score</p>
                <p className="text-sm mt-2">Entry: ${currentTier?.entryFee} • +{user?.competition_strategy || 1}% skill bonus</p>
                {!statsCheck.meets && (
                  <p className="text-xs text-red-300 mt-1">
                    ⚠️ Need {currentTier?.minRequirement} total stats (have {statsCheck.total})
                  </p>
                )}
              </button>
            </div>
                </>
              );
            })()}
          </div>
        </>
      )}

      {/* Mini-Game Modal */}
        {showMiniGame && selectedDog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <AgilityMiniGame
                dogName={selectedDog.name}
                onComplete={handleMiniGameComplete}
            />
            </div>
        </div>
        )}

      {/* Competition in Progress Modal */}
      {isCompeting && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 text-center max-w-md">
            <p className="text-2xl font-bold text-earth-900 mb-4">Competition in Progress!</p>
            <p className="text-earth-600 mb-4">{selectedDog?.name} is competing...</p>
            <div className="text-6xl animate-bounce">{currentCompetition?.icon}</div>
          </div>
        </div>
      )}

      {/* Results Modal */}
      {results && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-3xl font-bold text-earth-900 mb-2 text-center">
              {results.competition} Results
            </h2>
            <p className="text-earth-600 text-center mb-6">{results.tier}</p>

            <div className="bg-kennel-50 rounded-lg p-6 mb-6 text-center">
              <p className="text-earth-700 mb-2">Your Result</p>
              <p className="text-5xl font-bold text-kennel-700 mb-2">
                {results.playerResult.placement === 1 && '🥇'}
                {results.playerResult.placement === 2 && '🥈'}
                {results.playerResult.placement === 3 && '🥉'}
                #{results.playerResult.placement}
              </p>
              <p className="text-2xl font-bold text-earth-900 mb-2">{selectedDog?.name}</p>
              <p className="text-earth-600 mb-4">Score: {results.playerResult.score}</p>
              <p className="text-3xl font-bold text-green-600">+${results.prizeMoney}</p>
            </div>

            <h3 className="font-bold text-earth-900 mb-3">Final Standings:</h3>
            <div className="space-y-2 mb-6">
              {results.finalResults.map((result, index) => (
                <div
                  key={index}
                  className={`flex items-center justify-between p-3 rounded ${
                    result.name === selectedDog?.name ? 'bg-kennel-100 font-bold' : 'bg-earth-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">
                      {result.placement === 1 && '🥇'}
                      {result.placement === 2 && '🥈'}
                      {result.placement === 3 && '🥉'}
                      {result.placement > 3 && `#${result.placement}`}
                    </span>
                    <span className="text-earth-900">{result.name}</span>
                  </div>
                  <span className="text-earth-700">{result.score}</span>
                </div>
              ))}
            </div>

            <button
              onClick={() => setResults(null)}
              className="w-full py-3 bg-kennel-600 text-white rounded-lg hover:bg-kennel-700 transition-all font-semibold"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
