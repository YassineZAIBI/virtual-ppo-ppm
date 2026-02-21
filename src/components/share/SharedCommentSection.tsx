'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageSquare, Send, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface Comment {
  id: string;
  guestName: string;
  content: string;
  targetSection?: string;
  createdAt: string;
}

interface SharedCommentSectionProps {
  token: string;
  accessLevel: string;
}

export function SharedCommentSection({ token, accessLevel }: SharedCommentSectionProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [guestName, setGuestName] = useState('');
  const [content, setContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    // Load saved guest name from localStorage
    const saved = localStorage.getItem('vppo-guest-name');
    if (saved) setGuestName(saved);
    loadComments();
  }, []);

  const loadComments = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/share/${token}/comments`);
      const data = await res.json();
      setComments(data.comments || []);
    } catch {
      // Non-critical
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!guestName.trim() || !content.trim()) return;

    setIsSending(true);
    try {
      localStorage.setItem('vppo-guest-name', guestName);

      const res = await fetch(`/api/share/${token}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ guestName: guestName.trim(), content: content.trim() }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to post comment');
      }

      setContent('');
      toast.success('Comment posted!');
      loadComments();
    } catch (error: any) {
      toast.error(error.message || 'Failed to post comment');
    } finally {
      setIsSending(false);
    }
  };

  if (accessLevel === 'view_only') return null;

  return (
    <Card className="mt-6">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Comments ({comments.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Comments list */}
        {isLoading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
          </div>
        ) : comments.length > 0 ? (
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {comments.map((comment) => (
              <div key={comment.id} className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-sm">{comment.guestName}</span>
                  <span className="text-xs text-slate-500">
                    {new Date(comment.createdAt).toLocaleString()}
                  </span>
                </div>
                <p className="text-sm text-slate-700 dark:text-slate-300">{comment.content}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-500 text-center py-2">No comments yet. Be the first!</p>
        )}

        {/* Comment form */}
        <form onSubmit={handleSubmit} className="space-y-3 pt-2 border-t">
          <div>
            <Label htmlFor="guest-name">Your Name</Label>
            <Input
              id="guest-name"
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              placeholder="Enter your name"
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="comment">Comment</Label>
            <Textarea
              id="comment"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Add a comment..."
              className="mt-1"
              rows={3}
            />
          </div>
          <Button
            type="submit"
            disabled={isSending || !guestName.trim() || !content.trim()}
            className="w-full gap-2"
          >
            {isSending ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Posting...</>
            ) : (
              <><Send className="h-4 w-4" /> Post Comment</>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
