'use client';

type AnimatedLogoFrameProps = {
  className?: string;
  title?: string;
  loading?: 'eager' | 'lazy';
};

export function AnimatedLogoFrame({
  className = '',
  title = 'Astroworld 420 animated logo',
  loading = 'lazy',
}: AnimatedLogoFrameProps) {
  return (
    <iframe
      className={`animated-logo-frame ${className}`}
      src="/astroworld420-motion-logo.html"
      title={title}
      loading={loading}
      sandbox="allow-scripts"
      referrerPolicy="no-referrer"
      tabIndex={-1}
      scrolling="no"
    />
  );
}
