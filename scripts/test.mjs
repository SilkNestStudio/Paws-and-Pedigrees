import { build } from 'esbuild';

// Bundle TypeScript in memory. Tests never contact Supabase or alter player saves.
const result = await build({
  entryPoints: ['tests/game.test.ts'], bundle: true, platform: 'node', format: 'esm',
  write: false, logLevel: 'silent',
  plugins: [{ name: 'isolate-cloud', setup(build) {
    build.onLoad({ filter: /localDatabase\.ts$/ }, () => ({ contents: `export const cleanSnapshot = state => state; export const localDatabase = { getItem: () => null, setItem: () => {}, removeItem: () => {} };`, loader: 'js' }));
    build.onLoad({ filter: /[\\/]lib[\\/]supabaseService\.ts$/ }, () => ({ contents: `
      export const loadUserData = async () => ({ profile: null, dogs: [], storyProgress: null });
      export const saveUserProfile = async () => true;
      export const saveDog = async () => true;
      export const deleteDog = async () => true;
      export const saveStoryProgress = async () => true;
      export const debouncedSave = () => {};
    `, loader: 'js' }));
    build.onLoad({ filter: /[\\/]lib[\\/]supabase\.ts$/ }, () => ({ contents: `export const supabase = {};`, loader: 'js' }));
    build.onLoad({ filter: /[\\/]lib[\\/]toast\.ts$/ }, () => ({ contents: `export const showToast = new Proxy({}, { get: () => () => {} });`, loader: 'js' }));
    build.onLoad({ filter: /[\\/]utils[\\/]dogImages\.ts$/ }, () => ({ contents: `export const getDogImage = () => '';`, loader: 'js' }));
  }}],
});
const memory = new Map();
globalThis.localStorage = { getItem: key => memory.get(key) ?? null, setItem: (key, value) => memory.set(key, value), removeItem: key => memory.delete(key) };
await import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString('base64')}`);
