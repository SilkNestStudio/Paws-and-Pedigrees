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
  'Poodle': 'Poodle',
  'Dachshund': 'Dachshund',
  'Shih Tzu': 'ShihTzu',
  'Bulldog': 'Bulldog',
  'Rottweiler': 'Rottweiler',
  'Yorkshire Terrier': 'Yorkie',
  'Siberian Husky': 'Husky',
  'Pug': 'Pug',
  'Chihuahua': 'Chihuahua',
  'Pomeranian': 'Pomeranian',
};

// Placeholder dog image using a data URL (simple dog silhouette)
const PLACEHOLDER_DOG = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0xMDAgMTUwQzEyNy42MTQgMTUwIDE1MCAxMjcuNjE0IDE1MCAxMDBDMTUwIDcyLjM4NTggMTI3LjYxNCA1MCAxMDAgNTBDNzIuMzg1OCA1MCA1MCA3Mi4zODU4IDUwIDEwMEM1MCAxMjcuNjE0IDcyLjM4NTggMTUwIDEwMCAxNTBaIiBmaWxsPSIjOUI5QjlCIi8+CjxjaXJjbGUgY3g9Ijg1IiBjeT0iOTAiIHI9IjgiIGZpbGw9IiMzMzMzMzMiLz4KPGNpcmNsZSBjeD0iMTE1IiBjeT0iOTAiIHI9IjgiIGZpbGw9IiMzMzMzMzMiLz4KPHBhdGggZD0iTTg1IDExMEM4NSAxMTUgOTAgMTIwIDEwMCAxMjBDMTEwIDEyMCAxMTUgMTE1IDExNSAxMTAiIHN0cm9rZT0iIzMzMzMzMyIgc3Ryb2tlLXdpZHRoPSIzIiBzdHJva2UtbGluZWNhcD0icm91bmQiLz4KPHRleHQgeD0iMTAwIiB5PSIxNzAiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzY2NjY2NiIgdGV4dC1hbmNob3I9Im1pZGRsZSI+RG9nIEltYWdlPC90ZXh0Pgo8L3N2Zz4=';

export function getDogImage(breedName: string, pose: 'Sitting' | 'Standing' | 'Laying'): string {
  const imagePrefix = breedImageMap[breedName] || 'Mutt';
  const imagePath = `../assets/images/dogs/${imagePrefix}${pose}.png`;

  const result = images[imagePath] as string;

  // Return placeholder if image not found
  return result || PLACEHOLDER_DOG;
}