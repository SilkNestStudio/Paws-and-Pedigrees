# Dog Image System Guide

## Overview
This system automatically loads dog images based on their genetics (coat color, pattern) and current state (pose). Images are loaded from the `/public/dog-images/` folder.

## Folder Structure

```
public/
└── dog-images/
    ├── golden-retriever/
    │   ├── golden_solid_sitting.png
    │   ├── golden_solid_standing.png
    │   ├── golden_solid_playing.png
    │   ├── cream_solid_sitting.png
    │   └── ...
    ├── dalmatian/
    │   ├── white_spotted_sitting.png
    │   ├── white_spotted_standing.png
    │   └── ...
    ├── german-shepherd/
    │   ├── black_tan_sitting.png
    │   ├── sable_solid_standing.png
    │   └── ...
    └── ...
```

## Naming Convention

**Format:** `{color}_{pattern}_{pose}.png`

### Color Names (lowercase, underscores)
- `black`
- `brown` / `chocolate`
- `white` / `cream`
- `golden` / `tan`
- `gray` / `silver`
- `red`
- `blue` (for blue/gray coats)
- `sable`
- `fawn`
- `brindle` (if it's a base color)

### Pattern Names (lowercase, underscores)
- `solid` - No pattern, single color
- `spotted` - Dalmatian-style spots
- `patched` - Large patches of color
- `brindle` - Striped pattern
- `merle` - Mottled pattern
- `tricolor` - Three distinct colors
- `bicolor` / `tan` - Two-tone (like German Shepherd black and tan)
- `saddled` - Saddle marking on back
- `tuxedo` - Black and white formal pattern
- `piebald` - Large white areas with colored patches

### Pose Names
- `sitting` - Default pose
- `standing` - Alert, energetic pose
- `playing` - Laying down, tired or playful

## Examples

### Golden Retriever
```
golden_solid_sitting.png     - Golden coat, no pattern, sitting
cream_solid_standing.png     - Cream coat, no pattern, standing
golden_solid_playing.png     - Golden coat, laying down
```

### Dalmatian
```
white_spotted_sitting.png    - White with black spots, sitting
white_spotted_standing.png   - White with black spots, standing
```

### German Shepherd
```
black_tan_sitting.png        - Black and tan bicolor, sitting
sable_solid_standing.png     - Sable coat, standing
```

### Beagle
```
tricolor_solid_sitting.png   - Classic beagle tricolor
lemon_patched_sitting.png    - Lemon and white patches
```

## Fallback System

The system tries to load images in this order:

1. **Exact match**: `{color}_{pattern}_{pose}.png`
   - Example: `golden_solid_sitting.png`

2. **Solid fallback**: `{color}_solid_{pose}.png`
   - If pattern doesn't match, tries solid version
   - Example: `golden_solid_sitting.png`

3. **Default**: `default_{pose}.png`
   - Generic image for the breed
   - Example: `default_sitting.png`

4. **Placeholder**: Gray box with "Dog Image" text
   - Used if no images exist for the breed

## Quick Start Guide

### For Each Breed, Create:

**Minimum (3 images):**
- `default_sitting.png`
- `default_standing.png`
- `default_playing.png`

**Recommended (15 images - 5 colors × 3 poses):**
- Black solid (sitting, standing, playing)
- Brown solid (sitting, standing, playing)
- White solid (sitting, standing, playing)
- Golden solid (sitting, standing, playing)
- Gray solid (sitting, standing, playing)

**Full Coverage (varies by breed):**
- All natural color variations for the breed
- All pattern variations
- All 3 poses for each combination

## Breeds and Their Common Colors

### Golden Retriever
- Golden solid
- Cream solid
- Red solid

### Dalmatian
- White spotted (black spots)
- White spotted (liver spots)

### German Shepherd
- Black tan
- Sable solid
- Black solid

### Beagle
- Tricolor solid
- Lemon patched
- Red white

### Labrador Retriever
- Black solid
- Yellow solid
- Chocolate solid

### Husky
- Black white
- Gray white
- Red white
- Agouti solid

### Border Collie
- Black white
- Red white
- Blue merle
- Red merle

### Boxer
- Fawn solid
- Brindle solid
- White patched

### Poodle
- Black solid
- White solid
- Brown solid
- Apricot solid
- Gray solid

## Tips for Creating Images

1. **Consistent size**: All images should be the same dimensions (recommended: 512x512px or 1024x1024px)

2. **Transparent background**: Use PNG with transparency for better compositing

3. **Centered subject**: Dog should be centered in the frame

4. **Similar perspective**: All poses should be from roughly the same angle/distance

5. **File size**: Optimize images to keep them under 200KB each (use tools like TinyPNG)

6. **Batch naming**: Use a script or bulk rename tool to name files consistently

## Automation Ideas

### Using AI Image Generation
1. Generate base images with AI (Midjourney, DALL-E, Stable Diffusion)
2. Prompt template: "{breed_name} dog, {color} coat, {pattern} pattern, {pose} pose, white background, professional photo"
3. Batch generate all variations
4. Use Photoshop or GIMP to remove backgrounds
5. Bulk rename using naming convention

### Using Photoshop/GIMP
1. Create base grayscale images
2. Use color adjustment layers for variations
3. Use layer masks for patterns
4. Batch export with naming script

### Using Code
- Can create a script to apply color filters to base images
- SVG images can be dynamically colored
- CSS filters can tint grayscale images

## Current Breeds (20 Total)

### Existing (6):
1. Labrador Mix (rescue)
2. Terrier Mix (rescue)
3. Hound Mix (rescue)
4. Pit Bull Mix (rescue)
5. Chihuahua Mix (rescue)
6. Shepherd Mix (rescue)

### New Additions (14):
7. Labrador Retriever (common)
8. Beagle (common)
9. Poodle (common)
10. Dachshund (common)
11. Cocker Spaniel (common)
12. Siberian Husky (uncommon)
13. Australian Shepherd (uncommon)
14. Boxer (uncommon)
15. Doberman (uncommon)
16. German Shepherd (rare)
17. Golden Retriever (rare)
18. Border Collie (rare)
19. Samoyed (exotic)
20. Akita (exotic)
