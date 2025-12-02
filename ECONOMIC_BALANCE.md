# Economic Balance Analysis - Paws & Pedigrees

## Current Economy Overview

### Income Sources

#### 1. Jobs (Passive Income)
| Level | Job | Base Pay | Duration | Daily Limit | Max Daily Income |
|-------|-----|----------|----------|-------------|------------------|
| 1 | Dog Walking | $20 | 5s | 10 | $200 |
| 1 | Kennel Cleaning | $50 | 2s | 5 | $250 |
| 3 | Pet Sitting | $40 | 8s | 8 | $320 |
| 5 | Basic Obedience | $60 | 7s | 6 | $360 |
| 7 | Dog Photography | $80 | 6s | 5 | $400 |
| 10 | Grooming | $90 | 5s | 5 | $450 |
| 12 | Vet Assistant | $110 | 10s | 4 | $440 |
| 15 | Advanced Training | $140 | 12s | 4 | $560 |
| 18 | Breeding Consultant | $180 | 15s | 3 | $540 |
| 20 | Kennel Inspector | $220 | 20s | 3 | $660 |
| 25 | Show Judge | $300 | 25s | 2 | $600 |

**Early Game (Lv 1-5):** $250-$360/day
**Mid Game (Lv 10-15):** $450-$560/day
**Late Game (Lv 20-25):** $600-$660/day

#### 2. Competitions
| Tier | Entry Fee | 1st Place | 2nd Place | 3rd Place | Participation | Net Profit (1st) |
|------|-----------|-----------|-----------|-----------|---------------|------------------|
| Local | $25 | $150 | $75 | $40 | $10 | $125 |
| Regional | $100 | $750 | $400 | $200 | $50 | $650 |
| National | $500 | $5000 | $2500 | $1000 | $250 | $4500 |

**Issues:**
- Local entry ($25) is 12.5% of daily income at level 1
- Regional entry ($100) requires 2-3 jobs worth of income
- Participation rewards don't cover entry fees

#### 3. Breeding & Puppy Sales
- Breeding Cost: $500
- Litter Size: 3-7 puppies
- Puppy Base Price: $500
- Bonus: +$10 per stat point above 50 average

**Average Puppy Sale:**
- Low stats (40-50 avg): $500
- Medium stats (60 avg): $600
- Good stats (70 avg): $700
- Excellent stats (80 avg): $800
- Elite stats (90 avg): $900

**ROI on Breeding:**
- Minimum litter (3 puppies @ $500 each): $1500 - $500 = $1000 profit
- Average litter (5 puppies @ $600 each): $3000 - $500 = $2500 profit
- Best case (7 puppies @ $900 each): $6300 - $500 = $5800 profit

### Expense Breakdown

#### 1. Fixed Costs
- Breeding Fee: $500 per litter
- Competition Entry: $25-$500 per event

#### 2. Care Costs
- Food: Consumed based on dog size
- Items: Various (toys, treats, health items)

## Balance Issues Identified

### 1. Early Game Economy
**Problem:** New players start with limited income
- Level 1 jobs only earn $200-$250/day
- Breeding costs $500 (2 days of grinding)
- Local competition entry $25 (10% of daily income)

**Solution:**
- Increase starting cash from current to $1000
- Reduce local competition entry to $15
- Add daily login rewards ($50-$100)

### 2. Mid Game Progression
**Problem:** Not enough spending options
- Players accumulate cash too quickly
- No money sinks besides breeding

**Solution:**
- Add kennel upgrades (already exists)
- Add premium items
- Add training equipment purchases

### 3. Late Game Economy
**Problem:** Money becomes meaningless
- Daily job income: $600-$660
- Single national win: $5000
- Top breeders earn $2000-$6000 per litter

**Solution:**
- Add expensive end-game goals (legendary breeds, facilities)
- Add recurring costs (food storage upgrades, premium features)

## Recommended Adjustments

### Competition Prize Adjustments
```typescript
// BEFORE → AFTER
Local:
  Entry: $25 → $15
  1st: $150 → $200
  2nd: $75 → $100
  3rd: $40 → $50
  Participation: $10 → $15

Regional:
  Entry: $100 → $75
  1st: $750 → $1000
  2nd: $400 → $500
  3rd: $200 → $250
  Participation: $50 → $75

National:
  Entry: $500 → $400
  1st: $5000 → $6000
  2nd: $2500 → $3000
  3rd: $1000 → $1500
  Participation: $250 → $400
```

### Job Reward Adjustments
```typescript
// Increase early game job payouts by 50%
Dog Walking: $20 → $30
Kennel Cleaning: $50 → $75
Pet Sitting: $40 → $60
Basic Obedience: $60 → $90
```

### Breeding Cost Adjustment
```typescript
// Reduce early barrier to breeding
Breeding Fee: $500 → $350
```

### Puppy Price Adjustment
```typescript
// Increase value of well-bred puppies
Base Price: $500 → $600
Price per stat point: $10 → $15
```

## Expected Impact

### Early Game (Level 1-5)
- **Before:** $250-$360/day, 2-3 days to afford breeding
- **After:** $375-$540/day, 1 day to afford breeding
- Faster progression, less grinding

### Mid Game (Level 10-15)
- **Before:** Limited spending options
- **After:** More competitive rewards, better breeding ROI
- Maintains engagement

### Late Game (Level 20+)
- **Before:** Money accumulates too fast
- **After:** Higher stakes competitions, premium breeding programs
- Retains challenge

## Gem Economy (Premium Currency)

### Current Usage
- Skip pregnancy: 10 gems/week
- Premium items: Varies

### Recommendations
- Add gem bundle purchases
- Add exclusive gem-only items
- Add cosmetic purchases (kennel decorations, dog accessories)
- Keep game playable without gems (not pay-to-win)

## Conclusion

These adjustments create a more balanced progression curve:
1. **Early game:** More accessible, less grindy
2. **Mid game:** Better rewards for skill/effort
3. **Late game:** Maintains challenge and goals

The economy should reward:
- Consistent play (daily jobs)
- Skill (competition wins)
- Strategy (smart breeding)
- Dedication (achievements, long-term goals)
