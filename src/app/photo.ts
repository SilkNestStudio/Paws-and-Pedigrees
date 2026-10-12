/**
 * Photographs for the album. The scene takes the picture on its next frame
 * (so it is the 3D view alone, with no buttons in it) and hands it to `done`.
 */
export const photo: { pending: ((image: string) => void) | null } = { pending: null };

/** Longest side of a saved photograph, in pixels: small enough to keep a dozen in the save. */
export const PHOTO_SIZE = 560;

export function requestPhoto(done: (image: string) => void): void {
  photo.pending = done;
}
