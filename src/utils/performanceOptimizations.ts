/**
 * Performance Optimization Utilities
 *
 * This file contains utilities and helpers for optimizing React performance
 */

import { useEffect, useRef, useState, useCallback, DependencyList } from 'react';

/**
 * Debounce hook - delays execution until user stops typing/interacting
 * Useful for search inputs, auto-save, etc.
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Throttle hook - limits how often a function can be called
 * Useful for scroll handlers, resize handlers, etc.
 */
export function useThrottle<T>(value: T, interval: number): T {
  const [throttledValue, setThrottledValue] = useState<T>(value);
  const lastUpdated = useRef<number>(Date.now());

  useEffect(() => {
    const now = Date.now();
    const timeSinceLastUpdate = now - lastUpdated.current;

    if (timeSinceLastUpdate >= interval) {
      lastUpdated.current = now;
      setThrottledValue(value);
    } else {
      const timer = setTimeout(() => {
        lastUpdated.current = Date.now();
        setThrottledValue(value);
      }, interval - timeSinceLastUpdate);

      return () => clearTimeout(timer);
    }
  }, [value, interval]);

  return throttledValue;
}

/**
 * Previous value hook - returns the previous value of a variable
 * Useful for comparing old vs new values
 */
export function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T>();

  useEffect(() => {
    ref.current = value;
  }, [value]);

  return ref.current;
}

/**
 * Intersection Observer hook for lazy loading
 * Returns true when element is visible in viewport
 */
export function useIntersectionObserver(
  ref: React.RefObject<Element>,
  options?: IntersectionObserverInit
): boolean {
  const [isIntersecting, setIsIntersecting] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(([entry]) => {
      setIsIntersecting(entry.isIntersecting);
    }, options);

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [ref, options]);

  return isIntersecting;
}

/**
 * Update effect - like useEffect but skips initial mount
 * Only runs on updates, not on mount
 */
export function useUpdateEffect(effect: () => void | (() => void), deps: DependencyList) {
  const isInitialMount = useRef(true);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
    } else {
      return effect();
    }
  }, deps);
}

/**
 * Optimized callback that returns stable reference until dependencies change
 * Better than useCallback for frequently changing values
 */
export function useEventCallback<T extends (...args: any[]) => any>(fn: T): T {
  const ref = useRef<T>(fn);

  useEffect(() => {
    ref.current = fn;
  });

  return useCallback((...args: any[]) => ref.current(...args), []) as T;
}

/**
 * Local storage hook with caching for better performance
 */
export function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T) => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  const setValue = useCallback((value: T) => {
    try {
      setStoredValue(value);
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error(`Error setting localStorage key "${key}":`, error);
    }
  }, [key]);

  return [storedValue, setValue];
}

/**
 * Measure component render performance
 * Only use in development for debugging
 */
export function useRenderCount(componentName: string) {
  const renderCount = useRef(0);

  useEffect(() => {
    renderCount.current += 1;
    if (process.env.NODE_ENV === 'development') {
      console.log(`${componentName} rendered ${renderCount.current} times`);
    }
  });

  return renderCount.current;
}

/**
 * Memoize expensive calculations
 * Better ergonomics than useMemo
 */
export function useMemoized<T>(factory: () => T, deps: DependencyList): T {
  const ref = useRef<{ value: T; deps: DependencyList }>();

  if (!ref.current || !shallowEqual(ref.current.deps, deps)) {
    ref.current = { value: factory(), deps };
  }

  return ref.current.value;
}

/**
 * Shallow equality check for arrays
 */
function shallowEqual(a: DependencyList, b: DependencyList): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

/**
 * Virtual scrolling helper for large lists
 * Returns visible items based on scroll position
 */
export function useVirtualScroll<T>(
  items: T[],
  itemHeight: number,
  containerHeight: number,
  overscan: number = 3
) {
  const [scrollTop, setScrollTop] = useState(0);

  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const endIndex = Math.min(
    items.length,
    Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
  );

  const visibleItems = items.slice(startIndex, endIndex);
  const offsetY = startIndex * itemHeight;
  const totalHeight = items.length * itemHeight;

  const onScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  return {
    visibleItems,
    offsetY,
    totalHeight,
    onScroll,
    startIndex,
    endIndex,
  };
}

/**
 * Batch state updates for better performance
 * Useful when you need to update multiple state values at once
 */
export function useBatchedUpdates() {
  const [, forceUpdate] = useState({});
  const updates = useRef<(() => void)[]>([]);
  const scheduled = useRef(false);

  const flush = useCallback(() => {
    const updatesToRun = updates.current;
    updates.current = [];
    scheduled.current = false;
    updatesToRun.forEach(update => update());
    forceUpdate({});
  }, []);

  const batch = useCallback((update: () => void) => {
    updates.current.push(update);
    if (!scheduled.current) {
      scheduled.current = true;
      requestAnimationFrame(flush);
    }
  }, [flush]);

  return batch;
}
