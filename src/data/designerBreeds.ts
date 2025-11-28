/**
 * Designer Breeds Database
 *
 * Recognizes popular hybrid/designer dog breeds created by crossing two purebreds.
 * When these specific combinations are bred, the offspring gets the designer breed name
 * and potentially special bonuses (hybrid vigor, higher value, etc.)
 */

export interface DesignerBreed {
  id: string;
  name: string;
  parent1Name: string; // First parent breed name
  parent2Name: string; // Second parent breed name
  parent1Id?: number; // Optional: specific breed ID
  parent2Id?: number; // Optional: specific breed ID
  description: string;
  hybridVigorBonus: number; // Percentage bonus to stats (typically 5-10%)
  popularity: 'very-high' | 'high' | 'medium' | 'low';
  avgPrice: number; // Market value multiplier
  recognizedByKennelClubs: boolean;
  characteristics: string[];
}

/**
 * Comprehensive list of recognized designer breeds
 * Ordered by popularity
 */
export const DESIGNER_BREEDS: DesignerBreed[] = [
  // VERY HIGH POPULARITY - "Doodles" and most popular
  {
    id: 'labradoodle',
    name: 'Labradoodle',
    parent1Name: 'Labrador Retriever',
    parent2Name: 'Poodle',
    parent1Id: 101,
    parent2Id: 104,
    description: 'Friendly, intelligent, often hypoallergenic. One of the most popular designer breeds.',
    hybridVigorBonus: 8,
    popularity: 'very-high',
    avgPrice: 1.5, // 50% more valuable than average
    recognizedByKennelClubs: false,
    characteristics: ['Family-friendly', 'Intelligent', 'Low-shedding', 'Active'],
  },
  {
    id: 'goldendoodle',
    name: 'Goldendoodle',
    parent1Name: 'Golden Retriever',
    parent2Name: 'Poodle',
    parent1Id: 103,
    parent2Id: 104,
    description: 'Gentle, loyal, hypoallergenic. Perfect family companion.',
    hybridVigorBonus: 8,
    popularity: 'very-high',
    avgPrice: 1.5,
    recognizedByKennelClubs: false,
    characteristics: ['Gentle', 'Friendly', 'Low-shedding', 'Trainable'],
  },
  {
    id: 'cockapoo',
    name: 'Cockapoo',
    parent1Name: 'Cocker Spaniel',
    parent2Name: 'Poodle',
    parent1Id: 106,
    parent2Id: 104,
    description: 'Affectionate, intelligent, low-shedding. Great for apartments.',
    hybridVigorBonus: 7,
    popularity: 'very-high',
    avgPrice: 1.4,
    recognizedByKennelClubs: false,
    characteristics: ['Affectionate', 'Compact', 'Low-shedding', 'Playful'],
  },

  // HIGH POPULARITY
  {
    id: 'goldenshepherd',
    name: 'Golden Shepherd',
    parent1Name: 'Golden Retriever',
    parent2Name: 'German Shepherd',
    parent1Id: 103,
    parent2Id: 201,
    description: 'Loyal, protective, intelligent. Combines the best of both breeds.',
    hybridVigorBonus: 10,
    popularity: 'high',
    avgPrice: 1.4,
    recognizedByKennelClubs: false,
    characteristics: ['Loyal', 'Protective', 'Intelligent', 'Versatile'],
  },
  {
    id: 'sheepadoodle',
    name: 'Sheepadoodle',
    parent1Name: 'Old English Sheepdog',
    parent2Name: 'Poodle',
    description: 'Gentle giant, hypoallergenic, family-friendly.',
    hybridVigorBonus: 7,
    popularity: 'high',
    avgPrice: 1.4,
    recognizedByKennelClubs: false,
    characteristics: ['Gentle', 'Large', 'Low-shedding', 'Calm'],
  },
  {
    id: 'aussiedoodle',
    name: 'Aussiedoodle',
    parent1Name: 'Australian Shepherd',
    parent2Name: 'Poodle',
    parent1Id: 204,
    parent2Id: 104,
    description: 'Energetic, smart, hypoallergenic herding dog.',
    hybridVigorBonus: 8,
    popularity: 'high',
    avgPrice: 1.4,
    recognizedByKennelClubs: false,
    characteristics: ['Energetic', 'Smart', 'Low-shedding', 'Athletic'],
  },
  {
    id: 'bernedoodle',
    name: 'Bernedoodle',
    parent1Name: 'Bernese Mountain Dog',
    parent2Name: 'Poodle',
    description: 'Gentle, goofy, hypoallergenic. Great with families.',
    hybridVigorBonus: 7,
    popularity: 'high',
    avgPrice: 1.5,
    recognizedByKennelClubs: false,
    characteristics: ['Gentle', 'Playful', 'Low-shedding', 'Large'],
  },
  {
    id: 'puggle',
    name: 'Puggle',
    parent1Name: 'Pug',
    parent2Name: 'Beagle',
    parent2Id: 102,
    description: 'Friendly, energetic, less breathing issues than pugs.',
    hybridVigorBonus: 6,
    popularity: 'high',
    avgPrice: 1.2,
    recognizedByKennelClubs: false,
    characteristics: ['Friendly', 'Compact', 'Energetic', 'Social'],
  },

  // MEDIUM POPULARITY
  {
    id: 'cavapoo',
    name: 'Cavapoo',
    parent1Name: 'Cavalier King Charles Spaniel',
    parent2Name: 'Poodle',
    description: 'Sweet, gentle, hypoallergenic lap dog.',
    hybridVigorBonus: 6,
    popularity: 'medium',
    avgPrice: 1.3,
    recognizedByKennelClubs: false,
    characteristics: ['Sweet', 'Small', 'Low-shedding', 'Affectionate'],
  },
  {
    id: 'yorkipoo',
    name: 'Yorkipoo',
    parent1Name: 'Yorkshire Terrier',
    parent2Name: 'Poodle',
    description: 'Tiny, hypoallergenic, big personality in small package.',
    hybridVigorBonus: 6,
    popularity: 'medium',
    avgPrice: 1.3,
    recognizedByKennelClubs: false,
    characteristics: ['Tiny', 'Confident', 'Low-shedding', 'Portable'],
  },
  {
    id: 'pomsky',
    name: 'Pomsky',
    parent1Name: 'Pomeranian',
    parent2Name: 'Siberian Husky',
    parent2Id: 203,
    description: 'Adorable mini husky look, but SIZE INCOMPATIBLE - requires artificial insemination.',
    hybridVigorBonus: 5,
    popularity: 'medium',
    avgPrice: 1.6,
    recognizedByKennelClubs: false,
    characteristics: ['Small', 'Fluffy', 'Energetic', 'Cute'],
  },
  {
    id: 'schnoodle',
    name: 'Schnoodle',
    parent1Name: 'Miniature Schnauzer',
    parent2Name: 'Poodle',
    description: 'Alert, hypoallergenic, excellent watchdog.',
    hybridVigorBonus: 6,
    popularity: 'medium',
    avgPrice: 1.2,
    recognizedByKennelClubs: false,
    characteristics: ['Alert', 'Low-shedding', 'Loyal', 'Smart'],
  },
  {
    id: 'boxerdoodle',
    name: 'Boxerdoodle',
    parent1Name: 'Boxer',
    parent2Name: 'Poodle',
    parent1Id: 205,
    parent2Id: 104,
    description: 'Playful, hypoallergenic, energetic family dog.',
    hybridVigorBonus: 7,
    popularity: 'medium',
    avgPrice: 1.3,
    recognizedByKennelClubs: false,
    characteristics: ['Playful', 'Athletic', 'Low-shedding', 'Friendly'],
  },
  {
    id: 'shepsky',
    name: 'Shepsky',
    parent1Name: 'German Shepherd',
    parent2Name: 'Siberian Husky',
    parent1Id: 201,
    parent2Id: 203,
    description: 'Stunning, athletic, intelligent working dog mix.',
    hybridVigorBonus: 9,
    popularity: 'medium',
    avgPrice: 1.3,
    recognizedByKennelClubs: false,
    characteristics: ['Athletic', 'Smart', 'Loyal', 'Striking'],
  },

  // WORKING/SPORT MIXES
  {
    id: 'labrabull',
    name: 'Labrabull',
    parent1Name: 'Labrador Retriever',
    parent2Name: 'Pit Bull',
    parent1Id: 101,
    description: 'Strong, loyal, family-oriented.',
    hybridVigorBonus: 8,
    popularity: 'medium',
    avgPrice: 1.1,
    recognizedByKennelClubs: false,
    characteristics: ['Strong', 'Loyal', 'Energetic', 'Friendly'],
  },
  {
    id: 'german-shepherd-lab',
    name: 'Sheprador',
    parent1Name: 'German Shepherd',
    parent2Name: 'Labrador Retriever',
    parent1Id: 201,
    parent2Id: 101,
    description: 'Intelligent, versatile working dog. Great for service work.',
    hybridVigorBonus: 9,
    popularity: 'medium',
    avgPrice: 1.2,
    recognizedByKennelClubs: false,
    characteristics: ['Intelligent', 'Versatile', 'Loyal', 'Trainable'],
  },
  {
    id: 'golden-lab',
    name: 'Golden Labrador',
    parent1Name: 'Golden Retriever',
    parent2Name: 'Labrador Retriever',
    parent1Id: 103,
    parent2Id: 101,
    description: 'Ultimate family retriever. Friendly and trainable.',
    hybridVigorBonus: 7,
    popularity: 'high',
    avgPrice: 1.2,
    recognizedByKennelClubs: false,
    characteristics: ['Friendly', 'Gentle', 'Trainable', 'Family-oriented'],
  },
  {
    id: 'border-aussie',
    name: 'Border Aussie',
    parent1Name: 'Border Collie',
    parent2Name: 'Australian Shepherd',
    parent1Id: 202,
    parent2Id: 204,
    description: 'Super-intelligent herding powerhouse. Needs lots of activity.',
    hybridVigorBonus: 10,
    popularity: 'medium',
    avgPrice: 1.3,
    recognizedByKennelClubs: false,
    characteristics: ['Brilliant', 'Energetic', 'Athletic', 'Intense'],
  },

  // UNIQUE/RARE MIXES
  {
    id: 'rotterman',
    name: 'Rotterman',
    parent1Name: 'Rottweiler',
    parent2Name: 'Doberman Pinscher',
    parent1Id: 206,
    parent2Id: 302,
    description: 'Powerful, loyal guardian. Excellent protection dog.',
    hybridVigorBonus: 8,
    popularity: 'low',
    avgPrice: 1.4,
    recognizedByKennelClubs: false,
    characteristics: ['Powerful', 'Protective', 'Loyal', 'Confident'],
  },
  {
    id: 'huskador',
    name: 'Huskador',
    parent1Name: 'Siberian Husky',
    parent2Name: 'Labrador Retriever',
    parent1Id: 203,
    parent2Id: 101,
    description: 'Friendly, energetic, stunning appearance.',
    hybridVigorBonus: 7,
    popularity: 'medium',
    avgPrice: 1.2,
    recognizedByKennelClubs: false,
    characteristics: ['Friendly', 'Energetic', 'Beautiful', 'Social'],
  },
  {
    id: 'corgidor',
    name: 'Corgidor',
    parent1Name: 'Pembroke Welsh Corgi',
    parent2Name: 'Labrador Retriever',
    parent1Id: 101,
    description: 'Short-legged Lab! Adorable and friendly.',
    hybridVigorBonus: 6,
    popularity: 'medium',
    avgPrice: 1.3,
    recognizedByKennelClubs: false,
    characteristics: ['Adorable', 'Short', 'Friendly', 'Unique'],
  },
];

/**
 * Find a designer breed match for two parent breeds
 */
export function findDesignerBreed(
  parent1BreedName: string,
  parent2BreedName: string
): DesignerBreed | null {
  // Normalize names for comparison
  const normalize = (name: string) => name.toLowerCase().trim();
  const p1 = normalize(parent1BreedName);
  const p2 = normalize(parent2BreedName);

  // Check both orderings (Lab x Poodle = Poodle x Lab)
  return DESIGNER_BREEDS.find(db => {
    const db1 = normalize(db.parent1Name);
    const db2 = normalize(db.parent2Name);
    return (p1 === db1 && p2 === db2) || (p1 === db2 && p2 === db1);
  }) || null;
}

/**
 * Find designer breed by breed IDs
 */
export function findDesignerBreedById(
  parent1Id: number,
  parent2Id: number
): DesignerBreed | null {
  return DESIGNER_BREEDS.find(db => {
    if (!db.parent1Id || !db.parent2Id) return false;
    return (
      (parent1Id === db.parent1Id && parent2Id === db.parent2Id) ||
      (parent1Id === db.parent2Id && parent2Id === db.parent1Id)
    );
  }) || null;
}

/**
 * Get all designer breeds that include a specific parent breed
 */
export function getDesignerBreedsForParent(breedName: string): DesignerBreed[] {
  const normalized = breedName.toLowerCase().trim();
  return DESIGNER_BREEDS.filter(
    db =>
      db.parent1Name.toLowerCase() === normalized ||
      db.parent2Name.toLowerCase() === normalized
  );
}
