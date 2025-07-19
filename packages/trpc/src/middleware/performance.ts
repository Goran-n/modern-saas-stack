import { logger } from "@kibly/utils";
import { middleware } from "../trpc";

interface PerformanceMetrics {
  path: string;
  duration: number;
  memoryUsage: {
    heapUsed: number;
    heapTotal: number;
    external: number;
    rss: number;
  };
  timestamp: number;
}

class PerformanceMonitor {
  private metrics: PerformanceMetrics[] = [];
  private readonly maxMetrics = 1000;
  private readonly slowQueryThreshold = 1000; // 1 second

  recordMetric(metric: PerformanceMetrics): void {
    this.metrics.push(metric);

    // Keep only recent metrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }

    // Alert on slow queries
    if (metric.duration > this.slowQueryThreshold) {
      logger.warn("Slow TRPC query detected", {
        path: metric.path,
        duration: metric.duration,
        memoryUsage: metric.memoryUsage,
      });
    }
  }

  getStats(): {
    averageDuration: number;
    p95Duration: number;
    p99Duration: number;
    slowQueries: number;
    pathStats: Record<string, { count: number; avgDuration: number }>;
  } {
    if (this.metrics.length === 0) {
      return {
        averageDuration: 0,
        p95Duration: 0,
        p99Duration: 0,
        slowQueries: 0,
        pathStats: {},
      };
    }

    const durations = this.metrics.map((m) => m.duration).sort((a, b) => a - b);
    const p95Index = Math.floor(durations.length * 0.95);
    const p99Index = Math.floor(durations.length * 0.99);

    const pathStats: Record<string, { total: number; count: number }> = {};

    this.metrics.forEach((metric) => {
      if (!pathStats[metric.path]) {
        pathStats[metric.path] = { total: 0, count: 0 };
      }
      const stats = pathStats[metric.path];
      if (stats) {
        stats.total += metric.duration;
        stats.count++;
      }
    });

    const pathStatsFormatted = Object.entries(pathStats).reduce<
      Record<string, { count: number; avgDuration: number }>
    >((acc, [path, stats]) => {
      acc[path] = {
        count: stats.count,
        avgDuration: Math.round(stats.total / stats.count),
      };
      return acc;
    }, {});

    return {
      averageDuration: Math.round(
        durations.reduce((a, b) => a + b, 0) / durations.length,
      ),
      p95Duration: durations[p95Index] || 0,
      p99Duration: durations[p99Index] || 0,
      slowQueries: this.metrics.filter(
        (m) => m.duration > this.slowQueryThreshold,
      ).length,
      pathStats: pathStatsFormatted,
    };
  }
}

const performanceMonitor = new PerformanceMonitor();

export const performanceMiddleware = middleware(async ({ next, path }) => {
  const startTime = Date.now();
  const startMemory = process.memoryUsage();

  try {
    const result = await next();

    const duration = Date.now() - startTime;
    const endMemory = process.memoryUsage();

    performanceMonitor.recordMetric({
      path,
      duration,
      memoryUsage: {
        heapUsed: endMemory.heapUsed - startMemory.heapUsed,
        heapTotal: endMemory.heapTotal,
        external: endMemory.external,
        rss: endMemory.rss,
      },
      timestamp: Date.now(),
    });

    return result;
  } catch (error) {
    const duration = Date.now() - startTime;

    // Still record metrics for failed requests
    performanceMonitor.recordMetric({
      path,
      duration,
      memoryUsage: process.memoryUsage(),
      timestamp: Date.now(),
    });

    throw error;
  }
});

// Export function to get performance stats
export function getPerformanceStats() {
  return performanceMonitor.getStats();
}

// Log performance stats periodically (every 5 minutes)
if (typeof setInterval !== "undefined") {
  setInterval(
    () => {
      const stats = getPerformanceStats();

      if (stats.slowQueries > 0) {
        logger.info("TRPC Performance Stats", stats);
      }
    },
    5 * 60 * 1000,
  );
}
