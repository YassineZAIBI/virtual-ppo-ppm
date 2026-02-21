'use client';

import { useState, useEffect, use } from 'react';
import { GuestHeader } from '@/components/share/GuestHeader';
import { SharedCommentSection } from '@/components/share/SharedCommentSection';
import { Card, CardContent } from '@/components/ui/card';
import { AlertCircle, Loader2 } from 'lucide-react';

export default function SharedViewPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [shareData, setShareData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const validate = async () => {
      try {
        const res = await fetch(`/api/share/${token}`);
        if (!res.ok) {
          const data = await res.json();
          setError(data.error || 'Invalid share link');
          return;
        }
        const data = await res.json();
        setShareData(data);
      } catch {
        setError('Failed to load shared content');
      } finally {
        setIsLoading(false);
      }
    };
    validate();
  }, [token]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center space-y-4">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto" />
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Link Unavailable</h2>
              <p className="text-slate-500 mt-2">{error}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <GuestHeader
        expiresAt={shareData.expiresAt}
        resourceType={shareData.resourceType}
      />

      <main className="max-w-6xl mx-auto p-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center space-y-4 py-8">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white capitalize">
                {shareData.resourceType} View
              </h2>
              <p className="text-slate-500">
                This is a shared read-only view of the {shareData.resourceType} section.
              </p>
              <p className="text-sm text-slate-400">
                Views: {shareData.viewCount} | Access: {shareData.accessLevel === 'view_comment' ? 'View + Comment' : 'View Only'}
              </p>
            </div>
          </CardContent>
        </Card>

        {shareData.accessLevel === 'view_comment' && (
          <SharedCommentSection
            token={token}
            accessLevel={shareData.accessLevel}
          />
        )}
      </main>
    </div>
  );
}
