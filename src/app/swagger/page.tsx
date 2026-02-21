import { SwaggerView } from '@/components/views/SwaggerView';
import { ErrorBoundary } from '@/components/layout/ErrorBoundary';

export default function SwaggerPage() {
  return (
    <ErrorBoundary>
      <SwaggerView />
    </ErrorBoundary>
  );
}
