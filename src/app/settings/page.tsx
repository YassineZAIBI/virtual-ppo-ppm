import { SettingsView } from '@/components/views/SettingsView';
import { ErrorBoundary } from '@/components/layout/ErrorBoundary';

export default function SettingsPage() {
  return (
    <ErrorBoundary>
      <SettingsView />
    </ErrorBoundary>
  );
}
