export type CertificationType =
  | 'champion'
  | 'grand_champion'
  | 'obedience_titled'
  | 'agility_master'
  | 'therapy_certified'
  | 'working_certified'
  | 'conformation_winner'
  | 'versatility_excellent'
  | 'hall_of_fame';

export type TitlePrefix = 'CH' | 'GCH' | 'OTCH' | 'MACH' | 'ThD' | 'WD' | 'BIS' | 'VX' | 'HOF';

export interface CertificationRequirement {
  competitionWins?: {
    type: string;
    count: number;
    minScore?: number;
  }[];
  minStats?: Record<string, number>;
  minLevel?: number;
  minBondLevel?: number;
  requiredSpecialization?: string;
  requiredCertifications?: CertificationType[];
  customRequirement?: string;
}

export interface Certification {
  id: CertificationType;
  name: string;
  titlePrefix: TitlePrefix;
  description: string;
  icon: string;
  prestigeLevel: number; // 1-10, higher = more prestigious

  requirements: CertificationRequirement;

  benefits: {
    statBonus?: Record<string, number>;
    prestigePoints: number;
    cashReward?: number;
    gemReward?: number;
    specialBonus?: string;
  };

  displayColor: string; // CSS class for visual distinction
}

export interface DogCertification {
  certificationType: CertificationType;
  earnedAt: string;
  displayName: string; // Full title with dog name
}

export interface PrestigeRank {
  rank: string;
  minPrestigePoints: number;
  icon: string;
  benefits: string[];
}
