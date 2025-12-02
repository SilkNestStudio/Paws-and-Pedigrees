import React, { useState } from 'react';
import { Dog } from '../../types';
import { Certification } from '../../types/certifications';
import { CERTIFICATIONS, PRESTIGE_RANKS, checkCertificationEligibility, getPrestigeRank, formatDogNameWithTitles } from '../../data/certifications';

interface CertificationsViewProps {
  dog: Dog;
  competitionHistory: any[];
  onClaimCertification: (certificationId: string) => void;
}

export const CertificationsView: React.FC<CertificationsViewProps> = ({
  dog,
  competitionHistory,
  onClaimCertification,
}) => {
  const [selectedCert, setSelectedCert] = useState<Certification | null>(null);

  const dogPrestigePoints = dog.prestigePoints || 0;
  const currentRank = getPrestigeRank(dogPrestigePoints);
  const nextRank = PRESTIGE_RANKS.find(r => r.minPrestigePoints > dogPrestigePoints);

  const earnedCerts = dog.certifications || [];
  const earnedCertIds = earnedCerts.map(c => c.certificationType);

  const availableCerts = Object.values(CERTIFICATIONS).filter(cert =>
    !earnedCertIds.includes(cert.id) &&
    checkCertificationEligibility(dog, cert, competitionHistory)
  );

  const lockedCerts = Object.values(CERTIFICATIONS).filter(cert =>
    !earnedCertIds.includes(cert.id) &&
    !checkCertificationEligibility(dog, cert, competitionHistory)
  );

  const renderCertificationCard = (cert: Certification, status: 'earned' | 'available' | 'locked') => {
    const earned = earnedCerts.find(c => c.certificationType === cert.id);

    return (
      <div
        key={cert.id}
        onClick={() => setSelectedCert(cert)}
        className={`bg-white rounded-lg shadow-md p-6 cursor-pointer transition-all hover:shadow-lg ${
          status === 'earned' ? 'border-2 border-green-500' :
          status === 'available' ? 'border-2 border-blue-500' :
          'opacity-60'
        }`}
      >
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center">
            <span className="text-4xl mr-3">{cert.icon}</span>
            <div>
              <h3 className={`text-lg font-bold ${cert.displayColor}`}>
                {cert.name}
              </h3>
              <p className="text-sm text-gray-600">{cert.titlePrefix}</p>
            </div>
          </div>
          {status === 'earned' && (
            <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded">
              EARNED
            </span>
          )}
          {status === 'available' && (
            <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded">
              AVAILABLE
            </span>
          )}
        </div>

        <p className="text-sm text-gray-600 mb-4">{cert.description}</p>

        {/* Prestige Level */}
        <div className="flex items-center mb-3">
          <span className="text-xs text-gray-500 mr-2">Prestige Level:</span>
          <div className="flex">
            {Array.from({ length: 10 }).map((_, i) => (
              <span
                key={i}
                className={`text-lg ${i < cert.prestigeLevel ? 'text-yellow-500' : 'text-gray-300'}`}
              >
                ★
              </span>
            ))}
          </div>
        </div>

        {/* Benefits */}
        <div className="bg-gray-50 rounded p-3 mb-3">
          <p className="text-xs font-semibold text-gray-700 mb-2">Benefits:</p>
          <ul className="space-y-1">
            <li className="text-xs text-gray-600">
              +{cert.benefits.prestigePoints} Prestige Points
            </li>
            {cert.benefits.cashReward && (
              <li className="text-xs text-green-600">
                ${cert.benefits.cashReward} Cash Reward
              </li>
            )}
            {cert.benefits.gemReward && (
              <li className="text-xs text-purple-600">
                {cert.benefits.gemReward} Gems
              </li>
            )}
            {cert.benefits.specialBonus && (
              <li className="text-xs text-blue-600">
                {cert.benefits.specialBonus}
              </li>
            )}
          </ul>
        </div>

        {earned && (
          <p className="text-xs text-gray-500">
            Earned: {new Date(earned.earnedAt).toLocaleDateString()}
          </p>
        )}

        {status === 'available' && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClaimCertification(cert.id);
            }}
            className="w-full mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
          >
            Claim Certification
          </button>
        )}
      </div>
    );
  };

  const renderCertificationDetails = () => {
    if (!selectedCert) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <div className="p-6">
            <div className="flex justify-between items-start mb-6">
              <div className="flex items-center">
                <span className="text-5xl mr-4">{selectedCert.icon}</span>
                <div>
                  <h2 className={`text-2xl font-bold ${selectedCert.displayColor}`}>
                    {selectedCert.name}
                  </h2>
                  <p className="text-gray-600 mt-1">{selectedCert.description}</p>
                  <p className="text-sm text-gray-500 mt-1">Title Prefix: {selectedCert.titlePrefix}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedCert(null)}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            </div>

            {/* Requirements */}
            <div className="mb-6">
              <h3 className="font-semibold text-gray-800 mb-3">Requirements:</h3>
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                {selectedCert.requirements.minLevel && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Minimum Level:</span>
                    <span className="font-semibold">{selectedCert.requirements.minLevel}</span>
                  </div>
                )}
                {selectedCert.requirements.minBondLevel && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Minimum Bond Level:</span>
                    <span className="font-semibold">{selectedCert.requirements.minBondLevel}</span>
                  </div>
                )}
                {selectedCert.requirements.competitionWins && (
                  <div>
                    <p className="text-sm text-gray-600 mb-2">Competition Wins:</p>
                    {selectedCert.requirements.competitionWins.map((req, index) => (
                      <div key={index} className="ml-4 text-sm text-gray-700">
                        • {req.count} {req.type} competitions
                        {req.minScore && ` with score ≥${req.minScore}`}
                      </div>
                    ))}
                  </div>
                )}
                {selectedCert.requirements.minStats && (
                  <div>
                    <p className="text-sm text-gray-600 mb-2">Minimum Stats:</p>
                    {Object.entries(selectedCert.requirements.minStats).map(([stat, value]) => (
                      <div key={stat} className="ml-4 text-sm text-gray-700">
                        • {stat.replace('_', ' ')}: {value}
                      </div>
                    ))}
                  </div>
                )}
                {selectedCert.requirements.requiredSpecialization && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Required Specialization:</span>
                    <span className="font-semibold capitalize">
                      {selectedCert.requirements.requiredSpecialization.replace('_', ' ')}
                    </span>
                  </div>
                )}
                {selectedCert.requirements.requiredCertifications && (
                  <div>
                    <p className="text-sm text-gray-600 mb-2">Required Certifications:</p>
                    {selectedCert.requirements.requiredCertifications.map(certId => (
                      <div key={certId} className="ml-4 text-sm text-gray-700">
                        • {CERTIFICATIONS[certId].name}
                      </div>
                    ))}
                  </div>
                )}
                {selectedCert.requirements.customRequirement && (
                  <div className="text-sm text-gray-600 italic">
                    {selectedCert.requirements.customRequirement}
                  </div>
                )}
              </div>
            </div>

            {/* Benefits */}
            <div>
              <h3 className="font-semibold text-gray-800 mb-3">Benefits:</h3>
              <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">Prestige Points:</span>
                  <span className="text-lg font-bold text-yellow-700">
                    +{selectedCert.benefits.prestigePoints}
                  </span>
                </div>
                {selectedCert.benefits.cashReward && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">Cash Reward:</span>
                    <span className="text-lg font-bold text-green-700">
                      ${selectedCert.benefits.cashReward}
                    </span>
                  </div>
                )}
                {selectedCert.benefits.gemReward && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">Gem Reward:</span>
                    <span className="text-lg font-bold text-purple-700">
                      {selectedCert.benefits.gemReward} 💎
                    </span>
                  </div>
                )}
                {selectedCert.benefits.statBonus && (
                  <div>
                    <p className="text-sm text-gray-700 mb-1">Stat Bonuses:</p>
                    {Object.entries(selectedCert.benefits.statBonus).map(([stat, bonus]) => (
                      <div key={stat} className="ml-4 text-sm text-blue-700">
                        +{bonus} {stat.replace('_', ' ')}
                      </div>
                    ))}
                  </div>
                )}
                {selectedCert.benefits.specialBonus && (
                  <div className="pt-2 border-t border-yellow-200">
                    <p className="text-sm font-semibold text-purple-800">
                      {selectedCert.benefits.specialBonus}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">
          {formatDogNameWithTitles(dog.name, dog.certifications || [])}
        </h1>
        <p className="text-gray-600">Certifications and Prestige System</p>
      </div>

      {/* Prestige Rank */}
      <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg shadow-md p-6 mb-8">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600 mb-1">Current Prestige Rank</p>
            <div className="flex items-center">
              <span className="text-3xl mr-3">{currentRank.icon}</span>
              <div>
                <h2 className="text-2xl font-bold text-gray-800">{currentRank.rank}</h2>
                <p className="text-sm text-gray-600">{dogPrestigePoints} Prestige Points</p>
              </div>
            </div>
          </div>
          {nextRank && (
            <div className="text-right">
              <p className="text-sm text-gray-600 mb-1">Next Rank</p>
              <div className="flex items-center">
                <div className="text-right mr-3">
                  <p className="font-bold text-gray-800">{nextRank.rank}</p>
                  <p className="text-sm text-gray-600">
                    {nextRank.minPrestigePoints - dogPrestigePoints} points needed
                  </p>
                </div>
                <span className="text-3xl">{nextRank.icon}</span>
              </div>
            </div>
          )}
        </div>

        {/* Progress Bar */}
        {nextRank && (
          <div className="mt-4">
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-yellow-400 to-orange-500 transition-all"
                style={{
                  width: `${Math.min(100, (dogPrestigePoints / nextRank.minPrestigePoints) * 100)}%`,
                }}
              />
            </div>
          </div>
        )}

        {/* Current Benefits */}
        <div className="mt-4">
          <p className="text-sm font-semibold text-gray-700 mb-2">Current Benefits:</p>
          <div className="flex flex-wrap gap-2">
            {currentRank.benefits.map((benefit, index) => (
              <span
                key={index}
                className="px-3 py-1 bg-white rounded-full text-xs text-gray-700 shadow-sm"
              >
                {benefit}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Available Certifications */}
      {availableCerts.length > 0 && (
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">
            Available Certifications ({availableCerts.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {availableCerts.map(cert => renderCertificationCard(cert, 'available'))}
          </div>
        </div>
      )}

      {/* Earned Certifications */}
      {earnedCerts.length > 0 && (
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">
            Earned Certifications ({earnedCerts.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {earnedCerts.map(earnedCert => {
              const cert = CERTIFICATIONS[earnedCert.certificationType];
              return cert ? renderCertificationCard(cert, 'earned') : null;
            })}
          </div>
        </div>
      )}

      {/* Locked Certifications */}
      <div>
        <h2 className="text-2xl font-bold text-gray-800 mb-4">
          Locked Certifications ({lockedCerts.length})
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {lockedCerts.map(cert => renderCertificationCard(cert, 'locked'))}
        </div>
      </div>

      {/* Certification Details Modal */}
      {renderCertificationDetails()}
    </div>
  );
};
