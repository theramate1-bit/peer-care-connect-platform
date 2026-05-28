/**
 * Performance Optimization Service
 * Handles caching, lazy loading, and performance monitoring
 */

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

export interface PerformanceMetrics {
  loadTime: number;
  renderTime: number;
  memoryUsage: number;
  cacheHitRate: number;
}

export class PerformanceService {
  private static cache = new Map<string, CacheEntry<any>>();
  private static metrics: PerformanceMetrics = {
    loadTime: 0,
    renderTime: 0,
    memoryUsage: 0,
    cacheHitRate: 0
  };

  /**
   * Cache data with expiration
   */
  static setCache<T>(key: string, data: T, ttlMinutes: number = 5): void {
    const now = Date.now();
    const expiresAt = now + (ttlMinutes * 60 * 1000);
    
    this.cache.set(key, {
      data,
      timestamp: now,
      expiresAt
    });
  }

  /**
   * Get cached data
   */
  static getCache<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }
    
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data as T;
  }

  /**
   * Clear expired cache entries
   */
  static clearExpiredCache(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Clear all cache
   */
  static clearAllCache(): void {
    this.cache.clear();
  }

  /**
   * Debounce function calls
   */
  static debounce<T extends (...args: any[]) => any>(
    func: T,
    wait: number
  ): (...args: Parameters<T>) => void {
    let timeout: NodeJS.Timeout;
    
    return (...args: Parameters<T>) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait);
    };
  }

  /**
   * Throttle function calls
   */
  static throttle<T extends (...args: any[]) => any>(
    func: T,
    limit: number
  ): (...args: Parameters<T>) => void {
    let inThrottle: boolean;
    
    return (...args: Parameters<T>) => {
      if (!inThrottle) {
        func(...args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }

  /**
   * Lazy load images
   */
  static lazyLoadImages(): void {
    const images = document.querySelectorAll('img[data-src]');
    const imageObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target as HTMLImageElement;
          img.src = img.dataset.src || '';
          img.removeAttribute('data-src');
          imageObserver.unobserve(img);
        }
      });
    });

    images.forEach(img => imageObserver.observe(img));
  }

  /**
   * Preload critical resources
   */
  static preloadResources(urls: string[]): void {
    urls.forEach(url => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.href = url;
      link.as = url.endsWith('.css') ? 'style' : 'script';
      document.head.appendChild(link);
    });
  }

  /**
   * Measure performance metrics
   */
  static measurePerformance(): PerformanceMetrics {
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    const paint = performance.getEntriesByType('paint');
    
    this.metrics.loadTime = navigation.loadEventEnd - navigation.fetchStart;
    this.metrics.renderTime = paint.find(p => p.name === 'first-contentful-paint')?.startTime || 0;
    
    // Memory usage (if available)
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      this.metrics.memoryUsage = memory.usedJSHeapSize / memory.jsHeapSizeLimit;
    }
    
    // Cache hit rate
    const totalRequests = this.cache.size + this.getCacheMissCount();
    this.metrics.cacheHitRate = totalRequests > 0 ? this.cache.size / totalRequests : 0;
    
    return this.metrics;
  }

  /**
   * Optimize images
   */
  static optimizeImage(
    file: File,
    maxWidth: number = 1920,
    quality: number = 0.8
  ): Promise<File> {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        const { width, height } = img;
        
        // Calculate new dimensions
        let newWidth = width;
        let newHeight = height;
        
        if (width > maxWidth) {
          newHeight = (height * maxWidth) / width;
          newWidth = maxWidth;
        }
        
        canvas.width = newWidth;
        canvas.height = newHeight;
        
        // Draw and compress
        ctx?.drawImage(img, 0, 0, newWidth, newHeight);
        
        canvas.toBlob(
          (blob) => {
            if (blob) {
              const optimizedFile = new File([blob], file.name, {
                type: file.type,
                lastModified: Date.now()
              });
              resolve(optimizedFile);
            } else {
              reject(new Error('Image optimization failed'));
            }
          },
          file.type,
          quality
        );
      };

      img.onerror = () => reject(new Error('Image load failed'));
      img.src = URL.createObjectURL(file);
    });
  }

  /**
   * Batch API requests
   */
  static async batchRequests<T>(
    requests: (() => Promise<T>)[],
    batchSize: number = 5
  ): Promise<T[]> {
    const results: T[] = [];
    
    for (let i = 0; i < requests.length; i += batchSize) {
      const batch = requests.slice(i, i + batchSize);
      const batchResults = await Promise.all(batch.map(request => request()));
      results.push(...batchResults);
    }
    
    return results;
  }

  /**
   * Virtual scrolling for large lists
   */
  static createVirtualScroll(
    container: HTMLElement,
    itemHeight: number,
    totalItems: number,
    renderItem: (index: number) => HTMLElement
  ): void {
    const visibleItems = Math.ceil(container.clientHeight / itemHeight);
    const buffer = Math.ceil(visibleItems / 2);
    
    let startIndex = 0;
    let endIndex = Math.min(startIndex + visibleItems + buffer, totalItems);
    
    const updateScroll = () => {
      const scrollTop = container.scrollTop;
      const newStartIndex = Math.floor(scrollTop / itemHeight);
      const newEndIndex = Math.min(newStartIndex + visibleItems + buffer, totalItems);
      
      if (newStartIndex !== startIndex || newEndIndex !== endIndex) {
        startIndex = newStartIndex;
        endIndex = newEndIndex;
        
        // Clear container
        container.innerHTML = '';
        
        // Add spacer for items before visible range
        const topSpacer = document.createElement('div');
        topSpacer.style.height = `${startIndex * itemHeight}px`;
        container.appendChild(topSpacer);
        
        // Render visible items
        for (let i = startIndex; i < endIndex; i++) {
          const item = renderItem(i);
          item.style.height = `${itemHeight}px`;
          container.appendChild(item);
        }
        
        // Add spacer for items after visible range
        const bottomSpacer = document.createElement('div');
        bottomSpacer.style.height = `${(totalItems - endIndex) * itemHeight}px`;
        container.appendChild(bottomSpacer);
      }
    };
    
    container.addEventListener('scroll', updateScroll);
    updateScroll();
  }

  /**
   * Get cache statistics
   */
  static getCacheStats(): {
    size: number;
    hitRate: number;
    memoryUsage: number;
  } {
    return {
      size: this.cache.size,
      hitRate: this.metrics.cacheHitRate,
      memoryUsage: this.metrics.memoryUsage
    };
  }

  /**
   * Initialize performance monitoring
   */
  static initialize(): void {
    // Clear expired cache every 5 minutes
    setInterval(() => {
      this.clearExpiredCache();
    }, 5 * 60 * 1000);
    
    // Measure performance on page load
    window.addEventListener('load', () => {
      setTimeout(() => {
        this.measurePerformance();
      }, 1000);
    });
    
    // Lazy load images
    this.lazyLoadImages();
  }

  private static cacheMissCount = 0;
  
  private static getCacheMissCount(): number {
    return this.cacheMissCount;
  }
}

// Initialize performance monitoring
PerformanceService.initialize();