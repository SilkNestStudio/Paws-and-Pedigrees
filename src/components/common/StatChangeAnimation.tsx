import { useEffect, useState } from 'react';

interface StatChangeAnimationProps {
  value: number;
  type?: 'positive' | 'negative' | 'neutral';
  prefix?: string;
  duration?: number;
}

export default function StatChangeAnimation({
  value,
  type,
  prefix = '',
  duration = 2000
}: StatChangeAnimationProps) {
  const [show, setShow] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setShow(false), duration);
    return () => clearTimeout(timer);
  }, [duration]);

  if (!show || value === 0) return null;

  // Auto-detect type based on value if not specified
  const changeType = type || (value > 0 ? 'positive' : value < 0 ? 'negative' : 'neutral');

  const colorClass = {
    positive: 'text-green-500',
    negative: 'text-red-500',
    neutral: 'text-gray-500',
  }[changeType];

  const sign = value > 0 ? '+' : '';

  return (
    <div
      className={`absolute inset-0 flex items-center justify-center pointer-events-none z-10 animate-stat-change`}
      style={{
        animation: 'statChange 2s ease-out forwards',
      }}
    >
      <span className={`text-2xl font-bold ${colorClass} drop-shadow-lg`}>
        {sign}{value}{prefix}
      </span>
    </div>
  );
}
