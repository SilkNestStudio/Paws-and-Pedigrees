# Landscape Mode Configuration

The app now includes a landscape mode prompt for mobile devices!

## What It Does

When users access the game on a mobile device in portrait mode, they'll see a friendly prompt suggesting they rotate to landscape for the best experience.

## Features

- **Automatic Detection** - Only shows on mobile devices (< 768px width) in portrait
- **Auto-Hides** - Disappears when device is rotated to landscape
- **Dismissible** - Users can click "Continue in Portrait" if they prefer
- **Animated** - Includes bouncing phone icon and rotating arrow for visual feedback

## Customizing the Prompt

### To Disable It Completely

In `src/App.tsx`, remove or comment out this line:

```tsx
{/* Landscape Prompt for Mobile */}
<LandscapePrompt />
```

### To Change the Message

Edit `src/components/layout/LandscapePrompt.tsx`:

```tsx
<h2 className="text-2xl font-bold mb-3">Your Custom Title!</h2>
<p className="text-lg mb-2 opacity-90">
  Your custom message here
</p>
```

### To Force It to Always Show

In `LandscapePrompt.tsx`, change the condition:

```tsx
// Always show (for testing)
setIsPortrait(true);

// Or only show on small screens regardless of orientation
const isMobile = window.innerWidth < 768;
setIsPortrait(isMobile);
```

### To Remove the Dismiss Button

In `LandscapePrompt.tsx`, remove this section:

```tsx
{/* Optional: Dismiss Button */}
<button
  onClick={() => setIsPortrait(false)}
  className="mt-6 px-6 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-sm transition-all"
>
  Continue in Portrait
</button>
```

## Landscape Optimizations

The app also includes CSS optimizations for landscape mode:

- **Reduced Vertical Padding** - More screen space for content
- **Compact Header** - Smaller header in landscape
- **Optimized Bottom Nav** - Better spacing for landscape mode

These are automatically applied via CSS media queries in `src/index.css`.

## How It Works

### Detection

The component uses two browser APIs:

1. **Window Size** - `window.innerWidth` and `window.innerHeight`
2. **Orientation Events** - Listens for `resize` and `orientationchange`

### Logic

```typescript
const isMobile = window.innerWidth < 768;
const isPortraitMode = window.innerHeight > window.innerWidth;
setIsPortrait(isMobile && isPortraitMode);
```

## Browser Support

- ✅ **iOS Safari** - Full support
- ✅ **Chrome Mobile** - Full support
- ✅ **Firefox Mobile** - Full support
- ✅ **Edge Mobile** - Full support
- ✅ **Samsung Internet** - Full support

## Notes

- **Cannot Force Landscape** - Browsers don't allow forcing orientation for UX/accessibility reasons
- **User Choice** - Always respect the user's preference if they dismiss the prompt
- **PWA Mode** - In PWA/fullscreen mode, you can request orientation lock via the Screen Orientation API, but it requires user interaction first

## Advanced: Screen Orientation API

If you want to try requesting orientation lock (only works in PWA/fullscreen mode):

```typescript
// Only works in fullscreen/PWA mode
const lockLandscape = async () => {
  try {
    await screen.orientation.lock('landscape');
  } catch (err) {
    console.log('Orientation lock not supported or failed');
  }
};
```

This requires:
- HTTPS
- Fullscreen mode or installed PWA
- User gesture (button click)
- Browser support
