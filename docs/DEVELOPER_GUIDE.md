# Developer Guide

Complete guide for developers working on Paws & Pedigrees.

## Table of Contents
1. [Getting Started](#getting-started)
2. [Project Structure](#project-structure)
3. [Architecture](#architecture)
4. [Development Workflow](#development-workflow)
5. [Code Style](#code-style)
6. [Common Tasks](#common-tasks)
7. [Troubleshooting](#troubleshooting)

---

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Git
- VS Code (recommended)

### Initial Setup

```bash
# Clone repository
git clone https://github.com/your-repo/paws-and-pedigrees.git
cd paws-and-pedigrees

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your Supabase credentials

# Run database migrations
npm run migrate

# Start development server
npm run dev
```

### VS Code Extensions (Recommended)

- ESLint
- Prettier
- TypeScript and JavaScript Language Features
- Tailwind CSS IntelliSense
- GitLens

---

## Project Structure

```
paws-and-pedigrees/
├── src/
│   ├── components/          # React components
│   │   ├── common/          # Reusable UI components
│   │   ├── dogs/            # Dog-related components
│   │   ├── kennel/          # Kennel management
│   │   ├── training/        # Training features
│   │   ├── competitions/    # Competition system
│   │   ├── breeding/        # Breeding features
│   │   ├── shop/            # Shop and inventory
│   │   ├── achievements/    # Achievement system
│   │   ├── weather/         # Weather system
│   │   ├── specialization/  # Dog specializations
│   │   ├── tournaments/     # Tournament system
│   │   ├── staff/           # Staff management
│   │   └── certifications/  # Certification system
│   ├── stores/              # Zustand state management
│   │   ├── gameStore.ts     # Main game state
│   │   └── uiStore.ts       # UI state (modals, toasts)
│   ├── types/               # TypeScript type definitions
│   │   ├── index.ts         # Core types (Dog, User, Breed)
│   │   ├── genetics.ts      # Genetics system
│   │   ├── personality.ts   # Personality traits
│   │   ├── achievements.ts  # Achievements
│   │   ├── weather.ts       # Weather/seasons
│   │   ├── specialization.ts # Specializations
│   │   ├── tournament.ts    # Tournaments
│   │   ├── staff.ts         # Staff system
│   │   └── certifications.ts # Certifications
│   ├── data/                # Static game data
│   │   ├── breeds.ts        # Breed definitions
│   │   ├── items.ts         # Shop items
│   │   ├── jobTypes.ts      # Job definitions
│   │   ├── breedingConstants.ts # Breeding rules
│   │   ├── competitionTypes.ts  # Competition types
│   │   ├── achievements.ts  # Achievement definitions
│   │   ├── weatherData.ts   # Weather/season data
│   │   ├── specializations.ts # Specialization data
│   │   ├── tournaments.ts   # Tournament schedules
│   │   ├── staffTemplates.ts # Staff templates
│   │   └── certifications.ts # Certification data
│   ├── utils/               # Utility functions
│   │   ├── calculations.ts  # Game calculations
│   │   ├── dateHelpers.ts   # Date utilities
│   │   ├── breedingLogic.ts # Breeding calculations
│   │   ├── trainingCalculations.ts # Training logic
│   │   ├── competitionCalculations.ts # Competition scoring
│   │   ├── weatherSystem.ts # Weather logic
│   │   ├── performanceOptimizations.ts # Performance hooks
│   │   ├── memoizedSelectors.ts # Memoized calculations
│   │   ├── performanceMonitor.ts # Performance monitoring
│   │   └── testUtils.tsx    # Testing utilities
│   ├── services/            # API and external services
│   │   ├── supabase.ts      # Supabase client
│   │   └── api.ts           # API calls
│   ├── hooks/               # Custom React hooks
│   ├── styles/              # Global styles
│   ├── App.tsx              # Main app component
│   └── main.tsx             # Entry point
├── supabase/
│   └── migrations/          # Database migrations
├── docs/                    # Documentation
│   ├── DEVELOPER_GUIDE.md   # This file
│   ├── TESTING_GUIDE.md     # Testing documentation
│   ├── PERFORMANCE_GUIDE.md # Performance optimization
│   └── API.md               # API documentation
├── public/                  # Static assets
├── .env.example             # Environment template
├── package.json             # Dependencies
├── tsconfig.json            # TypeScript config
├── vite.config.ts           # Vite configuration
└── README.md                # Project README
```

---

## Architecture

### State Management

We use **Zustand** for state management:

```typescript
// stores/gameStore.ts
import create from 'zustand';

interface GameState {
  user: UserProfile | null;
  dogs: Dog[];
  loading: boolean;

  // Actions
  setUser: (user: UserProfile) => void;
  addDog: (dog: Dog) => void;
  updateDog: (id: string, updates: Partial<Dog>) => void;
}

export const useGameStore = create<GameState>((set) => ({
  user: null,
  dogs: [],
  loading: false,

  setUser: (user) => set({ user }),
  addDog: (dog) => set((state) => ({ dogs: [...state.dogs, dog] })),
  updateDog: (id, updates) => set((state) => ({
    dogs: state.dogs.map(d => d.id === id ? { ...d, ...updates } : d)
  })),
}));
```

### Data Flow

```
User Action → Component → Store Action → API Call → Store Update → Component Re-render
```

### Component Patterns

1. **Container Components** - Handle logic and state
2. **Presentational Components** - Pure UI, receive props
3. **Custom Hooks** - Reusable logic

Example:

```typescript
// Container
function DogDetailsContainer({ dogId }: { dogId: string }) {
  const dog = useGameStore(state => state.dogs.find(d => d.id === dogId));
  const updateDog = useGameStore(state => state.updateDog);

  const handleFeed = () => {
    updateDog(dogId, { hunger: 0 });
  };

  return <DogDetailsView dog={dog} onFeed={handleFeed} />;
}

// Presentational
function DogDetailsView({ dog, onFeed }: Props) {
  return (
    <div>
      <h2>{dog.name}</h2>
      <button onClick={onFeed}>Feed</button>
    </div>
  );
}
```

---

## Development Workflow

### Branch Strategy

- `main` - Production-ready code
- `develop` - Integration branch
- `feature/*` - New features
- `bugfix/*` - Bug fixes
- `hotfix/*` - Urgent production fixes

### Making Changes

1. **Create Branch**
   ```bash
   git checkout -b feature/add-new-feature
   ```

2. **Make Changes**
   - Write code
   - Add tests
   - Update documentation

3. **Test**
   ```bash
   npm test
   npm run test:coverage
   ```

4. **Lint**
   ```bash
   npm run lint
   npm run lint:fix
   ```

5. **Commit**
   ```bash
   git add .
   git commit -m "feat: add new feature"
   ```

   Commit message format:
   - `feat:` - New feature
   - `fix:` - Bug fix
   - `docs:` - Documentation
   - `style:` - Code style (formatting)
   - `refactor:` - Code refactoring
   - `test:` - Tests
   - `chore:` - Build/config changes

6. **Push & PR**
   ```bash
   git push origin feature/add-new-feature
   ```
   Then create Pull Request on GitHub

---

## Code Style

### TypeScript

```typescript
// ✅ Good
interface Dog {
  id: string;
  name: string;
  age: number;
}

function feedDog(dog: Dog): Dog {
  return { ...dog, hunger: 0 };
}

// ❌ Bad
function feedDog(dog: any) {
  dog.hunger = 0;
  return dog;
}
```

### React Components

```typescript
// ✅ Good
interface DogCardProps {
  dog: Dog;
  onSelect?: (dog: Dog) => void;
}

export const DogCard: React.FC<DogCardProps> = ({ dog, onSelect }) => {
  return (
    <div onClick={() => onSelect?.(dog)}>
      <h3>{dog.name}</h3>
    </div>
  );
};

// ❌ Bad
export function DogCard(props) {
  return <div>{props.dog.name}</div>;
}
```

### Naming Conventions

- **Components**: PascalCase (`DogCard`, `TrainingView`)
- **Files**: PascalCase for components, camelCase for utilities
- **Functions**: camelCase (`calculateAge`, `feedDog`)
- **Constants**: UPPER_SNAKE_CASE (`MAX_DOGS`, `DEFAULT_HEALTH`)
- **Types/Interfaces**: PascalCase (`Dog`, `UserProfile`)

### File Organization

```typescript
// 1. Imports (external first, then internal)
import React, { useState, useEffect } from 'react';
import { Dog } from '../../types';
import { useGameStore } from '../../stores/gameStore';

// 2. Types/Interfaces
interface Props {
  dog: Dog;
}

// 3. Constants
const MAX_HUNGER = 100;

// 4. Component
export const DogCard: React.FC<Props> = ({ dog }) => {
  // Hooks
  const [selected, setSelected] = useState(false);

  // Effects
  useEffect(() => {
    // ...
  }, []);

  // Handlers
  const handleClick = () => {
    setSelected(!selected);
  };

  // Render
  return <div onClick={handleClick}>{dog.name}</div>;
};
```

---

## Common Tasks

### Adding a New Dog Breed

1. **Add to types** (`src/types/index.ts`):
   ```typescript
   // Already defined in Breed interface
   ```

2. **Add breed data** (`src/data/breeds.ts`):
   ```typescript
   {
     id: 50,
     name: 'New Breed',
     tier: 'common',
     unlock_level: 1,
     // ... stats
   }
   ```

3. **Add images** to `public/images/breeds/`

4. **Test**:
   ```typescript
   // Create test dog with new breed
   const dog = createMockDog({ breed_id: 50 });
   ```

### Adding a New Achievement

1. **Define achievement** (`src/data/achievements.ts`):
   ```typescript
   {
     id: 'new_achievement',
     name: 'Achievement Name',
     description: '...',
     requirement: { type: 'dogs_owned', value: 10 },
     reward: { cash: 1000, gems: 10 }
   }
   ```

2. **Add check logic** (`src/utils/achievementLogic.ts`):
   ```typescript
   export function checkAchievement(user: UserProfile, dogs: Dog[]) {
     // Check logic
   }
   ```

3. **Test**:
   ```typescript
   const earned = checkAchievement(mockUser, mockDogs);
   expect(earned).toBe(true);
   ```

### Adding a New Component

1. **Create file**: `src/components/category/ComponentName.tsx`

2. **Write component**:
   ```typescript
   import React from 'react';

   interface ComponentNameProps {
     // Props
   }

   export const ComponentName: React.FC<ComponentNameProps> = ({ ... }) => {
     return <div>...</div>;
   };
   ```

3. **Add tests**: `src/components/category/__tests__/ComponentName.test.tsx`

4. **Export**: Add to `index.ts` if needed

### Database Migrations

1. **Create migration file**: `supabase/migrations/YYYYMMDDHHMMSS_description.sql`

2. **Write SQL**:
   ```sql
   ALTER TABLE dogs
   ADD COLUMN new_field INTEGER DEFAULT 0;
   ```

3. **Apply migration**:
   ```bash
   supabase db push
   ```

4. **Update types** to match new schema

---

## Troubleshooting

### Common Issues

#### TypeScript Errors

```bash
# Clear TypeScript cache
rm -rf node_modules/.cache
npm run build
```

#### Supabase Connection Issues

```bash
# Check .env file
cat .env

# Test connection
supabase status
```

#### Build Errors

```bash
# Clear build cache
rm -rf dist
npm run build
```

#### Hot Reload Not Working

```bash
# Restart dev server
# Kill process and run again
npm run dev
```

### Getting Help

1. Check documentation in `docs/`
2. Search existing issues on GitHub
3. Ask in team chat
4. Create new issue with:
   - Description
   - Steps to reproduce
   - Expected vs actual behavior
   - Screenshots if applicable

---

## Performance Best Practices

1. **Use memoization** for expensive calculations
2. **Lazy load** components and routes
3. **Virtual scrolling** for long lists
4. **Debounce** input handlers
5. **Optimize images** (WebP, proper sizing)
6. **Code split** by route
7. **Monitor** performance in DevTools

See [PERFORMANCE_GUIDE.md](./PERFORMANCE_GUIDE.md) for details.

---

## Testing Guidelines

1. Write tests for:
   - All new features
   - Bug fixes
   - Critical paths
   - Edge cases

2. Maintain coverage above 80%

3. Use meaningful test names

4. Mock external dependencies

See [TESTING_GUIDE.md](./TESTING_GUIDE.md) for details.

---

## Resources

- [React Documentation](https://react.dev)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Zustand Documentation](https://github.com/pmndrs/zustand)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Vite Guide](https://vitejs.dev/guide/)

---

## Contributing

See [CONTRIBUTING.md](../CONTRIBUTING.md) for contribution guidelines.
