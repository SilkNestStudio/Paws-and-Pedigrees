# Time Scaling & Dog Aging System

## Current Issues
- No clear time scale for dog aging
- Breeding cooldowns use real-time (14 weeks = 14 real weeks)
- Dogs don't age realistically

## Design Options for Time Scaling

### Option 1: Real-Time (Current System)
**Scale:** 1 real day = 1 game day
- Pros: Simple, no calculations needed
- Cons: Way too slow for a game, dogs would take years to age

### Option 2: Accelerated Days
**Scale:** 1 real day = 1 game week
- Dog lifespan: ~10-15 years = ~520-780 real days (1.4-2.1 years)
- Breeding cooldown: 8-12 weeks = 8-12 real days
- Pregnancy: 9 weeks = 9 real days
- Pros: Realistic progression, meaningful time passing
- Cons: Still quite slow

### Option 3: Fast-Paced Game Time (RECOMMENDED)
**Scale:** 1 real hour = 1 game week
- Dog lifespan: ~10-15 years = ~520-780 hours (21-32 real days)
- Breeding cooldown: 8-12 weeks = 8-12 real hours
- Pregnancy: 9 weeks = 9 real hours
- Puppy to adult: 1 year = ~52 hours (~2 real days)

**Pros:**
- Fast enough to keep players engaged
- Can raise multiple generations without waiting months
- Breeding feels rewarding but not instant
- Natural daily play loop

**Cons:**
- Requires active checking or notifications
- Dogs age even when offline (needs careful balance)

### Option 4: Hybrid System (Alternative Recommendation)
**Scale:** Real time when active, paused when offline
- 1 real hour = 1 game week (ONLY while playing)
- Time freezes when player logs out
- Breeding/aging only progresses during active sessions

**Pros:**
- No offline disadvantage
- Players can take breaks without losing dogs
- Very player-friendly

**Cons:**
- Requires tracking active time
- May feel less immersive

## Recommended Implementation

**Use Option 3 (Fast-Paced) with these rules:**

### Aging System
```typescript
// 1 real hour = 1 game week
const WEEK_DURATION_MS = 60 * 60 * 1000; // 1 hour

Dog Ages:
- Puppy (0-52 weeks): 0-52 real hours (~2 days)
- Adult (1-7 years): 52-364 real hours (~2-15 days)
- Senior (7+ years): 364+ real hours (15+ days)
- Max lifespan: 10-15 years (420-780 hours / 17.5-32.5 days)
```

### Breeding Cooldowns
```typescript
Breeding:
- Pregnancy: 9 weeks = 9 real hours
- Recovery (before next breeding): 8 weeks = 8 real hours
- Total breeding cycle: 17 weeks = 17 real hours

This means:
- 1 litter per 17 hours
- ~1.4 litters per day (if you're actively playing)
- Multiple generations possible in a week
```

### Energy/Care System
```typescript
Care Needs (separate from aging):
- Hunger/Thirst decay: 1% per hour
- Full to empty: ~4 real days without care
- This is SLOWER than aging to give players time

Daily Care Loop:
- Check in 2-3 times per day
- Feed, water, play
- Age progresses slowly in background
```

## Implementation Steps

1. **Add age tracking to dogs**
   ```typescript
   interface Dog {
     birth_date: string;
     age_weeks: number; // Calculated from birth_date
     life_stage: 'puppy' | 'adult' | 'senior';
   }
   ```

2. **Update age on load/check-in**
   ```typescript
   function updateDogAge(dog: Dog) {
     const now = Date.now();
     const birth = new Date(dog.birth_date).getTime();
     const hoursPassed = (now - birth) / (1000 * 60 * 60);
     const weeksOld = Math.floor(hoursPassed); // 1 hour = 1 week

     return {
       age_weeks: weeksOld,
       age_years: Math.floor(weeksOld / 52),
       life_stage: getLifeStage(weeksOld)
     };
   }
   ```

3. **Natural death system**
   ```typescript
   // Dogs die naturally at 10-15 years
   // That's 520-780 real hours (21-32 days)
   // Add warning when dog reaches 9 years (old age)
   ```

4. **Visual aging indicators**
   - Puppies: Smaller sprite, playful animations
   - Adults: Normal size, full stats
   - Seniors: Gray muzzle, slower animations, stat decline

## Balancing Notes

**This creates a natural play loop:**
- **Day 1-2:** Puppy grows to adult
- **Day 3-15:** Prime breeding/competition age
- **Day 16-30:** Senior years, reduced breeding
- **Day 30+:** Natural death (if you don't retire them)

**Players can:**
- Raise a champion: ~2 weeks from puppy to peak
- Build a breeding line: Multiple generations per month
- Compete regularly: Dogs stay competitive for 2+ weeks
- Not feel rushed: Care needs are slower than aging

## Future Enhancements

1. **Retirement System**
   - Retire dogs before natural death
   - Keep them as "retired" (non-functional but visible)
   - Hall of Fame for legendary dogs

2. **Time Dilation Items**
   - "Puppy Training Boost" - speeds up puppy growth
   - "Age Slower Elixir" - extends prime years
   - Premium feature for competitive players

3. **Offline Protection**
   - First 24 hours offline: Time paused
   - After 24 hours: Slow aging (50% speed)
   - Prevents losing dogs due to vacation

## Current System Status

Right now:
- ❌ No aging system implemented
- ❌ Breeding uses placeholder "weeks"
- ❌ Time scale undefined

Need to implement:
- ✅ Define time scale (recommended: 1 hour = 1 week)
- ✅ Add age calculation to dogs
- ✅ Update breeding cooldowns to real time
- ✅ Add puppy growth system
- ✅ Add senior dog mechanics
- ✅ Add natural death/retirement
