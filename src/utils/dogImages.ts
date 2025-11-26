// Import all dog images using Vite's import.meta.glob
const images = import.meta.glob('../assets/images/dogs/*.png', { eager: true, as: 'url' });

// Map breed names to image filenames
const breedImageMap: { [key: string]: string } = {
  'American Staffordshire Terrier': 'AmericanStaffy',
  'Labrador Retriever': 'Labrador',
  'German Shepherd': 'GermanShepard',
  'Border Collie': 'BorderCollie',
  'Doberman Pinscher': 'Doberman',
  'Golden Retriever': 'GoldenRetriever',
  'Boxer': 'Boxer',
  'Beagle': 'Beagle',
  'Australian Shepherd': 'AustralianShepard',
  'Mixed Breed': 'Mutt',
};

export function getDogImage(breedName: string, pose: 'Sitting' | 'Standing' | 'Laying'): string {
  const imagePrefix = breedImageMap[breedName] || 'Mutt';
  const imagePath = `../assets/images/dogs/${imagePrefix}${pose}.png`;

  // Debug: log what we're looking for and what's available
  console.log('Looking for:', imagePath);
  console.log('Available images:', Object.keys(images));
  console.log('Result:', images[imagePath]);

  return (images[imagePath] as string) || '';
}