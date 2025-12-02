# Testing Guide

Complete guide for testing Paws & Pedigrees.

## Table of Contents
1. [Setup](#setup)
2. [Testing Utilities](#testing-utilities)
3. [Unit Tests](#unit-tests)
4. [Component Tests](#component-tests)
5. [Integration Tests](#integration-tests)
6. [E2E Tests](#e2e-tests)
7. [Best Practices](#best-practices)

---

## Setup

### Install Testing Dependencies

```bash
npm install -D @testing-library/react @testing-library/jest-dom @testing-library/user-event
npm install -D vitest jsdom @vitest/ui
npm install -D @testing-library/react-hooks
```

### Configure Vitest

Create `vitest.config.ts`:

```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test/',
      ],
    },
  },
});
```

### Create Test Setup File

Create `src/test/setup.ts`:

```typescript
import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

afterEach(() => {
  cleanup();
});
```

### Add Test Scripts

Update `package.json`:

```json
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest --coverage"
  }
}
```

---

## Testing Utilities

Located in `src/utils/testUtils.tsx`.

### Mock Data Creation

```typescript
import { createMockDog, createMockUser, createMockBreed } from './utils/testUtils';

const dog = createMockDog({ name: 'Max', speed: 90 });
const user = createMockUser({ cash: 10000 });
const breed = createMockBreed({ name: 'Husky' });
```

### Random Test Data

```typescript
import { testDataGenerator } from './utils/testUtils';

const dogs = testDataGenerator.randomDogs(10);
const randomDog = testDataGenerator.randomDog();
```

### Time Mocking

```typescript
import { MockDate, advanceTime } from './utils/testUtils';

// Set specific date
MockDate.set('2024-01-15T10:00:00Z');

// Advance time by 1 hour
advanceTime(3600000);

// Reset
MockDate.reset();
```

### Dog Assertions

```typescript
import { dogAssertions } from './utils/testUtils';

expect(dogAssertions.isHealthy(dog)).toBe(true);
expect(dogAssertions.canTrain(dog)).toBe(true);
expect(dogAssertions.needsCare(dog)).toBe(false);
```

---

## Unit Tests

### Testing Utility Functions

Create `src/utils/__tests__/calculations.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { calculateDogAge, calculateTrainingCost } from '../calculations';
import { createMockDog } from '../testUtils';

describe('calculateDogAge', () => {
  it('calculates age correctly', () => {
    const dog = createMockDog({ age_weeks: 104 });
    const age = calculateDogAge(dog);
    expect(age.years).toBe(2);
    expect(age.weeks).toBe(0);
  });

  it('handles puppies', () => {
    const dog = createMockDog({ age_weeks: 8 });
    const age = calculateDogAge(dog);
    expect(age.years).toBe(0);
    expect(age.weeks).toBe(8);
  });
});

describe('calculateTrainingCost', () => {
  it('calculates cost based on level', () => {
    const dog = createMockDog({ bond_level: 5 });
    const cost = calculateTrainingCost(dog);
    expect(cost).toBeGreaterThan(0);
  });
});
```

### Testing Data Transformations

```typescript
import { describe, it, expect } from 'vitest';
import { sortDogs, filterDogs } from '../utils/memoizedSelectors';
import { testDataGenerator } from '../utils/testUtils';

describe('sortDogs', () => {
  it('sorts by name alphabetically', () => {
    const dogs = testDataGenerator.randomDogs(5);
    const sorted = sortDogs(dogs, 'name');
    expect(sorted[0].name <= sorted[1].name).toBe(true);
  });

  it('sorts by stats descending', () => {
    const dogs = testDataGenerator.randomDogs(5);
    const sorted = sortDogs(dogs, 'stats');
    // First dog should have highest stats
  });
});

describe('filterDogs', () => {
  it('filters by search term', () => {
    const dog1 = createMockDog({ name: 'Max' });
    const dog2 = createMockDog({ name: 'Bella' });
    const filtered = filterDogs([dog1, dog2], { searchTerm: 'Max' });
    expect(filtered).toHaveLength(1);
    expect(filtered[0].name).toBe('Max');
  });

  it('filters by minimum health', () => {
    const dog1 = createMockDog({ health: 90 });
    const dog2 = createMockDog({ health: 60 });
    const filtered = filterDogs([dog1, dog2], { minHealth: 80 });
    expect(filtered).toHaveLength(1);
    expect(filtered[0].health).toBe(90);
  });
});
```

---

## Component Tests

### Testing Simple Components

Create `src/components/__tests__/DogCard.test.tsx`:

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DogCard } from '../DogCard';
import { createMockDog } from '../../utils/testUtils';

describe('DogCard', () => {
  it('renders dog name', () => {
    const dog = createMockDog({ name: 'Max' });
    render(<DogCard dog={dog} />);
    expect(screen.getByText('Max')).toBeInTheDocument();
  });

  it('shows health status', () => {
    const dog = createMockDog({ health: 95 });
    render(<DogCard dog={dog} />);
    expect(screen.getByText(/95/)).toBeInTheDocument();
  });

  it('shows warning when health is low', () => {
    const dog = createMockDog({ health: 45 });
    render(<DogCard dog={dog} />);
    expect(screen.getByText(/low health/i)).toBeInTheDocument();
  });
});
```

### Testing User Interactions

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TrainingView } from '../TrainingView';
import { createMockDog } from '../../utils/testUtils';

describe('TrainingView', () => {
  it('calls onTrain when button clicked', async () => {
    const dog = createMockDog();
    const onTrain = vi.fn();
    const user = userEvent.setup();

    render(<TrainingView dog={dog} onTrain={onTrain} />);

    const button = screen.getByRole('button', { name: /train/i });
    await user.click(button);

    expect(onTrain).toHaveBeenCalledTimes(1);
  });

  it('disables button when TP is 0', () => {
    const dog = createMockDog({ training_points: 0 });
    render(<TrainingView dog={dog} onTrain={vi.fn()} />);

    const button = screen.getByRole('button', { name: /train/i });
    expect(button).toBeDisabled();
  });
});
```

### Testing Hooks

```typescript
import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDebounce } from '../../utils/performanceOptimizations';

describe('useDebounce', () => {
  it('debounces value changes', async () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 300),
      { initialProps: { value: 'initial' } }
    );

    expect(result.current).toBe('initial');

    // Change value
    rerender({ value: 'updated' });
    expect(result.current).toBe('initial'); // Still old value

    // Wait for debounce
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 350));
    });

    expect(result.current).toBe('updated');
  });
});
```

---

## Integration Tests

### Testing Store Integration

```typescript
import { describe, it, expect } from 'vitest';
import { useGameStore } from '../../stores/gameStore';
import { createMockDog, createMockUser } from '../../utils/testUtils';

describe('Game Store', () => {
  beforeEach(() => {
    // Reset store state
    useGameStore.setState({
      user: null,
      dogs: [],
      loading: false,
    });
  });

  it('adds dog to kennel', () => {
    const user = createMockUser();
    const dog = createMockDog();

    useGameStore.setState({ user, dogs: [] });

    // Add dog
    useGameStore.getState().addDog(dog);

    const state = useGameStore.getState();
    expect(state.dogs).toHaveLength(1);
    expect(state.dogs[0].id).toBe(dog.id);
  });

  it('updates dog stats', () => {
    const dog = createMockDog({ speed: 50 });
    useGameStore.setState({ dogs: [dog] });

    useGameStore.getState().updateDog(dog.id, { speed: 75 });

    const updatedDog = useGameStore.getState().dogs[0];
    expect(updatedDog.speed).toBe(75);
  });
});
```

### Testing Multiple Components Together

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { KennelView } from '../kennel/KennelView';
import { createMockDog, createMockUser } from '../../utils/testUtils';

describe('KennelView Integration', () => {
  it('displays all dogs and allows selection', async () => {
    const user = userEvent.setup();
    const dogs = [
      createMockDog({ id: '1', name: 'Max' }),
      createMockDog({ id: '2', name: 'Bella' }),
    ];

    render(<KennelView dogs={dogs} user={createMockUser()} />);

    // Check both dogs are displayed
    expect(screen.getByText('Max')).toBeInTheDocument();
    expect(screen.getByText('Bella')).toBeInTheDocument();

    // Select a dog
    await user.click(screen.getByText('Max'));

    // Check selection UI appears
    expect(screen.getByText(/selected/i)).toBeInTheDocument();
  });
});
```

---

## E2E Tests

### Using Playwright

Install:
```bash
npm install -D @playwright/test
```

Create `tests/e2e/kennel.spec.ts`:

```typescript
import { test, expect } from '@playwright/test';

test.describe('Kennel Management', () => {
  test('can view and interact with dogs', async ({ page }) => {
    await page.goto('/');

    // Login
    await page.fill('[data-testid="username"]', 'testuser');
    await page.fill('[data-testid="password"]', 'password');
    await page.click('[data-testid="login-button"]');

    // Navigate to kennel
    await page.click('[data-testid="kennel-link"]');

    // Check dogs are loaded
    await expect(page.locator('[data-testid="dog-card"]')).toHaveCount(3);

    // Feed a dog
    await page.click('[data-testid="dog-card"]:first-child');
    await page.click('[data-testid="feed-button"]');

    // Check hunger decreased
    await expect(page.locator('[data-testid="hunger-value"]')).toContainText('0');
  });
});
```

---

## Best Practices

### 1. Test Behavior, Not Implementation

✅ **Good:**
```typescript
it('shows error when health is low', () => {
  const dog = createMockDog({ health: 30 });
  render(<DogCard dog={dog} />);
  expect(screen.getByText(/low health/i)).toBeInTheDocument();
});
```

❌ **Bad:**
```typescript
it('sets showWarning state to true', () => {
  // Testing internal state instead of behavior
});
```

### 2. Use Data-TestId Sparingly

✅ **Good:**
```typescript
screen.getByRole('button', { name: /feed/i });
screen.getByLabelText('Dog name');
screen.getByText('Max');
```

❌ **Bad:**
```typescript
screen.getByTestId('feed-button-123');
```

### 3. Clean Up After Tests

```typescript
afterEach(() => {
  cleanup();
  jest.clearAllMocks();
});
```

### 4. Use Meaningful Test Names

✅ **Good:**
```typescript
it('disables training button when dog has no training points', () => {
  // ...
});
```

❌ **Bad:**
```typescript
it('test 1', () => {
  // ...
});
```

### 5. Test Edge Cases

```typescript
describe('DogAge', () => {
  it('handles newborn puppies', () => {
    // age_weeks: 0
  });

  it('handles very old dogs', () => {
    // age_weeks: 1000
  });

  it('handles negative weeks', () => {
    // age_weeks: -5 (should handle gracefully)
  });
});
```

### 6. Mock External Dependencies

```typescript
import { vi } from 'vitest';

vi.mock('../services/api', () => ({
  fetchDogs: vi.fn(() => Promise.resolve(mockDogs)),
}));
```

---

## Coverage Goals

Target coverage:
- **Statements**: 80%+
- **Branches**: 75%+
- **Functions**: 80%+
- **Lines**: 80%+

Check coverage:
```bash
npm run test:coverage
```

---

## Continuous Integration

### GitHub Actions

Create `.github/workflows/test.yml`:

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Run tests
        run: npm test

      - name: Coverage
        run: npm run test:coverage

      - name: Upload coverage
        uses: codecov/codecov-action@v3
```

---

## Running Tests

```bash
# Run all tests
npm test

# Run with UI
npm run test:ui

# Run with coverage
npm run test:coverage

# Run specific test file
npm test DogCard

# Run in watch mode
npm test -- --watch
```

---

## Debugging Tests

### Using console.log

```typescript
import { screen, debug } from '@testing-library/react';

// Debug entire DOM
debug();

// Debug specific element
debug(screen.getByRole('button'));
```

### Using VS Code Debugger

Add to `.vscode/launch.json`:

```json
{
  "type": "node",
  "request": "launch",
  "name": "Vitest",
  "runtimeExecutable": "npm",
  "runtimeArgs": ["test", "--", "--run"],
  "console": "integratedTerminal",
  "internalConsoleOptions": "neverOpen"
}
```

---

## Further Reading

- [Vitest Documentation](https://vitest.dev/)
- [Testing Library](https://testing-library.com/react)
- [Playwright](https://playwright.dev/)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
