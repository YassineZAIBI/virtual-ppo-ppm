'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import {
  Copy, Check, Loader2, Link2, Trash2, Eye, Clock, MessageSquare,
} from 'lucide-react';
import { toast } from 'sonner';

const RESOURCE_TYPES = [
  { value: 'dashboard', label: 'Dashboard' },
  { value: 'initiatives', label: 'Initiatives' },
  { value: 'roadmap', label: 'Roadmap' },
  { value: 'discovery', label: 'Discovery' },
  { value: 'value-meter', label: 'Value Meter' },
  { value: 'meetings', label: 'Meetings' },
];

const EXPIRY_OPTIONS = [
  { value: '1', label: '1 hour' },
  { value: '6', label: '6 hours' },
  { value: '12', label: '12 hours' },
  { value: '24', label: '24 hours' },
];

interface ShareLink {
  id: string;
  token: string;
  url: string;
  resourceType: string;
  accessLevel: string;
  expiresAt: string;
  isActive: boolean;
  viewCount: number;
  commentCount: number;
  createdAt: string;
}

interface ShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultResourceType: string;
  resourceId?: string;
}

export function ShareDialog({ open, onOpenChange, defaultResourceType, resourceId }: ShareDialogProps) {
  const [resourceType, setResourceType] = useState(defaultResourceType);
  const [expiryHours, setExpiryHours] = useState('24');
  const [isCreating, setIsCreating] = useState(false);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [activeLinks, setActiveLinks] = useState<ShareLink[]>([]);
  const [isLoadingLinks, setIsLoadingLinks] = useState(false);

  useEffect(() => {
    if (open) {
      loadLinks();
    }
  }, [open]);

  const loadLinks = async () => {
    setIsLoadingLinks(true);
    try {
      const res = await fetch('/api/share');
      const data = await res.json();
      setActiveLinks(data.links || []);
    } catch {
      // Non-critical
    } finally {
      setIsLoadingLinks(false);
    }
  };

  const handleCreate = async () => {
    setIsCreating(true);
    try {
      const res = await fetch('/api/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resourceType,
          resourceId,
          accessLevel: 'view_comment',
          expiryHours: parseInt(expiryHours),
        }),
      });

      if (!res.ok) throw new Error('Failed to create share link');

      const data = await res.json();
      const fullUrl = `${window.location.origin}${data.url}`;
      await navigator.clipboard.writeText(fullUrl);
      toast.success('Share link created and copied to clipboard!');
      setCopiedToken(data.token);
      setTimeout(() => setCopiedToken(null), 3000);
      loadLinks();
    } catch {
      toast.error('Failed to create share link');
    } finally {
      setIsCreating(false);
    }
  };

  const handleCopy = async (link: ShareLink) => {
    const fullUrl = `${window.location.origin}${link.url}`;
    await navigator.clipboard.writeText(fullUrl);
    setCopiedToken(link.token);
    setTimeout(() => setCopiedToken(null), 3000);
    toast.success('Link copied!');
  };

  const handleRevoke = async (token: string) => {
    try {
      await fetch(`/api/share/${token}/revoke`, { method: 'POST' });
      toast.success('Share link revoked');
      loadLinks();
    } catch {
      toast.error('Failed to revoke link');
    }
  };

  const filteredLinks = activeLinks.filter(l => l.isActive);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5" /> Share View
          </DialogTitle>
          <DialogDescription>
            Create a temporary link to share with external stakeholders. Links expire automatically.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Create new link */}
          <div className="space-y-3 p-4 border rounded-lg">
            <div>
              <Label>Section to Share</Label>
              <Select value={resourceType} onValueChange={setResourceType}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RESOURCE_TYPES.map((rt) => (
                    <SelectItem key={rt.value} value={rt.value}>{rt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Expires After</Label>
              <Select value={expiryHours} onValueChange={setExpiryHours}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EXPIRY_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button onClick={handleCreate} disabled={isCreating} className="w-full gap-2">
              {isCreating ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Creating...</>
              ) : (
                <><Link2 className="h-4 w-4" /> Generate Share Link</>
              )}
            </Button>
          </div>

          {/* Active links */}
          {filteredLinks.length > 0 && (
            <div className="space-y-2">
              <Label>Active Share Links</Label>
              <div className="max-h-48 overflow-y-auto space-y-2">
                {filteredLinks.map((link) => {
                  const isExpired = new Date(link.expiresAt) < new Date();
                  const label = RESOURCE_TYPES.find(r => r.value === link.resourceType)?.label || link.resourceType;

                  return (
                    <div key={link.id} className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-800 text-sm">
                      <div className="flex items-center gap-2 min-w-0">
                        <Badge variant="outline" className="shrink-0">{label}</Badge>
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          <Eye className="h-3 w-3" />{link.viewCount}
                          <MessageSquare className="h-3 w-3" />{link.commentCount}
                          <Clock className="h-3 w-3" />
                          {isExpired ? (
                            <span className="text-red-500">Expired</span>
                          ) : (
                            new Date(link.expiresAt).toLocaleTimeString()
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        {!isExpired && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => handleCopy(link)}
                          >
                            {copiedToken === link.token ? (
                              <Check className="h-3 w-3 text-green-500" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-red-500 hover:text-red-600"
                          onClick={() => handleRevoke(link.token)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {isLoadingLinks && (
            <div className="flex justify-center py-2">
              <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
