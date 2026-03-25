'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Eye, ArrowRight } from 'lucide-react';

export function VisionGateBanner() {
  const router = useRouter();
  const [visionComplete, setVisionComplete] = useState<boolean | null>(null);

  useEffect(() => {
    fetch('/api/vision')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data) {
          // Consider vision complete if northStar or mission is set
          const complete = !!(data.northStar || data.mission);
          setVisionComplete(complete);
        } else {
          setVisionComplete(false);
        }
      })
      .catch(() => setVisionComplete(false));
  }, []);

  if (visionComplete === null || visionComplete === true) return null;

  return (
    <Card className="border-amber-200 bg-amber-50 dark:bg-amber-500/10 dark:border-amber-500/20">
      <CardContent className="py-3 px-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-amber-100 dark:bg-amber-500/20 flex items-center justify-center">
              <Eye className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="font-medium text-amber-800 dark:text-amber-300 text-sm">
                Complete your Vision setup to unlock full strategy features
              </p>
              <p className="text-xs text-amber-600 dark:text-amber-400/80">
                VAS badges show &quot;Not scored&quot; until your Vision is configured.
              </p>
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="border-amber-300 text-amber-700 hover:bg-amber-100 dark:border-amber-500/30 dark:text-amber-300 dark:hover:bg-amber-500/20 shrink-0"
            onClick={() => router.push('/vision')}
          >
            Set up Vision <ArrowRight className="h-3 w-3 ml-1" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
