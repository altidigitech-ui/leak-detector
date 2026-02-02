import { cn, getScoreColor } from '@/lib/utils';

interface ScoreCircleProps {
  score: number;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function ScoreCircle({ score, size = 'md', className }: ScoreCircleProps) {
  const sizes = {
    sm: { container: 'w-12 h-12', text: 'text-lg', subtext: 'text-[8px]' },
    md: { container: 'w-20 h-20', text: 'text-2xl', subtext: 'text-xs' },
    lg: { container: 'w-28 h-28', text: 'text-3xl', subtext: 'text-sm' },
  };

  const circumference = 2 * Math.PI * 45;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className={cn('relative', sizes[size].container, className)}>
      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
        {/* Background circle */}
        <circle
          cx="50"
          cy="50"
          r="45"
          fill="none"
          stroke="#e5e7eb"
          strokeWidth="6"
        />
        {/* Progress circle */}
        <circle
          cx="50"
          cy="50"
          r="45"
          fill="none"
          stroke="currentColor"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={cn(
            'transition-all duration-500',
            getScoreColor(score)
          )}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={cn('font-bold', sizes[size].text, getScoreColor(score))}>
          {score}
        </span>
        <span className={cn('text-gray-500', sizes[size].subtext)}>/100</span>
      </div>
    </div>
  );
}
