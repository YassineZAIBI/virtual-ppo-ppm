import { MeetingsView } from '@/components/views/MeetingsView';
import { ErrorBoundary } from '@/components/layout/ErrorBoundary';

export default function MeetingsPage() {
  return (
    <ErrorBoundary>
      <MeetingsView />
    </ErrorBoundary>
  );
}
