/**
 * Competition System Type Definitions
 * Models realistic AKC/Westminster dog show structure
 */

// ============================================================================
// Event System
// ============================================================================

/**
 * Types of competition events with different point values and prestige
 */
export type EventType =
  | 'match_show'      // Practice, no championship points, low fee
  | 'point_show'      // Standard championship points (1-2 pts)
  | 'specialty_show'  // Breed-specific, higher points (3-4 pts)
  | 'group_show'      // Group competition (Sporting, Working, etc.)
  | 'all_breed'       // All breeds compete, major show (5 pts)
  | 'invitational'    // Qualified dogs only, high stakes
  | 'championship';   // National championship event

/**
 * Competition disciplines - different skill tests
 */
export type CompetitionDiscipline =
  | 'conformation'    // Breed standard judging (NEW)
  | 'agility'         // Obstacle course navigation
  | 'obedience'       // Command following and control
  | 'rally'           // Obedience + agility hybrid (NEW)
  | 'racing'          // Speed competition
  | 'weight_pull'     // Strength test
  | 'tracking'        // Scent work (NEW)
  | 'herding';        // Breed-specific herding (NEW)

/**
 * Event status throughout its lifecycle
 */
export type EventStatus =
  | 'upcoming'         // Scheduled, registration not yet open
  | 'registration'     // Registration window is open
  | 'entries_closed'   // Registration closed, event pending
  | 'in_progress'      // Event is currently happening
  | 'completed';       // Event finished, results posted

/**
 * Complete event data structure
 */
export interface CompetitionEvent {
  id: string;
  name: string;
  eventType: EventType;
  discipline: CompetitionDiscipline;

  // Scheduling
  registrationOpens: string;     // ISO timestamp
  registrationCloses: string;    // ISO timestamp
  eventDate: string;             // ISO timestamp
  eventDuration: number;         // Duration in hours
  status: EventStatus;

  // Entry requirements
  entryFee: number;              // Cost in game currency
  minLevel: number;              // Minimum user level
  minAge: number;                // Minimum dog age in weeks
  requiredTitle?: TitleType;     // Required championship title
  breedRestriction?: number[];   // Breed IDs for specialty shows
  groupRestriction?: DogGroup;   // Group restriction for group shows

  // Points & rewards
  pointsAwarded: {
    first: number;
    second: number;
    third: number;
    fourth: number;
  };
  isMajor: boolean;              // 3+ points = major win
  prizes: {
    first: number;
    second: number;
    third: number;
    participation: number;
  };

  // Competition details
  maxEntries: number;            // Maximum dogs that can enter
  currentEntries: number;        // Current number of registrations
  judgeId: string;               // Judge assigned to this event
  leaderboard: LeaderboardEntry[]; // Current standings
}

/**
 * Simplified event data for calendar display
 */
export interface EventSummary {
  id: string;
  name: string;
  eventType: EventType;
  discipline: CompetitionDiscipline;
  eventDate: string;
  status: EventStatus;
  entryFee: number;
  pointsAwarded: number;         // First place points
  isMajor: boolean;
  spotsRemaining: number;
}

// ============================================================================
// Championship Progression
// ============================================================================

/**
 * Championship title progression (AKC model)
 */
export type TitleType =
  | 'none'
  | 'junior_handler'     // 5 points
  | 'champion'           // 15 points + 2 majors + 3 judges
  | 'grand_champion'     // +25 points + 3 majors
  | 'silver_grand'       // +100 points
  | 'gold_grand'         // +200 points
  | 'platinum_grand';    // +400 points

/**
 * Requirements for each title
 */
export interface TitleRequirement {
  title: TitleType;
  totalPoints: number;
  majorWinsRequired: number;
  judgesRequired: number;
  displayName: string;
  description: string;
  icon: string;
}

/**
 * Championship progress tracking for each dog
 */
export interface ChampionshipProgress {
  dogId: string;

  // Overall progress
  totalPoints: number;
  currentTitle: TitleType;
  nextTitle: TitleType;
  pointsToNext: number;

  // Major wins (3+ points in single event)
  majorWins: number;
  majorsNeeded: number;

  // Judge variety (need 3+ different judges for Champion)
  judgesWonUnder: string[];      // Judge IDs
  judgesNeeded: number;

  // Discipline-specific points
  disciplinePoints: {
    conformation: number;
    agility: number;
    obedience: number;
    rally: number;
    racing: number;
    weight_pull: number;
    tracking: number;
    herding: number;
  };

  // Achievement tracking
  specialtyWins: number;         // Breed-specific shows won
  groupWins: number;             // Group shows won
  allBreedWins: number;          // All-breed shows won
  bestInShowWins: number;        // Best in Show awards

  // Qualifications for special events
  qualifiedFor: string[];        // Event IDs dog is qualified to enter
}

/**
 * History record for a single competition result
 */
export interface CompetitionResult {
  eventId: string;
  eventName: string;
  eventType: EventType;
  discipline: CompetitionDiscipline;
  placement: number;             // 1-4 or 0 if didn't place
  pointsAwarded: number;
  prizeMoney: number;
  isMajor: boolean;
  judgeId: string;
  completedAt: string;           // ISO timestamp
  score: number;                 // Minigame score
}

// ============================================================================
// Breed Groups (AKC Classification)
// ============================================================================

/**
 * AKC breed group classification
 */
export enum DogGroup {
  SPORTING = 'sporting',         // Retrievers, Spaniels, Pointers
  HOUND = 'hound',              // Beagles, Greyhounds, Bloodhounds
  WORKING = 'working',          // Huskies, Mastiffs, Great Danes
  TERRIER = 'terrier',          // Jack Russell, Bull Terrier, Airedale
  TOY = 'toy',                  // Chihuahua, Pomeranian, Pug
  NON_SPORTING = 'non_sporting', // Bulldogs, Poodles, Dalmatians
  HERDING = 'herding',          // Border Collie, German Shepherd, Corgi
  MISCELLANEOUS = 'misc',       // Newer/rare breeds not yet recognized
}

/**
 * Breed group display information
 */
export interface DogGroupInfo {
  group: DogGroup;
  displayName: string;
  description: string;
  icon: string;
  typicalTraits: string[];
}

// ============================================================================
// Judges
// ============================================================================

/**
 * Judge information
 */
export interface Judge {
  id: string;
  name: string;
  specialties: CompetitionDiscipline[]; // Disciplines they judge
  groupExpertise?: DogGroup;            // Group specialty
  reputation: number;                   // 1-5 stars
  strictness: number;                   // 0-1, affects scoring variance
  bio: string;
}

// ============================================================================
// Leaderboards & Async Competition
// ============================================================================

/**
 * Leaderboard entry for an event
 */
export interface LeaderboardEntry {
  id: string;
  userId: string;
  dogId: string;
  dogName: string;
  breedName: string;
  ownerKennel: string;

  eventId: string;
  score: number;
  placement: number;                    // Final placement (1-4 or 0)
  championshipPoints: number;           // Points awarded

  // Replay data for ghost competition
  minigameReplay?: MinigameReplayData;
  dogStats: DogStatsSnapshot;           // Dog stats at time of competition
  completedAt: string;                  // ISO timestamp
}

/**
 * Snapshot of dog stats for fair competition
 */
export interface DogStatsSnapshot {
  agility: number;
  obedience: number;
  speed: number;
  strength: number;
  intelligence: number;
  energy: number;
  happiness: number;
  age_weeks: number;
  breedId: number;
  level: number;
}

/**
 * Minigame replay data for ghost competition
 */
export interface MinigameReplayData {
  discipline: CompetitionDiscipline;
  seed: number;                         // Random seed for reproducibility
  inputs: InputFrame[];                 // Player input timeline
  checkpoints: Checkpoint[];            // Validation points
  finalScore: number;
  duration: number;                     // Time in milliseconds
}

/**
 * Single input frame in replay
 */
export interface InputFrame {
  timestamp: number;                    // Milliseconds from start
  action: string;                       // 'click', 'keydown', 'keyup'
  key?: string;                         // Key pressed (if keyboard)
  x?: number;                           // Mouse X (if mouse)
  y?: number;                           // Mouse Y (if mouse)
}

/**
 * Checkpoint for replay validation
 */
export interface Checkpoint {
  timestamp: number;
  state: Record<string, any>;           // Game state snapshot
  score: number;
}

// ============================================================================
// Event Registration
// ============================================================================

/**
 * Registration record for a dog in an event
 */
export interface EventRegistration {
  id: string;
  eventId: string;
  userId: string;
  dogId: string;
  registeredAt: string;                 // ISO timestamp
  status: 'registered' | 'competed' | 'withdrawn';
}

/**
 * Validation result for event registration
 */
export interface RegistrationValidation {
  canRegister: boolean;
  reason?: string;                      // Why registration is blocked
  missingRequirements?: string[];
}

// ============================================================================
// Minigame Results
// ============================================================================

/**
 * Result from completing a minigame
 */
export interface MinigameResult {
  discipline: CompetitionDiscipline;
  score: number;
  perfectHits?: number;                 // For timing-based games
  errors?: number;                      // Mistakes made
  bonusMultiplier?: number;             // Breed/stat bonuses
  replayData: MinigameReplayData;
  timestamp: string;
}

// ============================================================================
// Event Scheduling
// ============================================================================

/**
 * Template for generating recurring events
 */
export interface EventTemplate {
  namePattern: string;                  // e.g., "Weekly {discipline} Match"
  eventType: EventType;
  discipline: CompetitionDiscipline;
  entryFee: number;
  minLevel: number;
  minAge: number;
  maxEntries: number;
  schedule: EventSchedule;
}

/**
 * Scheduling rules for events
 */
export interface EventSchedule {
  type: 'weekly' | 'monthly' | 'seasonal' | 'random';
  dayOfWeek?: number;                   // 0-6 for weekly
  weekOfMonth?: number;                 // 1-4 for monthly
  month?: number;                       // 1-12 for seasonal
  registrationWindowHours: number;      // Hours before event to close reg
  eventDurationHours: number;
}

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Point calculation result
 */
export interface PointCalculation {
  basePoints: number;
  fieldSizeBonus: number;
  finalPoints: number;
  isMajor: boolean;
}

/**
 * Title check result
 */
export interface TitleCheckResult {
  earnedTitle: boolean;
  newTitle?: TitleType;
  requirements: {
    pointsMet: boolean;
    majorsMet: boolean;
    judgesMet: boolean;
  };
}
