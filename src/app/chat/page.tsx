import { ChatInterface } from '@/components/views/ChatInterface';
import { ErrorBoundary } from '@/components/layout/ErrorBoundary';

export default function ChatPage() {
  return (
    <ErrorBoundary>
      <ChatInterface />
    </ErrorBoundary>
  );
}
