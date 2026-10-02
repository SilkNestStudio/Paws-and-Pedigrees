import { Suspense } from 'react';
import type { Dog } from '../../core/dog/dog';
import { DogModel, type DogView } from './DogModel';
import { GlbDog } from './GlbDog';

/** The Blender dog, with the code-built dog standing in while it loads. */
export function AnyDog({ dog, view }: { dog: Dog; view: () => DogView }) {
  return (
    <Suspense fallback={<DogModel dog={dog} view={view} />}>
      <GlbDog dog={dog} view={view} />
    </Suspense>
  );
}
