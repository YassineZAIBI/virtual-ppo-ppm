'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Link2 } from 'lucide-react';
import { ShareDialog } from './ShareDialog';

interface ShareButtonProps {
  resourceType: string;
  resourceId?: string;
}

export function ShareButton({ resourceType, resourceId }: ShareButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)} className="gap-2">
        <Link2 className="h-4 w-4" />
        Share
      </Button>
      <ShareDialog
        open={open}
        onOpenChange={setOpen}
        defaultResourceType={resourceType}
        resourceId={resourceId}
      />
    </>
  );
}
