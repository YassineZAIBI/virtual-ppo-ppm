'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Building2, Globe, FileUp } from 'lucide-react';
import { KnowledgeUploader } from '@/components/knowledge/KnowledgeUploader';

interface IdentityStepProps {
  data: {
    companyName: string;
    industry: string;
    website: string;
    description: string;
  };
  onChange: (data: Partial<IdentityStepProps['data']>) => void;
}

export function IdentityStep({ data, onChange }: IdentityStepProps) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-bold text-foreground">Tell us about your product</h2>
        <p className="text-sm text-muted-foreground mt-1">
          This helps Azmyra understand your context and extract your vision automatically.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="companyName">Company / Product Name</Label>
          <div className="relative mt-1">
            <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="companyName"
              className="pl-9"
              placeholder="Acme Corp"
              value={data.companyName}
              onChange={(e) => onChange({ companyName: e.target.value })}
            />
          </div>
        </div>
        <div>
          <Label htmlFor="industry">Industry</Label>
          <Input
            id="industry"
            className="mt-1"
            placeholder="SaaS, FinTech, Healthcare..."
            value={data.industry}
            onChange={(e) => onChange({ industry: e.target.value })}
          />
        </div>
      </div>

      <div>
        <Label htmlFor="website">Website URL (optional)</Label>
        <div className="relative mt-1">
          <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="website"
            className="pl-9"
            placeholder="https://yourproduct.com"
            value={data.website}
            onChange={(e) => onChange({ website: e.target.value })}
          />
        </div>
      </div>

      <div>
        <Label htmlFor="description">Brief description</Label>
        <Textarea
          id="description"
          className="mt-1"
          placeholder="What does your product do? Who is it for?"
          rows={3}
          value={data.description}
          onChange={(e) => onChange({ description: e.target.value })}
        />
      </div>

      <div>
        <div className="flex items-center gap-2 mb-2">
          <FileUp className="h-4 w-4 text-muted-foreground" />
          <Label>Upload context documents (optional)</Label>
        </div>
        <p className="text-xs text-muted-foreground mb-2">
          Pitch decks, about pages, product briefs — anything that describes your product vision.
        </p>
        <KnowledgeUploader compact />
      </div>
    </div>
  );
}
