# Kennel Level Background Images

This document explains how to add custom background images for each kennel level.

## Current Status

The dynamic background loading system is **implemented and ready**. Currently, all kennel levels use the generic `kennel-background.png` as a fallback until you add level-specific images.

## How It Works

- The game automatically tries to load level-specific backgrounds based on the user's kennel level
- If a level-specific background doesn't exist, it falls back to the generic kennel background
- Backgrounds are used for: Kennel view, Dog Detail view, and Breeding view
- Background changes are smooth with a 500ms transition effect

## Adding Level-Specific Backgrounds

### Folder Structure

Create the following folder structure in your `public` folder:

```
public/
└── assets/
    └── kennel/
        ├── level1/
        │   └── background.jpg
        ├── level2/
        │   └── background.jpg
        ├── level3/
        │   └── background.jpg
        ├── level4/
        │   └── background.jpg
        ├── level5/
        │   └── background.jpg
        ├── level6/
        │   └── background.jpg
        ├── level7/
        │   └── background.jpg
        ├── level8/
        │   └── background.jpg
        ├── level9/
        │   └── background.jpg
        └── level10/
            └── background.jpg
```

### Image Specifications

- **Format**: JPG or PNG
- **Recommended Size**: 1920x1080 or larger
- **Aspect Ratio**: 16:9 works best
- **File Name**: Must be named `background.jpg` (or `.png`)

### Kennel Level Themes

Here are the kennel levels and their themes for design reference:

1. **Starter Kennel** - A humble beginning for your dog breeding journey
2. **Backyard Kennel** - Expanded space with basic improvements
3. **Small Facility** - Professional-grade kennels with better amenities
4. **Growing Operation** - Multiple kennels with dedicated training areas
5. **Professional Kennel** - Top-tier facilities with automated systems
6. **Champion's Estate** - Luxurious facility for breeding champions
7. **Elite Breeding Center** - State-of-the-art breeding and training complex
8. **Grand Championship Facility** - World-class facility with kennel assistants
9. **Legendary Complex** - Premium facility rivaling the best in the world
10. **Ultimate Dynasty** - The pinnacle of dog breeding excellence

### Testing Your Backgrounds

1. Place your images in the correct folders
2. Refresh your browser (hard refresh: Ctrl+F5)
3. Use the Admin Panel to change your kennel level
4. Navigate to the Kennel view to see the background change
5. Upgrade your kennel to see the smooth transition

### Technical Details

- The system uses the `getKennelBackground()` function from `src/utils/kennelUpgrades.ts`
- Background paths are defined in the `KENNEL_LEVELS` constant
- The `SceneBackground` component handles loading and fallback logic
- If an image fails to load, it gracefully falls back to the generic background

## Quick Start Checklist

- [ ] Create `public/assets/kennel/` folder structure
- [ ] Design 10 background images (one for each level)
- [ ] Name each file `background.jpg`
- [ ] Place in respective level folders (level1/, level2/, etc.)
- [ ] Test by upgrading kennel levels in-game

## Need Help?

If backgrounds aren't loading:
1. Check the browser console for errors
2. Verify file paths match exactly: `/assets/kennel/levelX/background.jpg`
3. Ensure images are in the `public` folder (not `src`)
4. Try a hard refresh (Ctrl+F5)
