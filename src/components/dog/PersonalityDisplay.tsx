import { DogPersonality } from '../../types/personality';
import { PERSONALITY_TRAITS } from '../../data/personalityTraits';

interface PersonalityDisplayProps {
  personality: DogPersonality;
  compact?: boolean;
}

export default function PersonalityDisplay({ personality, compact = false }: PersonalityDisplayProps) {
  const primaryTrait = PERSONALITY_TRAITS[personality.primaryTrait];
  const secondaryTrait = personality.secondaryTrait
    ? PERSONALITY_TRAITS[personality.secondaryTrait]
    : null;

  if (compact) {
    return (
      <div className="flex items-center gap-2 text-sm">
        <span className="text-lg">{primaryTrait.icon}</span>
        <span className="font-semibold text-earth-900">{primaryTrait.name}</span>
        {secondaryTrait && (
          <>
            <span className="text-earth-400">+</span>
            <span className="text-lg">{secondaryTrait.icon}</span>
            <span className="text-earth-700">{secondaryTrait.name}</span>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Primary Trait */}
      <div className="bg-gradient-to-r from-kennel-50 to-transparent p-3 rounded-lg border-l-4 border-kennel-500">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-2xl">{primaryTrait.icon}</span>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-earth-900">{primaryTrait.name}</span>
              <span className="text-xs px-2 py-0.5 bg-kennel-200 text-kennel-800 rounded-full uppercase">
                Primary
              </span>
            </div>
            <p className="text-sm text-earth-600">{primaryTrait.description}</p>
          </div>
        </div>
      </div>

      {/* Secondary Trait */}
      {secondaryTrait && (
        <div className="bg-gradient-to-r from-earth-50 to-transparent p-3 rounded-lg border-l-4 border-earth-300">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-2xl">{secondaryTrait.icon}</span>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-earth-900">{secondaryTrait.name}</span>
                <span className="text-xs px-2 py-0.5 bg-earth-200 text-earth-700 rounded-full uppercase">
                  Secondary
                </span>
              </div>
              <p className="text-sm text-earth-600">{secondaryTrait.description}</p>
            </div>
          </div>
        </div>
      )}

      {/* Quirks */}
      {personality.quirks.length > 0 && (
        <div className="bg-white p-3 rounded-lg border border-earth-200">
          <h4 className="text-xs font-semibold text-earth-500 uppercase mb-2">Quirks</h4>
          <div className="flex flex-wrap gap-2">
            {personality.quirks.map((quirk, index) => (
              <span
                key={index}
                className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded-full"
              >
                {quirk}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
