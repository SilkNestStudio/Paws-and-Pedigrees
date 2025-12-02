import { useState } from 'react';
import { useGameStore } from '../../stores/gameStore';
import { getAilmentById, AILMENTS } from '../../utils/veterinarySystem';
import { VET_COST, EMERGENCY_VET_COST } from '../../utils/healthDecay';
import { getHealthStatus } from '../../utils/healthDecay';
import HelpButton from '../tutorial/HelpButton';
import { applyVetCostReduction } from '../../utils/kennelUpgrades';

export default function VetClinicView() {
  const { dogs, user, selectedDog, selectDog, treatDogAilment } = useGameStore();
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Helper to calculate discounted vet cost
  const getDiscountedCost = (baseCost: number): number => {
    return applyVetCostReduction(baseCost, user?.kennel_level || 1);
  };

  // Filter dogs that need vet care
  const sickOrInjuredDogs = dogs.filter((d: any) => d.current_ailment || d.recovering_from);
  const healthIssueDogs = dogs.filter((d: any) => {
    const healthStatus = getHealthStatus(d);
    return healthStatus.needsVet || healthStatus.needsEmergencyVet;
  });

  const handleSelectDog = (dog: typeof dogs[0]) => {
    selectDog(dog);
  };

  const handleTreatAilment = (dogId: string, cost: number) => {
    if (!user || user.cash < cost) {
      setMessage({ text: `Not enough cash! Need $${cost}, have $${user?.cash || 0}`, type: 'error' });
      setTimeout(() => setMessage(null), 3000);
      return;
    }

    const result = treatDogAilment(dogId, cost);
    setMessage({ text: result.message || 'Unknown error', type: result.success ? 'success' : 'error' });
    setTimeout(() => setMessage(null), 4000);
  };

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="bg-white/90 backdrop-blur-sm rounded-lg shadow-lg p-6 mb-6">
        <div className="flex items-center gap-2 mb-2">
          <h2 className="text-2xl font-bold text-earth-900">🏥 Veterinary Clinic</h2>
          <HelpButton helpId="vet-clinic" tooltip="Learn about veterinary care" />
        </div>
        <p className="text-earth-600">
          Professional medical care for your dogs. Treat illnesses, injuries, and health issues.
        </p>
        <div className="mt-2 flex items-center gap-4">
          <div className="text-sm text-earth-600">
            💰 Cash: <span className="font-bold text-kennel-700">${user?.cash || 0}</span>
          </div>
        </div>
      </div>

      {/* Message Display */}
      {message && (
        <div
          className={`mb-6 p-4 rounded-lg border-2 ${
            message.type === 'success'
              ? 'bg-green-50 border-green-300 text-green-800'
              : 'bg-red-50 border-red-300 text-red-800'
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sick/Injured Dogs */}
        <div className="bg-white/95 backdrop-blur-sm rounded-lg shadow-lg p-6">
          <h3 className="text-xl font-bold text-earth-900 mb-4">
            🤒 Patients Needing Treatment
          </h3>

          {sickOrInjuredDogs.length === 0 && healthIssueDogs.length === 0 ? (
            <div className="text-center py-12 text-earth-400">
              <p className="text-lg">✨ All dogs are healthy!</p>
              <p className="text-sm mt-2">No patients at the moment</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Sick/Injured Dogs */}
              {sickOrInjuredDogs.map((dog: any) => {
                const ailment = dog.current_ailment
                  ? getAilmentById(dog.current_ailment)
                  : dog.recovering_from
                  ? getAilmentById(dog.recovering_from)
                  : null;

                if (!ailment) return null;

                const isRecovering = !!dog.recovering_from;
                const recoveryTimeLeft = dog.recovery_due
                  ? Math.max(
                      0,
                      (new Date(dog.recovery_due).getTime() - Date.now()) / (1000 * 60 * 60)
                    )
                  : 0;

                return (
                  <div
                    key={dog.id}
                    className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      selectedDog?.id === dog.id
                        ? 'border-kennel-500 bg-kennel-50'
                        : isRecovering
                        ? 'border-blue-300 bg-blue-50 hover:border-blue-400'
                        : 'border-red-300 bg-red-50 hover:border-red-400'
                    }`}
                    onClick={() => handleSelectDog(dog)}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-bold text-earth-900">{dog.name}</p>
                        <p className="text-sm text-earth-600">Health: {Math.round(dog.health)}%</p>
                      </div>
                      <div
                        className={`px-3 py-1 rounded-full text-xs font-bold ${
                          isRecovering
                            ? 'bg-blue-500 text-white'
                            : ailment.severity === 'severe'
                            ? 'bg-red-600 text-white animate-pulse'
                            : ailment.severity === 'moderate'
                            ? 'bg-orange-500 text-white'
                            : 'bg-yellow-500 text-white'
                        }`}
                      >
                        {isRecovering ? '🔄 Recovering' : ailment.type === 'illness' ? '🦠 Sick' : '🤕 Injured'}
                      </div>
                    </div>

                    <div className="mb-3">
                      <p className="font-semibold text-earth-900 mb-1">{ailment.name}</p>
                      <p className="text-xs text-earth-600">{ailment.description}</p>
                    </div>

                    {isRecovering ? (
                      <div className="bg-white p-3 rounded-lg">
                        <p className="text-sm font-semibold text-blue-800 mb-1">Recovery in Progress</p>
                        <p className="text-xs text-blue-600">
                          {recoveryTimeLeft < 1
                            ? 'Less than 1 hour remaining'
                            : `~${Math.ceil(recoveryTimeLeft)} hours remaining`}
                        </p>
                        <div className="w-full bg-blue-200 rounded-full h-2 mt-2">
                          <div
                            className="bg-blue-500 h-2 rounded-full transition-all"
                            style={{
                              width: `${Math.max(
                                0,
                                Math.min(100, ((ailment.recoveryTime - recoveryTimeLeft) / ailment.recoveryTime) * 100)
                              )}%`,
                            }}
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <div className="text-sm text-earth-700">
                          <p className="font-semibold">Treatment: ${getDiscountedCost(ailment.treatmentCost)}</p>
                          <p className="text-xs">Recovery: {ailment.recoveryTime}h</p>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const discountedCost = getDiscountedCost(ailment.treatmentCost);
                            handleTreatAilment(dog.id, discountedCost);
                          }}
                          disabled={!user || user.cash < getDiscountedCost(ailment.treatmentCost)}
                          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-bold"
                        >
                          Treat Now
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Dogs with health issues (from neglect) */}
              {healthIssueDogs.map((dog: any) => {
                if (dog.current_ailment || dog.recovering_from) return null; // Already shown above

                const healthStatus = getHealthStatus(dog);
                const baseCost = healthStatus.needsEmergencyVet ? EMERGENCY_VET_COST : VET_COST;
                const cost = getDiscountedCost(baseCost);
                const isEmergency = healthStatus.needsEmergencyVet;

                return (
                  <div
                    key={dog.id}
                    className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      selectedDog?.id === dog.id
                        ? 'border-kennel-500 bg-kennel-50'
                        : isEmergency
                        ? 'border-red-500 bg-red-50 hover:border-red-600 animate-pulse'
                        : 'border-orange-300 bg-orange-50 hover:border-orange-400'
                    }`}
                    onClick={() => handleSelectDog(dog)}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-bold text-earth-900">{dog.name}</p>
                        <p className="text-sm text-earth-600">Health: {Math.round(dog.health)}%</p>
                      </div>
                      <div
                        className={`px-3 py-1 rounded-full text-xs font-bold ${
                          isEmergency ? 'bg-red-600 text-white' : 'bg-orange-500 text-white'
                        }`}
                      >
                        {isEmergency ? '🚨 EMERGENCY' : '⚠️ Critical'}
                      </div>
                    </div>

                    <div className="mb-3">
                      <p className="text-sm text-earth-700">{healthStatus.warningMessage}</p>
                      {healthStatus.daysWithoutCare > 0 && (
                        <p className="text-xs text-earth-500 mt-1">
                          Days without care: {healthStatus.daysWithoutCare}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="text-sm text-earth-700">
                        <p className="font-semibold">Cost: ${cost}</p>
                        {isEmergency && <p className="text-xs text-red-600">⚠️ Stats will be reduced</p>}
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          // Handle through existing health system
                          if (isEmergency) {
                            const result = useGameStore.getState().takeToEmergencyVet(dog.id);
                            setMessage({ text: result.message || '', type: result.success ? 'success' : 'error' });
                          } else {
                            const result = useGameStore.getState().takeToVet(dog.id);
                            setMessage({ text: result.message || '', type: result.success ? 'success' : 'error' });
                          }
                          setTimeout(() => setMessage(null), 4000);
                        }}
                        disabled={!user || user.cash < cost}
                        className={`px-4 py-2 ${
                          isEmergency ? 'bg-red-600 hover:bg-red-700' : 'bg-orange-600 hover:bg-orange-700'
                        } text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all font-bold`}
                      >
                        {isEmergency ? 'Emergency Care' : 'Treat Now'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Ailment Information */}
        <div className="bg-white/95 backdrop-blur-sm rounded-lg shadow-lg p-6">
          <h3 className="text-xl font-bold text-earth-900 mb-4">📋 Common Ailments</h3>

          <div className="space-y-4 max-h-[600px] overflow-y-auto">
            {Object.values(AILMENTS).map((ailment) => (
              <div
                key={ailment.id}
                className={`p-4 border-2 rounded-lg ${
                  ailment.severity === 'severe'
                    ? 'border-red-300 bg-red-50'
                    : ailment.severity === 'moderate'
                    ? 'border-orange-300 bg-orange-50'
                    : 'border-yellow-300 bg-yellow-50'
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-bold text-earth-900">{ailment.name}</p>
                    <p className="text-xs text-earth-600">
                      {ailment.type === 'illness' ? '🦠 Illness' : '🤕 Injury'} • {ailment.severity}
                    </p>
                  </div>
                  <p className="text-sm font-bold text-green-700">${getDiscountedCost(ailment.treatmentCost)}</p>
                </div>

                <p className="text-sm text-earth-700 mb-2">{ailment.description}</p>

                <div className="mb-2">
                  <p className="text-xs font-semibold text-earth-800 mb-1">Symptoms:</p>
                  <div className="flex flex-wrap gap-1">
                    {ailment.symptoms.map((symptom, i) => (
                      <span key={i} className="text-xs bg-white px-2 py-1 rounded-full text-earth-700">
                        {symptom}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <p className="text-earth-600">Recovery Time:</p>
                    <p className="font-semibold text-earth-900">{ailment.recoveryTime} hours</p>
                  </div>
                  <div>
                    <p className="text-earth-600">Health Impact:</p>
                    <p className="font-semibold text-red-700">{ailment.healthImpact}%</p>
                  </div>
                </div>

                {ailment.statImpact && (
                  <div className="mt-2 pt-2 border-t border-earth-300">
                    <p className="text-xs text-earth-600 mb-1">Stat Penalties:</p>
                    <div className="flex flex-wrap gap-1">
                      {Object.entries(ailment.statImpact).map(([stat, value]) => (
                        <span key={stat} className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded">
                          {stat}: {value}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Prevention Tips */}
      <div className="mt-6 bg-white/95 backdrop-blur-sm rounded-lg shadow-lg p-6">
        <h3 className="text-lg font-bold text-earth-900 mb-3">💡 Prevention Tips</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="font-semibold text-green-900 mb-2">🛡️ Prevent Illness</p>
            <ul className="text-sm text-green-800 space-y-1">
              <li>• Keep hunger & thirst above 60%</li>
              <li>• Maintain happiness above 70%</li>
              <li>• Keep health above 75%</li>
              <li>• Good care = 98.5% illness prevention</li>
            </ul>
          </div>
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="font-semibold text-blue-900 mb-2">🏃 Prevent Injuries</p>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Ensure health is above 75% before activities</li>
              <li>• Keep energy above 60% for training/competition</li>
              <li>• Treat ailments before resuming activities</li>
              <li>• Higher tier competitions = higher injury risk</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
