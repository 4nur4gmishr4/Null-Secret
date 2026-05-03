import React from 'react';

interface SkeletonProps {
  width?: string;
  height?: string;
  className?: string;
}

/** A reusable shimmer placeholder for loading states. */
const Skeleton: React.FC<SkeletonProps> = ({ width = '100%', height = '16px', className = '' }) => (
  <div
    className={`skeleton ${className}`}
    style={{ width, height, border: '1px solid var(--border-default)' }}
    aria-hidden="true"
  />
);

export default Skeleton;
