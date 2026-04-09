'use client';

import { ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ViewSkeleton } from '@/components/views/shared/ViewSkeleton';
import { EmptyState } from '@/components/views/shared/EmptyState';

interface ViewShellProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  loading?: boolean;
  error?: string | null;
  empty?: boolean;
  emptyMessage?: string;
  emptyDescription?: string;
  emptyAction?: { label: string; href?: string; onClick?: () => void };
  className?: string;
}

export function ViewShell({
  title,
  description,
  actions,
  children,
  loading,
  error,
  empty,
  emptyMessage = 'No data yet',
  emptyDescription,
  emptyAction,
  className,
}: ViewShellProps) {
  return (
    <div className={cn('p-6 space-y-6', className)}>
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          {description && (
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          )}
        </div>
        {actions && <div className="flex items-center gap-2 flex-shrink-0">{actions}</div>}
      </div>

      {/* Loading state */}
      {loading && <ViewSkeleton />}

      {/* Error state */}
      {!loading && error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Something went wrong</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Empty state */}
      {!loading && !error && empty && (
        <EmptyState
          message={emptyMessage}
          description={emptyDescription}
          action={emptyAction}
        />
      )}

      {/* Content */}
      {!loading && !error && !empty && children}
    </div>
  );
}
