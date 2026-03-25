'use client';

import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Target } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AlignmentBadgeProps {
  score: number | null | undefined;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

function getScoreColor(score: number): string {
  if (score >= 80) return 'bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/30';
  if (score >= 60) return 'bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30';
  if (score >= 40) return 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30';
  return 'bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/30';
}

function getScoreLabel(score: number): string {
  if (score >= 80) return 'Strong Alignment';
  if (score >= 60) return 'Good Alignment';
  if (score >= 40) return 'Moderate Alignment';
  return 'Low Alignment';
}

export function AlignmentBadge({ score, size = 'sm', showLabel = false, className }: AlignmentBadgeProps) {
  if (score == null) {
    return (
      <Badge variant="outline" className={cn('text-muted-foreground text-[10px]', className)}>
        <Target className="h-3 w-3 mr-1" />
        Not scored
      </Badge>
    );
  }

  const rounded = Math.round(score);
  const colorClass = getScoreColor(rounded);
  const label = getScoreLabel(rounded);

  const sizeClasses = {
    sm: 'text-[10px] px-1.5 py-0',
    md: 'text-xs px-2 py-0.5',
    lg: 'text-sm px-3 py-1',
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="outline" className={cn(colorClass, sizeClasses[size], className)}>
            <Target className={cn('mr-1', size === 'lg' ? 'h-4 w-4' : 'h-3 w-3')} />
            {rounded}
            {showLabel && <span className="ml-1">{label}</span>}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p className="font-medium">Vision Alignment Score: {rounded}/100</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
