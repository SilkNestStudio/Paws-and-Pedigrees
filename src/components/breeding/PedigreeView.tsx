import { Dog } from '../../types';
import { buildPedigreeTree, PedigreeTree, calculateCOI } from '../../utils/pedigreeAnalysis';
import { rescueBreeds } from '../../data/rescueBreeds';

interface PedigreeViewProps {
  dog: Dog;
  allDogs: Dog[];
}

export default function PedigreeView({ dog, allDogs }: PedigreeViewProps) {
  const pedigree = buildPedigreeTree(dog, allDogs, 3);
  const coi = calculateCOI(dog, allDogs);

  const renderDogCard = (node: PedigreeTree | null) => {
    if (!node) {
      return (
        <div className="bg-earth-100 border-2 border-dashed border-earth-300 rounded-lg p-3 text-center">
          <p className="text-earth-400 text-sm">Unknown</p>
        </div>
      );
    }

    const breedData = rescueBreeds.find(b => b.id === node.dog.breed_id);
    const age = Math.floor(node.dog.age_weeks / 52);

    return (
      <div className="bg-white border-2 border-kennel-400 rounded-lg p-3 hover:shadow-lg transition-all">
        <div className="flex items-center gap-2 mb-2">
          <img
            src={breedData?.img_sitting || ''}
            alt={node.dog.name}
            className="w-10 h-10 object-contain"
          />
          <div className="flex-1 min-w-0">
            <p className="font-bold text-earth-900 truncate">{node.dog.name}</p>
            <p className="text-xs text-earth-600">
              {node.dog.gender === 'male' ? '♂️' : '♀️'} {age}y old
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-1 text-xs">
          <div>
            <span className="text-earth-500">Speed:</span>{' '}
            <span className="font-semibold">{node.dog.speed}</span>
          </div>
          <div>
            <span className="text-earth-500">Agility:</span>{' '}
            <span className="font-semibold">{node.dog.agility}</span>
          </div>
          <div>
            <span className="text-earth-500">Strength:</span>{' '}
            <span className="font-semibold">{node.dog.strength}</span>
          </div>
          <div>
            <span className="text-earth-500">End:</span>{' '}
            <span className="font-semibold">{node.dog.endurance}</span>
          </div>
        </div>
      </div>
    );
  };

  const breedData = rescueBreeds.find(b => b.id === dog.breed_id);

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="bg-white/90 backdrop-blur-sm rounded-lg shadow-lg p-6 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img
              src={breedData?.img_sitting || ''}
              alt={dog.name}
              className="w-20 h-20 object-contain"
            />
            <div>
              <h2 className="text-3xl font-bold text-earth-900">{dog.name}</h2>
              <p className="text-earth-600">
                {breedData?.name} • {dog.gender === 'male' ? '♂️ Male' : '♀️ Female'}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-earth-600">Coefficient of Inbreeding</p>
            <p className={`text-3xl font-bold ${
              coi > 0.5 ? 'text-red-600' : coi > 0.25 ? 'text-yellow-600' : 'text-green-600'
            }`}>
              {(coi * 100).toFixed(1)}%
            </p>
            <p className="text-xs text-earth-500 mt-1">
              {coi > 0.5
                ? 'Highly inbred'
                : coi > 0.25
                ? 'Moderately inbred'
                : coi > 0
                ? 'Low inbreeding'
                : 'No inbreeding detected'}
            </p>
          </div>
        </div>
      </div>

      {/* Pedigree Tree */}
      <div className="bg-white/90 backdrop-blur-sm rounded-lg shadow-lg p-6">
        <h3 className="text-xl font-bold text-earth-900 mb-6">3-Generation Pedigree</h3>

        {/* Generation 0 - Subject */}
        <div className="mb-8">
          <p className="text-sm font-semibold text-earth-600 mb-2">Subject</p>
          <div className="max-w-sm">
            {renderDogCard(pedigree)}
          </div>
        </div>

        {/* Generation 1 - Parents */}
        <div className="mb-8">
          <p className="text-sm font-semibold text-earth-600 mb-2">Parents</p>
          <div className="grid grid-cols-2 gap-4 max-w-3xl">
            <div>
              <p className="text-xs text-earth-500 mb-1">Sire (Father)</p>
              {renderDogCard(pedigree.sire)}
            </div>
            <div>
              <p className="text-xs text-earth-500 mb-1">Dam (Mother)</p>
              {renderDogCard(pedigree.dam)}
            </div>
          </div>
        </div>

        {/* Generation 2 - Grandparents */}
        <div className="mb-8">
          <p className="text-sm font-semibold text-earth-600 mb-2">Grandparents</p>
          <div className="grid grid-cols-4 gap-3">
            <div>
              <p className="text-xs text-earth-500 mb-1">Paternal Grandsire</p>
              {renderDogCard(pedigree.sire?.sire || null)}
            </div>
            <div>
              <p className="text-xs text-earth-500 mb-1">Paternal Granddam</p>
              {renderDogCard(pedigree.sire?.dam || null)}
            </div>
            <div>
              <p className="text-xs text-earth-500 mb-1">Maternal Grandsire</p>
              {renderDogCard(pedigree.dam?.sire || null)}
            </div>
            <div>
              <p className="text-xs text-earth-500 mb-1">Maternal Granddam</p>
              {renderDogCard(pedigree.dam?.dam || null)}
            </div>
          </div>
        </div>

        {/* Generation 3 - Great Grandparents */}
        <div>
          <p className="text-sm font-semibold text-earth-600 mb-2">Great Grandparents</p>
          <div className="grid grid-cols-8 gap-2 text-xs">
            {renderDogCard(pedigree.sire?.sire?.sire || null)}
            {renderDogCard(pedigree.sire?.sire?.dam || null)}
            {renderDogCard(pedigree.sire?.dam?.sire || null)}
            {renderDogCard(pedigree.sire?.dam?.dam || null)}
            {renderDogCard(pedigree.dam?.sire?.sire || null)}
            {renderDogCard(pedigree.dam?.sire?.dam || null)}
            {renderDogCard(pedigree.dam?.dam?.sire || null)}
            {renderDogCard(pedigree.dam?.dam?.dam || null)}
          </div>
        </div>

        {/* Inbreeding Warning */}
        {coi > 0.25 && (
          <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <h4 className="font-semibold text-yellow-800 mb-2">⚠️ Inbreeding Warning</h4>
            <p className="text-sm text-yellow-700">
              This dog has a coefficient of inbreeding of {(coi * 100).toFixed(1)}%.
              Breeding this dog may result in puppies with reduced stats and health issues.
              Consider outcrossing to unrelated dogs to improve genetic diversity.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
