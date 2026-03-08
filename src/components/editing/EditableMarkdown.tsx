'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { StyledMarkdown } from '@/components/ui/styled-markdown';
import { Pencil, Save, X, Bot, User } from 'lucide-react';

interface EditableMarkdownProps {
  content: string;
  editedBy?: 'ai' | 'user';
  entityType: string;
  entityId: string;
  onSave?: (newContent: string) => void;
  className?: string;
  readOnly?: boolean;
}

export function EditableMarkdown({
  content,
  editedBy,
  entityType,
  entityId,
  onSave,
  className,
  readOnly = false,
}: EditableMarkdownProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(content);

  function handleEdit() {
    setDraft(content);
    setIsEditing(true);
  }

  function handleCancel() {
    setDraft(content);
    setIsEditing(false);
  }

  function handleSave() {
    setIsEditing(false);
    onSave?.(draft);
  }

  return (
    <div className={className}>
      {/* ---------- Toolbar ---------- */}
      <div className="flex items-center justify-between mb-2">
        {/* Badge */}
        <div>
          {editedBy === 'ai' && (
            <Badge
              variant="secondary"
              className="gap-1 text-xs bg-muted text-muted-foreground"
            >
              <Bot className="h-3 w-3" />
              AI Generated
            </Badge>
          )}
          {editedBy === 'user' && (
            <Badge
              variant="secondary"
              className="gap-1 text-xs bg-muted text-muted-foreground"
            >
              <User className="h-3 w-3" />
              User Edited
            </Badge>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1">
          {isEditing ? (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCancel}
                className="h-7 px-2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4 mr-1" />
                Cancel
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={handleSave}
                className="h-7 px-2"
              >
                <Save className="h-4 w-4 mr-1" />
                Save
              </Button>
            </>
          ) : (
            !readOnly && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleEdit}
                className="h-7 px-2 text-muted-foreground hover:text-foreground"
              >
                <Pencil className="h-4 w-4 mr-1" />
                Edit
              </Button>
            )
          )}
        </div>
      </div>

      {/* ---------- Content ---------- */}
      {isEditing ? (
        <Textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          className="min-h-[200px] bg-background text-foreground border-border font-mono text-sm"
          autoFocus
        />
      ) : (
        <div className="rounded-lg border border-border bg-card p-4">
          <StyledMarkdown>{content}</StyledMarkdown>
        </div>
      )}
    </div>
  );
}
