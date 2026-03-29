// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';

// ---------------------------------------------------------------------------
// Mocks -- Next.js, store, sonner, lucide, shadcn UI primitives
// ---------------------------------------------------------------------------

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock('@/lib/store', () => ({
  useAppStore: vi.fn(() => ({
    marketResearches: [],
    setMarketResearches: vi.fn(),
    addMarketResearch: vi.fn(),
    updateMarketResearch: vi.fn(),
    deleteMarketResearch: vi.fn(),
    settings: { llmProvider: 'openai' },
  })),
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

// --- shadcn UI mocks ---

vi.mock('@/components/ui/card', () => ({
  Card: ({ children, className, ...rest }: any) => (
    <div data-testid="card" className={className} {...rest}>{children}</div>
  ),
  CardContent: ({ children, className }: any) => (
    <div data-testid="card-content" className={className}>{children}</div>
  ),
  CardHeader: ({ children, className }: any) => (
    <div data-testid="card-header" className={className}>{children}</div>
  ),
  CardTitle: ({ children, className }: any) => (
    <h3 data-testid="card-title" className={className}>{children}</h3>
  ),
  CardDescription: ({ children, className }: any) => (
    <p data-testid="card-description" className={className}>{children}</p>
  ),
}));

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children, variant, className }: any) => (
    <span data-testid="badge" data-variant={variant} className={className}>
      {children}
    </span>
  ),
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, variant, size, className, ...rest }: any) => (
    <button
      onClick={onClick}
      disabled={disabled}
      data-variant={variant}
      data-size={size}
      className={className}
      {...rest}
    >
      {children}
    </button>
  ),
}));

vi.mock('@/components/ui/textarea', () => ({
  Textarea: ({ value, onChange, className, autoFocus, ...rest }: any) => (
    <textarea
      value={value}
      onChange={onChange}
      className={className}
      autoFocus={autoFocus}
      data-testid="textarea"
      {...rest}
    />
  ),
}));

vi.mock('@/components/ui/input', () => ({
  Input: ({ value, onChange, className, ...rest }: any) => (
    <input value={value} onChange={onChange} className={className} data-testid="input" {...rest} />
  ),
}));

vi.mock('@/components/ui/label', () => ({
  Label: ({ children, className, htmlFor }: any) => (
    <label className={className} htmlFor={htmlFor}>{children}</label>
  ),
}));

vi.mock('@/components/ui/progress', () => ({
  Progress: ({ value, className }: any) => (
    <div data-testid="progress-bar" data-value={value} className={className} role="progressbar" aria-valuenow={value} />
  ),
}));

vi.mock('@/components/ui/checkbox', () => ({
  Checkbox: ({ checked, onCheckedChange, className }: any) => (
    <input
      type="checkbox"
      checked={checked}
      onChange={() => onCheckedChange?.(!checked)}
      className={className}
      data-testid="checkbox"
    />
  ),
}));

vi.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: ({ children, className }: any) => (
    <div data-testid="scroll-area" className={className}>{children}</div>
  ),
}));

vi.mock('@/components/ui/tabs', () => ({
  Tabs: ({ children, value, onValueChange, className }: any) => (
    <div data-testid="tabs" data-value={value} className={className}>{children}</div>
  ),
  TabsContent: ({ children, value, className }: any) => (
    <div data-testid={`tabs-content-${value}`} className={className}>{children}</div>
  ),
  TabsList: ({ children, className }: any) => (
    <div data-testid="tabs-list" className={className}>{children}</div>
  ),
  TabsTrigger: ({ children, value, className }: any) => (
    <button data-testid={`tabs-trigger-${value}`} className={className}>{children}</button>
  ),
}));

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }: any) => (open ? <div data-testid="dialog">{children}</div> : null),
  DialogContent: ({ children, className }: any) => (
    <div data-testid="dialog-content" className={className}>{children}</div>
  ),
  DialogHeader: ({ children }: any) => <div data-testid="dialog-header">{children}</div>,
  DialogTitle: ({ children }: any) => <h2 data-testid="dialog-title">{children}</h2>,
  DialogFooter: ({ children }: any) => <div data-testid="dialog-footer">{children}</div>,
}));

vi.mock('@/components/ui/styled-markdown', () => ({
  StyledMarkdown: ({ children }: any) => <div data-testid="styled-markdown">{children}</div>,
}));

// Mock lucide-react icons as simple spans
vi.mock('lucide-react', () => {
  const icon = ({ className }: any) => <span data-testid="icon" className={className} />;
  return {
    Search: icon,
    MessageSquare: icon,
    BookOpen: icon,
    Landmark: icon,
    Plug: icon,
    ExternalLink: icon,
    Calendar: icon,
    Pencil: icon,
    Save: icon,
    X: icon,
    Bot: icon,
    User: icon,
    Loader2: icon,
    CheckCircle2: icon,
    XCircle: icon,
    Clock: icon,
    Plus: icon,
    FileText: icon,
    Database: icon,
    Link2: icon,
    Sparkles: icon,
    Trash2: icon,
    RefreshCw: icon,
    Star: icon,
    Newspaper: icon,
    Swords: icon,
    Briefcase: icon,
    TrendingUp: icon,
    MessageCircleHeart: icon,
    Cpu: icon,
    Brain: icon,
    LayoutTemplate: icon,
  };
});

// ---------------------------------------------------------------------------
// Imports -- Components under test
// ---------------------------------------------------------------------------

import { DataPointCard } from '@/components/market-research/DataPointCard';
import { SourceAttribution } from '@/components/market-research/SourceAttribution';
import { EditableMarkdown } from '@/components/editing/EditableMarkdown';
import { JobProgress } from '@/components/market-research/JobProgress';
import { AdapterSelector } from '@/components/market-research/AdapterSelector';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const FIXED_DATE = '2025-06-15T12:00:00.000Z';

function makeDataPoint(overrides: Partial<any> = {}) {
  return {
    id: 'dp-1',
    adapterKey: 'search_google',
    sourceUrl: 'https://example.com/article',
    sourceName: 'Example Source',
    title: 'Example Title',
    rawContent: 'This is sample raw content for testing purposes.',
    contentType: 'article',
    fetchedAt: FIXED_DATE,
    metadata: {},
    extractedFacts: [],
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// DataPointCard
// ---------------------------------------------------------------------------

describe('DataPointCard', () => {
  it('renders source name and title', () => {
    render(<DataPointCard {...makeDataPoint()} />);

    expect(screen.getByText('Example Source')).toBeTruthy();
    expect(screen.getByText('Example Title')).toBeTruthy();
  });

  it('renders content preview (truncated when > 200 chars)', () => {
    const longContent = 'A'.repeat(250);
    render(<DataPointCard {...makeDataPoint({ rawContent: longContent })} />);

    // Should be truncated to 200 chars + "..."
    const truncated = 'A'.repeat(200) + '...';
    expect(screen.getByText(truncated)).toBeTruthy();
  });

  it('renders short content without truncation', () => {
    const shortContent = 'Short content here.';
    render(<DataPointCard {...makeDataPoint({ rawContent: shortContent })} />);

    expect(screen.getByText('Short content here.')).toBeTruthy();
  });

  it('creates a link to sourceUrl when sourceUrl is provided', () => {
    render(<DataPointCard {...makeDataPoint()} />);

    const link = screen.getByText('Example Title').closest('a');
    expect(link).toBeTruthy();
    expect(link!.getAttribute('href')).toBe('https://example.com/article');
    expect(link!.getAttribute('target')).toBe('_blank');
    expect(link!.getAttribute('rel')).toContain('noopener');
  });

  it('renders title as plain text when no sourceUrl', () => {
    render(<DataPointCard {...makeDataPoint({ sourceUrl: '' })} />);

    // Title should not be wrapped in a link
    const titleElement = screen.getByText('Example Title');
    expect(titleElement.closest('a')).toBeNull();
  });

  it('shows adapter badge with adapterKey', () => {
    render(<DataPointCard {...makeDataPoint({ adapterKey: 'social_reddit' })} />);

    const badges = screen.getAllByTestId('badge');
    const adapterBadge = badges.find((b) => b.textContent === 'social_reddit');
    expect(adapterBadge).toBeTruthy();
  });

  it('shows fetchedAt date formatted', () => {
    render(<DataPointCard {...makeDataPoint({ fetchedAt: '2025-03-10T08:30:00.000Z' })} />);

    // The formatted date should appear somewhere in the document
    const container = screen.getByTestId('card');
    // formatDate produces locale-dependent text; check for year and day number
    expect(container.textContent).toMatch(/10/);
    expect(container.textContent).toMatch(/2025/);
  });

  it('shows contentType badge', () => {
    render(<DataPointCard {...makeDataPoint({ contentType: 'report' })} />);

    const badges = screen.getAllByTestId('badge');
    const typeBadge = badges.find((b) => b.textContent === 'report');
    expect(typeBadge).toBeTruthy();
  });

  it('renders extracted facts when provided', () => {
    const facts = [
      { fact: 'Market grew 15%', confidence: 0.9, category: 'growth' },
      { fact: 'New competitor entered', confidence: 0.8, category: 'competition' },
    ];
    render(<DataPointCard {...makeDataPoint({ extractedFacts: facts })} />);

    expect(screen.getByText('Key Facts')).toBeTruthy();
    expect(screen.getByText('Market grew 15%')).toBeTruthy();
    expect(screen.getByText('New competitor entered')).toBeTruthy();
    expect(screen.getByText('growth')).toBeTruthy();
    expect(screen.getByText('competition')).toBeTruthy();
  });

  it('limits extracted facts to 3', () => {
    const facts = [
      { fact: 'Fact 1', confidence: 0.9, category: 'cat1' },
      { fact: 'Fact 2', confidence: 0.8, category: 'cat2' },
      { fact: 'Fact 3', confidence: 0.7, category: 'cat3' },
      { fact: 'Fact 4', confidence: 0.6, category: 'cat4' },
    ];
    render(<DataPointCard {...makeDataPoint({ extractedFacts: facts })} />);

    expect(screen.getByText('Fact 1')).toBeTruthy();
    expect(screen.getByText('Fact 2')).toBeTruthy();
    expect(screen.getByText('Fact 3')).toBeTruthy();
    expect(screen.queryByText('Fact 4')).toBeNull();
  });

  it('does not render Key Facts section when extractedFacts is empty', () => {
    render(<DataPointCard {...makeDataPoint({ extractedFacts: [] })} />);
    expect(screen.queryByText('Key Facts')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// SourceAttribution
// ---------------------------------------------------------------------------

describe('SourceAttribution', () => {
  const baseProps = {
    sourceName: 'Reuters',
    sourceUrl: 'https://reuters.com/article/123',
    adapterKey: 'search_google',
    fetchedAt: '2025-04-20T10:00:00.000Z',
  };

  it('renders source name', () => {
    render(<SourceAttribution {...baseProps} />);
    expect(screen.getByText('Reuters')).toBeTruthy();
  });

  it('creates a link to sourceUrl', () => {
    render(<SourceAttribution {...baseProps} />);

    const link = document.querySelector('a[href="https://reuters.com/article/123"]');
    expect(link).toBeTruthy();
    expect(link!.getAttribute('target')).toBe('_blank');
    expect(link!.getAttribute('rel')).toContain('noopener');
  });

  it('does not render link when sourceUrl is empty', () => {
    render(<SourceAttribution {...baseProps} sourceUrl="" />);

    const links = document.querySelectorAll('a');
    expect(links.length).toBe(0);
  });

  it('shows formatted date', () => {
    render(<SourceAttribution {...baseProps} />);

    const container = document.querySelector('div');
    // formatDate output is locale-dependent; check for day and year
    expect(container!.textContent).toMatch(/20/);
    expect(container!.textContent).toMatch(/2025/);
  });

  it('shows adapter badge with adapterKey', () => {
    render(<SourceAttribution {...baseProps} adapterKey="research_arxiv" />);

    const badges = screen.getAllByTestId('badge');
    const adapterBadge = badges.find((b) => b.textContent === 'research_arxiv');
    expect(adapterBadge).toBeTruthy();
  });

  it('accepts Date objects for fetchedAt', () => {
    const dateObj = new Date('2025-01-15T00:00:00.000Z');
    render(<SourceAttribution {...baseProps} fetchedAt={dateObj} />);

    const container = document.querySelector('div');
    // formatDate output is locale-dependent; check for day and year
    expect(container!.textContent).toMatch(/15/);
    expect(container!.textContent).toMatch(/2025/);
  });
});

// ---------------------------------------------------------------------------
// EditableMarkdown
// ---------------------------------------------------------------------------

describe('EditableMarkdown', () => {
  const baseProps = {
    content: 'Hello **world**',
    entityType: 'research',
    entityId: 'r-1',
  };

  it('renders content in read mode by default', () => {
    render(<EditableMarkdown {...baseProps} />);

    // The StyledMarkdown mock renders children as text
    expect(screen.getByTestId('styled-markdown')).toBeTruthy();
    expect(screen.getByTestId('styled-markdown').textContent).toBe('Hello **world**');
    // Textarea should NOT be present
    expect(screen.queryByTestId('textarea')).toBeNull();
  });

  it('shows "AI Generated" badge when editedBy is "ai"', () => {
    render(<EditableMarkdown {...baseProps} editedBy="ai" />);

    expect(screen.getByText('AI Generated')).toBeTruthy();
  });

  it('shows "User Edited" badge when editedBy is "user"', () => {
    render(<EditableMarkdown {...baseProps} editedBy="user" />);

    expect(screen.getByText('User Edited')).toBeTruthy();
  });

  it('does not show AI or User badge when editedBy is undefined', () => {
    render(<EditableMarkdown {...baseProps} />);

    expect(screen.queryByText('AI Generated')).toBeNull();
    expect(screen.queryByText('User Edited')).toBeNull();
  });

  it('does not show edit button when readOnly is true', () => {
    render(<EditableMarkdown {...baseProps} readOnly={true} />);

    expect(screen.queryByText('Edit')).toBeNull();
  });

  it('shows edit button when readOnly is false (default)', () => {
    render(<EditableMarkdown {...baseProps} />);

    expect(screen.getByText('Edit')).toBeTruthy();
  });

  it('clicking edit button switches to textarea', () => {
    render(<EditableMarkdown {...baseProps} />);

    fireEvent.click(screen.getByText('Edit'));

    expect(screen.getByTestId('textarea')).toBeTruthy();
    expect((screen.getByTestId('textarea') as HTMLTextAreaElement).value).toBe('Hello **world**');
    // StyledMarkdown should be gone
    expect(screen.queryByTestId('styled-markdown')).toBeNull();
  });

  it('shows Save and Cancel buttons in edit mode', () => {
    render(<EditableMarkdown {...baseProps} />);

    fireEvent.click(screen.getByText('Edit'));

    expect(screen.getByText('Save')).toBeTruthy();
    expect(screen.getByText('Cancel')).toBeTruthy();
    // Edit button should be gone
    expect(screen.queryByText('Edit')).toBeNull();
  });

  it('save calls onSave with new content', () => {
    const onSave = vi.fn();
    render(<EditableMarkdown {...baseProps} onSave={onSave} />);

    fireEvent.click(screen.getByText('Edit'));

    const textarea = screen.getByTestId('textarea') as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: 'Updated content' } });

    fireEvent.click(screen.getByText('Save'));

    expect(onSave).toHaveBeenCalledOnce();
    expect(onSave).toHaveBeenCalledWith('Updated content');
    // Should return to read mode
    expect(screen.queryByTestId('textarea')).toBeNull();
    expect(screen.getByTestId('styled-markdown')).toBeTruthy();
  });

  it('cancel reverts to original content and exits edit mode', () => {
    const onSave = vi.fn();
    render(<EditableMarkdown {...baseProps} onSave={onSave} />);

    fireEvent.click(screen.getByText('Edit'));

    const textarea = screen.getByTestId('textarea') as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: 'Modified content' } });

    fireEvent.click(screen.getByText('Cancel'));

    // Should NOT call onSave
    expect(onSave).not.toHaveBeenCalled();
    // Should return to read mode with original content
    expect(screen.queryByTestId('textarea')).toBeNull();
    expect(screen.getByTestId('styled-markdown').textContent).toBe('Hello **world**');
  });

  it('entering edit mode resets draft to current content', () => {
    const { rerender } = render(<EditableMarkdown {...baseProps} onSave={vi.fn()} />);

    // Enter edit, change text, cancel
    fireEvent.click(screen.getByText('Edit'));
    fireEvent.change(screen.getByTestId('textarea'), { target: { value: 'Temp change' } });
    fireEvent.click(screen.getByText('Cancel'));

    // Re-enter edit mode - should show original content, not "Temp change"
    fireEvent.click(screen.getByText('Edit'));
    expect((screen.getByTestId('textarea') as HTMLTextAreaElement).value).toBe('Hello **world**');
  });
});

// ---------------------------------------------------------------------------
// JobProgress
// ---------------------------------------------------------------------------

describe('JobProgress', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () =>
      new Response(JSON.stringify({ id: 'job-1', jobType: 'gather', status: 'pending', progress: 0, createdAt: new Date() }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('renders with "Pending" when job is pending', async () => {
    await act(async () => {
      render(<JobProgress jobId="job-1" />);
    });

    // Let the initial poll complete
    await act(async () => {
      await vi.runOnlyPendingTimersAsync();
    });

    expect(screen.getByText('Pending')).toBeTruthy();
  });

  it('shows progress bar', async () => {
    vi.mocked(globalThis.fetch).mockImplementation(async () =>
      new Response(JSON.stringify({ id: 'job-1', jobType: 'gather', status: 'running', progress: 45, createdAt: new Date() }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    await act(async () => {
      render(<JobProgress jobId="job-1" />);
    });

    await act(async () => {
      await vi.runOnlyPendingTimersAsync();
    });

    const progressBar = screen.getByTestId('progress-bar');
    expect(progressBar).toBeTruthy();
    expect(progressBar.getAttribute('data-value')).toBe('45');
    expect(screen.getByText('45%')).toBeTruthy();
  });

  it('shows "Running" label when job is running', async () => {
    vi.mocked(globalThis.fetch).mockImplementation(async () =>
      new Response(JSON.stringify({ id: 'job-1', jobType: 'gather', status: 'running', progress: 30, createdAt: new Date() }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    await act(async () => {
      render(<JobProgress jobId="job-1" />);
    });

    await act(async () => {
      await vi.runOnlyPendingTimersAsync();
    });

    expect(screen.getByText('Running')).toBeTruthy();
  });

  it('polls the job endpoint', async () => {
    await act(async () => {
      render(<JobProgress jobId="job-42" />);
    });

    // Initial poll
    await act(async () => {
      await vi.runOnlyPendingTimersAsync();
    });

    expect(globalThis.fetch).toHaveBeenCalledWith('/api/data-pipeline/jobs/job-42');

    // Advance time to trigger another poll (interval is 2000ms)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });

    // Should have been called at least twice (initial + 1 interval)
    expect(vi.mocked(globalThis.fetch).mock.calls.length).toBeGreaterThanOrEqual(2);
  });

  it('calls onComplete when job completes', async () => {
    const onComplete = vi.fn();

    vi.mocked(globalThis.fetch).mockImplementation(async () =>
      new Response(JSON.stringify({ id: 'job-1', jobType: 'gather', status: 'completed', progress: 100, createdAt: new Date(), completedAt: new Date() }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    await act(async () => {
      render(<JobProgress jobId="job-1" onComplete={onComplete} />);
    });

    await act(async () => {
      await vi.runOnlyPendingTimersAsync();
    });

    expect(onComplete).toHaveBeenCalledOnce();
    expect(screen.getByText('Completed')).toBeTruthy();
  });

  it('calls onFail when job fails', async () => {
    const onFail = vi.fn();

    vi.mocked(globalThis.fetch).mockImplementation(async () =>
      new Response(JSON.stringify({ id: 'job-1', jobType: 'gather', status: 'failed', progress: 30, error: 'API rate limit exceeded', createdAt: new Date() }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    await act(async () => {
      render(<JobProgress jobId="job-1" onFail={onFail} />);
    });

    await act(async () => {
      await vi.runOnlyPendingTimersAsync();
    });

    expect(onFail).toHaveBeenCalledOnce();
    expect(onFail).toHaveBeenCalledWith('API rate limit exceeded');
  });

  it('shows error message when job fails', async () => {
    vi.mocked(globalThis.fetch).mockImplementation(async () =>
      new Response(JSON.stringify({ id: 'job-1', jobType: 'gather', status: 'failed', progress: 0, error: 'Timeout error', createdAt: new Date() }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    await act(async () => {
      render(<JobProgress jobId="job-1" />);
    });

    await act(async () => {
      await vi.runOnlyPendingTimersAsync();
    });

    expect(screen.getByText('Failed')).toBeTruthy();
    expect(screen.getByText('Timeout error')).toBeTruthy();
  });

  it('stops polling when job completes', async () => {
    vi.mocked(globalThis.fetch).mockImplementation(async () =>
      new Response(JSON.stringify({ id: 'job-1', jobType: 'gather', status: 'completed', progress: 100, createdAt: new Date(), completedAt: new Date() }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    await act(async () => {
      render(<JobProgress jobId="job-1" onComplete={vi.fn()} />);
    });

    await act(async () => {
      await vi.runOnlyPendingTimersAsync();
    });

    const callCountAfterComplete = vi.mocked(globalThis.fetch).mock.calls.length;

    // Advance several intervals
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10000);
    });

    // Fetch count should not have grown (interval was cleared)
    expect(vi.mocked(globalThis.fetch).mock.calls.length).toBe(callCountAfterComplete);
  });

  it('stops polling when job fails', async () => {
    vi.mocked(globalThis.fetch).mockImplementation(async () =>
      new Response(JSON.stringify({ id: 'job-1', jobType: 'gather', status: 'failed', progress: 20, error: 'Error', createdAt: new Date() }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    await act(async () => {
      render(<JobProgress jobId="job-1" onFail={vi.fn()} />);
    });

    await act(async () => {
      await vi.runOnlyPendingTimersAsync();
    });

    const callCountAfterFail = vi.mocked(globalThis.fetch).mock.calls.length;

    await act(async () => {
      await vi.advanceTimersByTimeAsync(10000);
    });

    expect(vi.mocked(globalThis.fetch).mock.calls.length).toBe(callCountAfterFail);
  });

  it('uses "Job failed" as default error when error field is empty', async () => {
    const onFail = vi.fn();

    vi.mocked(globalThis.fetch).mockImplementation(async () =>
      new Response(JSON.stringify({ id: 'job-1', jobType: 'gather', status: 'failed', progress: 0, createdAt: new Date() }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    await act(async () => {
      render(<JobProgress jobId="job-1" onFail={onFail} />);
    });

    await act(async () => {
      await vi.runOnlyPendingTimersAsync();
    });

    expect(onFail).toHaveBeenCalledWith('Job failed');
  });

  it('shows 0% progress initially before polling completes', () => {
    // Don't await - render synchronously without completing fetch
    const { container } = render(<JobProgress jobId="job-1" />);

    expect(screen.getByText('0%')).toBeTruthy();
    expect(screen.getByText('Pending')).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// AdapterSelector
// ---------------------------------------------------------------------------

describe('AdapterSelector', () => {
  const mockAdapters = [
    { key: 'search_google', name: 'Google Search', description: 'Web search via Google', category: 'search', enabled: true },
    { key: 'search_bing', name: 'Bing Search', description: 'Web search via Bing', category: 'search', enabled: true },
    { key: 'social_reddit', name: 'Reddit', description: 'Reddit discussions', category: 'social', enabled: true },
    { key: 'research_arxiv', name: 'arXiv', description: 'Academic papers', category: 'research', enabled: true },
  ];

  beforeEach(() => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () =>
      new Response(JSON.stringify(mockAdapters), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('shows loading state initially', () => {
    render(<AdapterSelector selectedKeys={[]} onChange={vi.fn()} />);

    expect(screen.getByText('Loading adapters...')).toBeTruthy();
  });

  it('fetches adapters on mount', async () => {
    render(<AdapterSelector selectedKeys={[]} onChange={vi.fn()} />);

    await waitFor(() => {
      expect(globalThis.fetch).toHaveBeenCalledWith('/api/data-pipeline/adapters');
    });
  });

  it('renders adapter cards after loading', async () => {
    render(<AdapterSelector selectedKeys={[]} onChange={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('Google Search')).toBeTruthy();
    });

    expect(screen.getByText('Bing Search')).toBeTruthy();
    expect(screen.getByText('Reddit')).toBeTruthy();
    expect(screen.getByText('arXiv')).toBeTruthy();
  });

  it('renders adapter descriptions', async () => {
    render(<AdapterSelector selectedKeys={[]} onChange={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('Web search via Google')).toBeTruthy();
    });

    expect(screen.getByText('Reddit discussions')).toBeTruthy();
    expect(screen.getByText('Academic papers')).toBeTruthy();
  });

  it('groups adapters by category', async () => {
    render(<AdapterSelector selectedKeys={[]} onChange={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('Search & Web')).toBeTruthy();
    });

    expect(screen.getByText('Social & Community')).toBeTruthy();
    expect(screen.getByText('Research & Academic')).toBeTruthy();
  });

  it('shows category count badges', async () => {
    render(<AdapterSelector selectedKeys={[]} onChange={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('Google Search')).toBeTruthy();
    });

    // The "Search" category has 2 adapters, format is "selected/total"
    const badges = screen.getAllByTestId('badge');
    const countBadge = badges.find((b) => b.textContent === '0/2');
    expect(countBadge).toBeTruthy();
  });

  it('marks selected adapters as checked', async () => {
    render(<AdapterSelector selectedKeys={['search_google', 'social_reddit']} onChange={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('Google Search')).toBeTruthy();
    });

    const checkboxes = screen.getAllByTestId('checkbox') as HTMLInputElement[];
    // Google and Reddit should be checked
    const googleCheckbox = checkboxes[0]; // search_google is first in search category
    const bingCheckbox = checkboxes[1];   // search_bing is second
    const redditCheckbox = checkboxes[2]; // social_reddit

    expect(googleCheckbox.checked).toBe(true);
    expect(bingCheckbox.checked).toBe(false);
    expect(redditCheckbox.checked).toBe(true);
  });

  it('clicking unchecked adapter calls onChange to add the key', async () => {
    const onChange = vi.fn();
    render(<AdapterSelector selectedKeys={['search_google']} onChange={onChange} />);

    await waitFor(() => {
      expect(screen.getByText('Bing Search')).toBeTruthy();
    });

    const checkboxes = screen.getAllByTestId('checkbox') as HTMLInputElement[];
    // Bing is at index 1 (second in search category)
    fireEvent.click(checkboxes[1]);

    expect(onChange).toHaveBeenCalledWith(['search_google', 'search_bing']);
  });

  it('clicking checked adapter calls onChange to remove the key', async () => {
    const onChange = vi.fn();
    render(<AdapterSelector selectedKeys={['search_google', 'search_bing']} onChange={onChange} />);

    await waitFor(() => {
      expect(screen.getByText('Google Search')).toBeTruthy();
    });

    const checkboxes = screen.getAllByTestId('checkbox') as HTMLInputElement[];
    // Click Google (index 0) to deselect it
    fireEvent.click(checkboxes[0]);

    expect(onChange).toHaveBeenCalledWith(['search_bing']);
  });

  it('shows empty state when fetch fails', async () => {
    vi.mocked(globalThis.fetch).mockImplementation(async () =>
      new Response('Internal Server Error', { status: 500 })
    );

    render(<AdapterSelector selectedKeys={[]} onChange={vi.fn()} />);

    // Should show 0 selected / 0 total after error
    await waitFor(() => {
      expect(screen.getByText(/0 \/ 0 selected/)).toBeTruthy();
    });
  });

  it('shows toast error when fetch fails', async () => {
    const { toast } = await import('sonner');

    vi.mocked(globalThis.fetch).mockImplementation(async () =>
      new Response('Error', { status: 500 })
    );

    render(<AdapterSelector selectedKeys={[]} onChange={vi.fn()} />);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Failed to load data adapters');
    });
  });

  it('handles API response with { adapters: [...] } format', async () => {
    vi.mocked(globalThis.fetch).mockImplementation(async () =>
      new Response(JSON.stringify({ adapters: mockAdapters }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    render(<AdapterSelector selectedKeys={[]} onChange={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('Google Search')).toBeTruthy();
    });

    expect(screen.getByText('Reddit')).toBeTruthy();
  });
});
