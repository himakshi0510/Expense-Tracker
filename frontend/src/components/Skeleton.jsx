export default function Skeleton({ width = '100%', height = '1rem', className = '' }) {
  return (
    <div
      className={`animate-pulse bg-rule dark:bg-rule-dark rounded-md ${className}`}
      style={{ width, height }}
    />
  );
}
