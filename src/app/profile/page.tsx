'use client';
import { ErrorBoundary } from '@/components/layout/ErrorBoundary';
import { ProfileView } from '@/components/views/ProfileView';

export default function ProfilePage() {
  return (
    <ErrorBoundary>
      <ProfileView />
    </ErrorBoundary>
  );
}
