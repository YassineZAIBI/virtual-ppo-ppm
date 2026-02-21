'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Upload, Globe, FileText, FileSpreadsheet, File, Trash2,
  Loader2, Link, AlertCircle, CheckCircle2, X,
} from 'lucide-react';
import { toast } from 'sonner';

const MAX_FILES = 3;
const MAX_URLS = 10;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_EXTENSIONS = ['.pdf', '.docx', '.txt', '.md', '.csv', '.xlsx'];

interface KnowledgeDoc {
  id: string;
  sourceType: string;
  sourceName: string;
  sourceUrl?: string;
  fileType?: string;
  fileSize?: number;
  createdAt: string;
}

interface KnowledgeUploaderProps {
  compact?: boolean;
  onDocsChange?: (docs: KnowledgeDoc[]) => void;
}

function getFileIcon(fileType?: string) {
  switch (fileType) {
    case 'pdf': return <FileText className="h-4 w-4 text-red-500" />;
    case 'docx': return <FileText className="h-4 w-4 text-blue-500" />;
    case 'csv':
    case 'xlsx': return <FileSpreadsheet className="h-4 w-4 text-green-500" />;
    case 'txt':
    case 'md': return <FileText className="h-4 w-4 text-slate-500" />;
    default: return <File className="h-4 w-4 text-slate-400" />;
  }
}

function formatFileSize(bytes?: number): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

export function KnowledgeUploader({ compact = false, onDocsChange }: KnowledgeUploaderProps) {
  const [docs, setDocs] = useState<KnowledgeDoc[]>([]);
  const [isLoadingDocs, setIsLoadingDocs] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [isScraping, setIsScraping] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fileCount = docs.filter((d) => d.sourceType === 'file').length;
  const urlCount = docs.filter((d) => d.sourceType === 'url').length;

  // Load existing documents
  useEffect(() => {
    fetchDocs();
  }, []);

  const fetchDocs = async () => {
    try {
      const resp = await fetch('/api/knowledge');
      if (resp.ok) {
        const data = await resp.json();
        setDocs(data);
        onDocsChange?.(data);
      }
    } catch {
      // Non-critical
    } finally {
      setIsLoadingDocs(false);
    }
  };

  const handleFileUpload = useCallback(async (file: File) => {
    // Validate extension
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      toast.error(`Unsupported file type: ${ext}. Allowed: ${ALLOWED_EXTENSIONS.join(', ')}`);
      return;
    }

    // Validate size
    if (file.size > MAX_FILE_SIZE) {
      toast.error(`File too large: ${formatFileSize(file.size)}. Maximum: 5MB`);
      return;
    }

    // Validate count
    if (fileCount >= MAX_FILES) {
      toast.error(`Maximum ${MAX_FILES} files allowed. Delete a file first.`);
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const resp = await fetch('/api/knowledge/upload', {
        method: 'POST',
        body: formData,
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: 'Upload failed' }));
        throw new Error(err.error || 'Upload failed');
      }

      const result = await resp.json();
      toast.success(`Uploaded ${result.sourceName} (${result.chunkCount} chunks)`);
      await fetchDocs();
    } catch (error: any) {
      toast.error(error.message || 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  }, [fileCount]);

  const handleScrapeUrl = async () => {
    const url = urlInput.trim();
    if (!url) return;

    if (urlCount >= MAX_URLS) {
      toast.error(`Maximum ${MAX_URLS} URLs allowed. Delete a URL first.`);
      return;
    }

    setIsScraping(true);
    try {
      const resp = await fetch('/api/knowledge/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: 'Scrape failed' }));
        throw new Error(err.error || 'Scrape failed');
      }

      const result = await resp.json();
      toast.success(`Scraped "${result.sourceName}" (${result.chunkCount} chunks)`);
      setUrlInput('');
      await fetchDocs();
    } catch (error: any) {
      toast.error(error.message || 'Failed to scrape URL');
    } finally {
      setIsScraping(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    try {
      const resp = await fetch('/api/knowledge', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });

      if (resp.ok) {
        toast.success(`Removed "${name}"`);
        await fetchDocs();
      } else {
        toast.error('Failed to delete document');
      }
    } catch {
      toast.error('Failed to delete document');
    }
  };

  // Drag & Drop handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileUpload(file);
  }, [handleFileUpload]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileUpload(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  if (isLoadingDocs) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className={compact ? 'space-y-3' : 'space-y-4'}>
      {!compact && (
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Add Context</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Upload files or add URLs to give the AI more context about your product.
          </p>
        </div>
      )}

      {/* Limit indicators */}
      <div className="flex gap-3 text-xs text-slate-500">
        <span className={fileCount >= MAX_FILES ? 'text-amber-600 font-medium' : ''}>
          {fileCount} of {MAX_FILES} files
        </span>
        <span className="text-slate-300">|</span>
        <span className={urlCount >= MAX_URLS ? 'text-amber-600 font-medium' : ''}>
          {urlCount} of {MAX_URLS} URLs
        </span>
      </div>

      {/* File drop zone */}
      {fileCount < MAX_FILES && (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-lg p-${compact ? '3' : '6'} text-center cursor-pointer transition-colors ${
            isDragOver
              ? 'border-blue-400 bg-blue-50 dark:bg-blue-950/30'
              : 'border-slate-300 dark:border-slate-600 hover:border-blue-300 hover:bg-slate-50 dark:hover:bg-slate-800'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept={ALLOWED_EXTENSIONS.join(',')}
            onChange={handleFileSelect}
          />
          {isUploading ? (
            <div className="flex items-center justify-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
              <span className="text-sm text-slate-600 dark:text-slate-400">Uploading...</span>
            </div>
          ) : (
            <>
              <Upload className={`${compact ? 'h-5 w-5' : 'h-8 w-8'} text-slate-400 mx-auto ${compact ? 'mb-1' : 'mb-2'}`} />
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {isDragOver ? 'Drop file here' : 'Drag & drop or click to upload'}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                PDF, DOCX, TXT, MD, CSV, XLSX (max 5MB)
              </p>
            </>
          )}
        </div>
      )}

      {/* URL input */}
      {urlCount < MAX_URLS && (
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Globe className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleScrapeUrl()}
              placeholder="https://docs.example.com/page"
              className="pl-8"
              disabled={isScraping}
            />
          </div>
          <Button
            onClick={handleScrapeUrl}
            disabled={isScraping || !urlInput.trim()}
            variant="outline"
            size={compact ? 'sm' : 'default'}
            className="gap-1 shrink-0"
          >
            {isScraping ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Scraping</>
            ) : (
              <><Link className="h-4 w-4" /> Scrape</>
            )}
          </Button>
        </div>
      )}

      {/* Info about URL scraping */}
      {urlCount < MAX_URLS && !compact && (
        <p className="text-xs text-slate-400 flex items-start gap-1">
          <AlertCircle className="h-3 w-3 mt-0.5 shrink-0" />
          Only public pages are supported. Pages requiring login will be rejected.
        </p>
      )}

      {/* Document list */}
      {docs.length > 0 && (
        <div className={`space-y-1 ${compact ? '' : 'border rounded-lg p-2'}`}>
          {!compact && (
            <p className="text-xs font-medium text-slate-500 px-1 mb-1">Knowledge Sources</p>
          )}
          {docs.map((doc) => (
            <div
              key={doc.id}
              className="flex items-center gap-2 p-2 rounded hover:bg-slate-50 dark:hover:bg-slate-800 group"
            >
              {doc.sourceType === 'url' ? (
                <Globe className="h-4 w-4 text-blue-500 shrink-0" />
              ) : (
                getFileIcon(doc.fileType)
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm truncate" title={doc.sourceName}>
                  {doc.sourceName}
                </p>
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <Badge variant="outline" className="text-[10px] py-0 px-1">
                    {doc.sourceType === 'url' ? 'URL' : doc.fileType?.toUpperCase() || 'FILE'}
                  </Badge>
                  {doc.fileSize && (
                    <span>{formatFileSize(doc.fileSize)}</span>
                  )}
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-red-500"
                onClick={() => handleDelete(doc.id, doc.sourceName)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {docs.length === 0 && !compact && (
        <div className="text-center py-4">
          <p className="text-sm text-slate-400">No knowledge sources added yet</p>
          <p className="text-xs text-slate-400 mt-1">
            Upload files or scrape URLs to give agents more context
          </p>
        </div>
      )}
    </div>
  );
}
