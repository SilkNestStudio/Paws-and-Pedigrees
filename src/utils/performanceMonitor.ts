/**
 * Performance Monitoring Utilities
 *
 * Use these utilities to monitor and debug performance in development
 */

/**
 * Measure execution time of a function
 */
export function measurePerformance<T>(
  name: string,
  fn: () => T,
  logResults: boolean = true
): T {
  const start = performance.now();
  const result = fn();
  const end = performance.now();
  const duration = end - start;

  if (logResults && process.env.NODE_ENV === 'development') {
    console.log(`⚡ ${name}: ${duration.toFixed(2)}ms`);
  }

  return result;
}

/**
 * Measure async function performance
 */
export async function measureAsyncPerformance<T>(
  name: string,
  fn: () => Promise<T>,
  logResults: boolean = true
): Promise<T> {
  const start = performance.now();
  const result = await fn();
  const end = performance.now();
  const duration = end - start;

  if (logResults && process.env.NODE_ENV === 'development') {
    console.log(`⚡ ${name}: ${duration.toFixed(2)}ms`);
  }

  return result;
}

/**
 * Performance profiler class
 */
class PerformanceProfiler {
  private marks: Map<string, number> = new Map();
  private measures: Map<string, number[]> = new Map();

  /**
   * Mark the start of a measurement
   */
  mark(name: string): void {
    this.marks.set(name, performance.now());
  }

  /**
   * Measure time since mark and record it
   */
  measure(name: string): number | undefined {
    const start = this.marks.get(name);
    if (!start) {
      console.warn(`No mark found for "${name}"`);
      return undefined;
    }

    const duration = performance.now() - start;
    const existing = this.measures.get(name) || [];
    existing.push(duration);
    this.measures.set(name, existing);

    this.marks.delete(name);
    return duration;
  }

  /**
   * Get statistics for a measurement
   */
  getStats(name: string): {
    count: number;
    min: number;
    max: number;
    avg: number;
    total: number;
  } | undefined {
    const measurements = this.measures.get(name);
    if (!measurements || measurements.length === 0) {
      return undefined;
    }

    const min = Math.min(...measurements);
    const max = Math.max(...measurements);
    const total = measurements.reduce((sum, val) => sum + val, 0);
    const avg = total / measurements.length;

    return { count: measurements.length, min, max, avg, total };
  }

  /**
   * Get all measurements
   */
  getAllStats(): Record<string, ReturnType<typeof this.getStats>> {
    const result: Record<string, ReturnType<typeof this.getStats>> = {};
    for (const name of this.measures.keys()) {
      result[name] = this.getStats(name);
    }
    return result;
  }

  /**
   * Clear all measurements
   */
  clear(): void {
    this.marks.clear();
    this.measures.clear();
  }

  /**
   * Log all statistics
   */
  logStats(): void {
    const stats = this.getAllStats();
    console.group('📊 Performance Statistics');
    for (const [name, stat] of Object.entries(stats)) {
      if (stat) {
        console.log(`${name}:`, {
          count: stat.count,
          avg: `${stat.avg.toFixed(2)}ms`,
          min: `${stat.min.toFixed(2)}ms`,
          max: `${stat.max.toFixed(2)}ms`,
        });
      }
    }
    console.groupEnd();
  }
}

// Global profiler instance
export const profiler = new PerformanceProfiler();

/**
 * Monitor component render performance
 */
export function monitorComponentRender(componentName: string) {
  if (process.env.NODE_ENV !== 'development') {
    return;
  }

  profiler.mark(`${componentName}-render`);

  // Return cleanup function
  return () => {
    const duration = profiler.measure(`${componentName}-render`);
    if (duration && duration > 16.67) {
      // Longer than one frame (60fps)
      console.warn(`⚠️ Slow render: ${componentName} took ${duration.toFixed(2)}ms`);
    }
  };
}

/**
 * Memory usage monitoring
 */
export function getMemoryUsage(): {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
  usedPercentage: number;
} | null {
  if ('memory' in performance) {
    const memory = (performance as any).memory;
    return {
      usedJSHeapSize: memory.usedJSHeapSize / 1048576, // Convert to MB
      totalJSHeapSize: memory.totalJSHeapSize / 1048576,
      jsHeapSizeLimit: memory.jsHeapSizeLimit / 1048576,
      usedPercentage: (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100,
    };
  }
  return null;
}

/**
 * Log memory usage
 */
export function logMemoryUsage(): void {
  const memory = getMemoryUsage();
  if (memory) {
    console.log('💾 Memory Usage:', {
      used: `${memory.usedJSHeapSize.toFixed(2)} MB`,
      total: `${memory.totalJSHeapSize.toFixed(2)} MB`,
      limit: `${memory.jsHeapSizeLimit.toFixed(2)} MB`,
      percentage: `${memory.usedPercentage.toFixed(2)}%`,
    });
  }
}

/**
 * Bundle size analyzer (run in browser console)
 */
export function analyzeBundleSize(): void {
  const scripts = Array.from(document.querySelectorAll('script[src]'));
  const styles = Array.from(document.querySelectorAll('link[rel="stylesheet"]'));

  console.group('📦 Bundle Analysis');

  console.log('Scripts:');
  scripts.forEach((script: any) => {
    console.log(`- ${script.src}`);
  });

  console.log('\nStylesheets:');
  styles.forEach((style: any) => {
    console.log(`- ${style.href}`);
  });

  console.groupEnd();
}

/**
 * FPS monitor
 */
export class FPSMonitor {
  private frames: number[] = [];
  private lastTime: number = performance.now();
  private rafId: number | null = null;

  start(): void {
    const measure = () => {
      const now = performance.now();
      const delta = now - this.lastTime;
      const fps = 1000 / delta;

      this.frames.push(fps);
      if (this.frames.length > 60) {
        this.frames.shift();
      }

      this.lastTime = now;
      this.rafId = requestAnimationFrame(measure);
    };

    this.rafId = requestAnimationFrame(measure);
  }

  stop(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  getAverageFPS(): number {
    if (this.frames.length === 0) return 0;
    const sum = this.frames.reduce((a, b) => a + b, 0);
    return sum / this.frames.length;
  }

  getMinFPS(): number {
    return this.frames.length > 0 ? Math.min(...this.frames) : 0;
  }

  logStats(): void {
    console.log('🎮 FPS Stats:', {
      avg: this.getAverageFPS().toFixed(2),
      min: this.getMinFPS().toFixed(2),
    });
  }
}

/**
 * Global performance dashboard
 */
export function showPerformanceDashboard(): void {
  profiler.logStats();
  logMemoryUsage();
  analyzeBundleSize();

  const fpsMonitor = new FPSMonitor();
  fpsMonitor.start();

  setTimeout(() => {
    fpsMonitor.stop();
    fpsMonitor.logStats();
  }, 5000);
}

// Expose to window in development
if (process.env.NODE_ENV === 'development') {
  (window as any).performanceProfiler = profiler;
  (window as any).showPerformanceDashboard = showPerformanceDashboard;
  (window as any).logMemoryUsage = logMemoryUsage;
}
