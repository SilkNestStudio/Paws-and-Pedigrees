import { useState, useEffect } from 'react';
import { storyChapters, isChapterUnlocked, getNextChapter } from '../../data/storyChapters';
import { StoryChapter } from '../../types/story';
import { useGameStore } from '../../stores/gameStore';
import { isObjectiveCompleted, checkAndCompleteChapter } from '../../utils/storyObjectiveTracking';

export default function StoryModeView() {
  const { user, dogs, storyProgress } = useGameStore();
  const [selectedChapter, setSelectedChapter] = useState<StoryChapter | null>(null);
  const [recentlyCompletedChapter, setRecentlyCompletedChapter] = useState<string | null>(null);

  const completedChapters = storyProgress.completedChapters;
  const chapterProgress = storyProgress.objectiveProgress;

  // Check for chapter completion whenever progress updates
  useEffect(() => {
    storyChapters.forEach(chapter => {
      if (!completedChapters.includes(chapter.id)) {
        const wasCompleted = checkAndCompleteChapter(chapter.id);
        if (wasCompleted) {
          setRecentlyCompletedChapter(chapter.id);
          // Clear notification after 10 seconds
          setTimeout(() => setRecentlyCompletedChapter(null), 10000);
        }
      }
    });
  }, [chapterProgress, completedChapters]);

  if (!user) return null;

  const dogCount = dogs.length;

  const handleChapterSelect = (chapter: StoryChapter) => {
    const unlocked = isChapterUnlocked(chapter, completedChapters, user.level, dogCount);
    if (unlocked || completedChapters.includes(chapter.id)) {
      setSelectedChapter(chapter);
    }
  };

  const isChapterCompleted = (chapterId: string) => {
    return completedChapters.includes(chapterId);
  };

  const getChapterStatus = (chapter: StoryChapter) => {
    if (isChapterCompleted(chapter.id)) {
      return 'completed';
    }
    if (isChapterUnlocked(chapter, completedChapters, user.level, dogCount)) {
      return 'available';
    }
    return 'locked';
  };

  const recentlyCompletedChapterData = recentlyCompletedChapter
    ? storyChapters.find(c => c.id === recentlyCompletedChapter)
    : null;

  return (
    <div className="max-w-7xl mx-auto">
      {/* Chapter Completion Notification */}
      {recentlyCompletedChapterData && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 animate-bounce">
          <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-8 py-6 rounded-lg shadow-2xl border-4 border-yellow-400">
            <div className="text-center">
              <div className="text-5xl mb-2">🎉</div>
              <p className="font-bold text-2xl mb-1">Chapter Completed!</p>
              <p className="text-lg mb-3">{recentlyCompletedChapterData.title}</p>
              <div className="bg-white/20 rounded-lg p-3 backdrop-blur-sm">
                <p className="font-semibold mb-2">🎁 Rewards Received:</p>
                <div className="flex gap-3 justify-center flex-wrap">
                  {recentlyCompletedChapterData.rewards.cash && (
                    <div className="bg-green-700 px-3 py-1 rounded-full text-sm font-bold">
                      💰 ${recentlyCompletedChapterData.rewards.cash}
                    </div>
                  )}
                  {recentlyCompletedChapterData.rewards.gems && (
                    <div className="bg-purple-700 px-3 py-1 rounded-full text-sm font-bold">
                      💎 {recentlyCompletedChapterData.rewards.gems}
                    </div>
                  )}
                  {recentlyCompletedChapterData.rewards.xp && (
                    <div className="bg-blue-700 px-3 py-1 rounded-full text-sm font-bold">
                      ⭐ {recentlyCompletedChapterData.rewards.xp} XP
                    </div>
                  )}
                  {recentlyCompletedChapterData.rewards.items && recentlyCompletedChapterData.rewards.items.length > 0 && (
                    <div className="bg-orange-700 px-3 py-1 rounded-full text-sm font-bold">
                      🎁 {recentlyCompletedChapterData.rewards.items.length} Items
                    </div>
                  )}
                </div>
                {recentlyCompletedChapterData.rewards.unlock_feature && (
                  <div className="mt-2 bg-yellow-500 text-yellow-900 px-3 py-1 rounded-lg text-sm font-bold">
                    🔓 Unlocked: {recentlyCompletedChapterData.rewards.unlock_feature.replace(/_/g, ' ').toUpperCase()}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-white/90 backdrop-blur-sm rounded-lg shadow-lg p-6 mb-6">
        <h2 className="text-3xl font-bold text-earth-900 mb-2">📖 Story Mode: Path to Championship</h2>
        <p className="text-earth-600">
          Follow your mentor's journal and learn the secrets of creating a champion dog. Complete chapters to unlock
          rewards and new features!
        </p>
        <div className="mt-4 flex gap-4 text-sm">
          <div className="bg-green-100 px-3 py-1 rounded">
            <span className="font-semibold text-green-800">
              ✓ {completedChapters.length} / {storyChapters.length} Chapters Completed
            </span>
          </div>
          <div className="bg-blue-100 px-3 py-1 rounded">
            <span className="font-semibold text-blue-800">Kennel Level: {user.level}</span>
          </div>
        </div>
      </div>

      {/* Chapter Selection Grid */}
      {!selectedChapter && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {storyChapters.map((chapter) => {
            const status = getChapterStatus(chapter);
            const isLocked = status === 'locked';
            const isCompleted = status === 'completed';
            const isAvailable = status === 'available';

            return (
              <div
                key={chapter.id}
                onClick={() => !isLocked && handleChapterSelect(chapter)}
                className={`bg-white/95 backdrop-blur-sm rounded-lg shadow-lg overflow-hidden transition-all cursor-pointer ${
                  isLocked
                    ? 'opacity-50 cursor-not-allowed'
                    : 'hover:shadow-2xl hover:scale-105'
                } ${isCompleted ? 'border-4 border-green-500' : ''} ${
                  isAvailable ? 'border-4 border-blue-400 animate-pulse' : ''
                }`}
              >
                {/* Chapter Image */}
                {chapter.image_url && (
                  <div className="relative h-40 bg-gradient-to-br from-earth-200 to-earth-300 overflow-hidden">
                    <img
                      src={chapter.image_url}
                      alt={chapter.title}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        // Hide image if it fails to load
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                    {/* Gradient overlay for better text readability */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                    {/* Status badges on image */}
                    <div className="absolute top-2 right-2">
                      {isCompleted && <div className="text-3xl drop-shadow-lg">✓</div>}
                      {isLocked && <div className="text-3xl drop-shadow-lg">🔒</div>}
                      {isAvailable && <div className="text-3xl drop-shadow-lg animate-pulse">⭐</div>}
                    </div>
                  </div>
                )}

                <div className="p-6">
                  {/* Chapter Number & Icon */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="text-4xl">{chapter.icon}</div>
                    <div className="text-right">
                      <span className="text-xs text-earth-500">Chapter {chapter.chapter_number}</span>
                    </div>
                  </div>

                  {/* Title */}
                  <h3 className="text-xl font-bold text-earth-900 mb-1">{chapter.title}</h3>
                  <p className="text-sm text-earth-600 italic mb-4">{chapter.subtitle}</p>

                  {/* Objectives Preview */}
                  <div className="border-t border-earth-200 pt-3">
                    <p className="text-xs text-earth-500 mb-2">Objectives:</p>
                    <ul className="space-y-1">
                      {chapter.objectives.slice(0, 2).map((obj) => (
                        <li key={obj.id} className="text-xs text-earth-700 flex items-start gap-1">
                          <span>•</span>
                          <span>{obj.description}</span>
                        </li>
                      ))}
                      {chapter.objectives.length > 2 && (
                        <li className="text-xs text-earth-500 italic">
                          +{chapter.objectives.length - 2} more...
                        </li>
                      )}
                    </ul>
                  </div>

                  {/* Unlock Requirements */}
                  {isLocked && chapter.unlock_requirement && (
                    <div className="mt-4 bg-red-50 border border-red-200 rounded p-2">
                      <p className="text-xs text-red-800 font-semibold mb-1">Requirements:</p>
                      {chapter.unlock_requirement.previous_chapter && (
                        <p className="text-xs text-red-700">• Complete previous chapter</p>
                      )}
                      {chapter.unlock_requirement.min_level && (
                        <p className="text-xs text-red-700">• Level {chapter.unlock_requirement.min_level}+</p>
                      )}
                      {chapter.unlock_requirement.min_dogs && (
                        <p className="text-xs text-red-700">
                          • Own {chapter.unlock_requirement.min_dogs}+ dogs
                        </p>
                      )}
                    </div>
                  )}

                  {/* Status Badge */}
                  <div className="mt-4">
                    {isCompleted && (
                      <span className="inline-block px-3 py-1 bg-green-500 text-white text-xs font-bold rounded">
                        COMPLETED
                      </span>
                    )}
                    {isAvailable && (
                      <span className="inline-block px-3 py-1 bg-blue-500 text-white text-xs font-bold rounded animate-pulse">
                        AVAILABLE NOW
                      </span>
                    )}
                    {isLocked && (
                      <span className="inline-block px-3 py-1 bg-gray-400 text-white text-xs font-bold rounded">
                        LOCKED
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Chapter Detail View */}
      {selectedChapter && (
        <div className="bg-white/95 backdrop-blur-sm rounded-lg shadow-2xl overflow-hidden">
          {/* Hero Image */}
          {selectedChapter.image_url && (
            <div className="relative h-64 md:h-96 bg-gradient-to-br from-earth-200 to-earth-300 overflow-hidden">
              <img
                src={selectedChapter.image_url}
                alt={selectedChapter.title}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
              {/* Dark gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />

              {/* Chapter info overlay on image */}
              <div className="absolute bottom-0 left-0 right-0 p-8 text-white">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-sm font-semibold bg-white/20 backdrop-blur-sm px-3 py-1 rounded">
                    Chapter {selectedChapter.chapter_number}
                  </span>
                  {isChapterCompleted(selectedChapter.id) && (
                    <span className="px-3 py-1 bg-green-500 text-white text-xs font-bold rounded">✓ COMPLETED</span>
                  )}
                </div>
                <h2 className="text-4xl md:text-5xl font-bold mb-2 drop-shadow-lg">{selectedChapter.title}</h2>
                <p className="text-xl md:text-2xl italic drop-shadow-lg">{selectedChapter.subtitle}</p>
                <div className="text-6xl absolute top-8 right-8 drop-shadow-2xl">{selectedChapter.icon}</div>
              </div>
            </div>
          )}

          <div className="p-8">
            {/* Back Button */}
            <button
              onClick={() => setSelectedChapter(null)}
              className="mb-6 px-4 py-2 bg-earth-600 text-white rounded-lg hover:bg-earth-700 transition-all"
            >
              ← Back to Chapters
            </button>

            {/* Chapter Header (fallback if no image) */}
            {!selectedChapter.image_url && (
              <div className="flex items-start gap-6 mb-6">
                <div className="text-6xl">{selectedChapter.icon}</div>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-sm text-earth-500">Chapter {selectedChapter.chapter_number}</span>
                    {isChapterCompleted(selectedChapter.id) && (
                      <span className="px-3 py-1 bg-green-500 text-white text-xs font-bold rounded">✓ COMPLETED</span>
                    )}
                  </div>
                  <h2 className="text-3xl font-bold text-earth-900 mb-1">{selectedChapter.title}</h2>
                  <p className="text-lg text-earth-600 italic">{selectedChapter.subtitle}</p>
                </div>
              </div>
            )}

            {/* Story Text */}
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-300 rounded-lg p-6 mb-8">
              <h3 className="text-xl font-bold text-amber-900 mb-4 flex items-center gap-2">
                📜 Your Mentor's Journal
              </h3>
              <div className="space-y-4">
                {selectedChapter.story_text.map((paragraph, idx) => (
                  <p key={idx} className="text-earth-800 leading-relaxed italic">
                    "{paragraph}"
                  </p>
                ))}
              </div>
            </div>

            {/* Objectives */}
            <div className="mb-8">
              <h3 className="text-2xl font-bold text-earth-900 mb-4">Chapter Objectives</h3>
              <div className="space-y-3">
                {selectedChapter.objectives.map((objective) => {
                  const progress = chapterProgress[selectedChapter.id]?.[objective.id] || 0;
                  const completed = isObjectiveCompleted(selectedChapter.id, objective);
                  const progressPercent = (progress / objective.target_value) * 100;

                  return (
                    <div
                      key={objective.id}
                      className={`p-4 rounded-lg border-2 ${
                        completed ? 'bg-green-50 border-green-500' : 'bg-white border-earth-300'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            {completed && <span className="text-green-600 text-xl">✓</span>}
                            <h4 className="font-semibold text-earth-900">{objective.description}</h4>
                          </div>
                          {objective.hint && !completed && (
                            <p className="text-sm text-earth-600 italic">💡 {objective.hint}</p>
                          )}
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-mono text-earth-700">
                            {progress} / {objective.target_value}
                          </span>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      {!completed && (
                        <div className="w-full bg-earth-200 rounded-full h-2">
                          <div
                            className="bg-blue-500 h-2 rounded-full transition-all"
                            style={{ width: `${Math.min(progressPercent, 100)}%` }}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Rewards */}
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-300 rounded-lg p-6">
              <h3 className="text-xl font-bold text-purple-900 mb-4 flex items-center gap-2">
                🎁 Chapter Rewards
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {selectedChapter.rewards.cash && (
                  <div className="bg-white p-3 rounded-lg text-center">
                    <div className="text-2xl mb-1">💰</div>
                    <div className="font-bold text-green-600">${selectedChapter.rewards.cash}</div>
                    <div className="text-xs text-earth-600">Cash</div>
                  </div>
                )}
                {selectedChapter.rewards.gems && (
                  <div className="bg-white p-3 rounded-lg text-center">
                    <div className="text-2xl mb-1">💎</div>
                    <div className="font-bold text-purple-600">{selectedChapter.rewards.gems}</div>
                    <div className="text-xs text-earth-600">Gems</div>
                  </div>
                )}
                {selectedChapter.rewards.xp && (
                  <div className="bg-white p-3 rounded-lg text-center">
                    <div className="text-2xl mb-1">⭐</div>
                    <div className="font-bold text-blue-600">{selectedChapter.rewards.xp}</div>
                    <div className="text-xs text-earth-600">XP</div>
                  </div>
                )}
                {selectedChapter.rewards.items && selectedChapter.rewards.items.length > 0 && (
                  <div className="bg-white p-3 rounded-lg text-center">
                    <div className="text-2xl mb-1">🎁</div>
                    <div className="font-bold text-orange-600">{selectedChapter.rewards.items.length}</div>
                    <div className="text-xs text-earth-600">Items</div>
                  </div>
                )}
              </div>

              {selectedChapter.rewards.unlock_feature && (
                <div className="mt-4 bg-yellow-100 border-2 border-yellow-400 rounded-lg p-3 text-center">
                  <p className="font-bold text-yellow-900">
                    🔓 Unlocks: {selectedChapter.rewards.unlock_feature.replace(/_/g, ' ').toUpperCase()}
                  </p>
                </div>
              )}
            </div>

            {/* Action Button */}
            {!isChapterCompleted(selectedChapter.id) && (
              <div className="mt-8 text-center">
                <button className="px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-lg font-bold rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg">
                  Continue Your Journey
                </button>
                <p className="text-sm text-earth-600 mt-2">Complete objectives to finish this chapter</p>
              </div>
            )}

            {isChapterCompleted(selectedChapter.id) && (
              <div className="mt-8 bg-green-100 border-2 border-green-500 rounded-lg p-6 text-center">
                <h4 className="text-2xl font-bold text-green-900 mb-2">✓ Chapter Completed!</h4>
                <p className="text-green-800 mb-4">You've mastered this lesson and claimed your rewards.</p>
                {getNextChapter(selectedChapter.id) && (
                  <button
                    onClick={() => setSelectedChapter(getNextChapter(selectedChapter.id) || null)}
                    className="px-6 py-3 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 transition-all"
                  >
                    Next Chapter →
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
