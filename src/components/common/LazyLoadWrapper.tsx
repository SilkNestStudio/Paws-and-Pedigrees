import React, { Suspense } from 'react';
import LoadingSpinner from './LoadingSpinner';

interface LazyLoadWrapperProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  minHeight?: string;
}

/**
 * Wrapper component for lazy-loaded components with loading fallback
 */
export const LazyLoadWrapper: React.FC<LazyLoadWrapperProps> = ({
  children,
  fallback,
  minHeight = '400px',
}) => {
  const defaultFallback = (
    <div
      className="flex items-center justify-center w-full"
      style={{ minHeight }}
    >
      <LoadingSpinner size="lg" />
    </div>
  );

  return (
    <Suspense fallback={fallback || defaultFallback}>
      {children}
    </Suspense>
  );
};

/**
 * Higher-order component for lazy loading with error boundary
 */
export function withLazyLoad<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: React.ReactNode
) {
  return (props: P) => (
    <LazyLoadWrapper fallback={fallback}>
      <Component {...props} />
    </LazyLoadWrapper>
  );
}

/**
 * Image lazy loading component
 */
interface LazyImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  placeholder?: string;
}

export const LazyImage: React.FC<LazyImageProps> = ({
  src,
  alt,
  placeholder = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"%3E%3Crect width="400" height="300" fill="%23f3f4f6"/%3E%3C/svg%3E',
  className,
  ...props
}) => {
  const [imageSrc, setImageSrc] = React.useState(placeholder);
  const [isLoading, setIsLoading] = React.useState(true);
  const imgRef = React.useRef<HTMLImageElement>(null);

  React.useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          const img = new Image();
          img.src = src;
          img.onload = () => {
            setImageSrc(src);
            setIsLoading(false);
          };
          img.onerror = () => {
            setIsLoading(false);
          };

          if (imgRef.current) {
            observer.unobserve(imgRef.current);
          }
        }
      },
      { rootMargin: '50px' }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => {
      observer.disconnect();
    };
  }, [src]);

  return (
    <img
      ref={imgRef}
      src={imageSrc}
      alt={alt}
      className={`${className} ${isLoading ? 'blur-sm' : 'blur-0'} transition-all duration-300`}
      {...props}
    />
  );
};
