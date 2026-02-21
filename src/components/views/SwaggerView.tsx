'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Upload, TestTube, Download, Loader2, FileCode } from 'lucide-react';
import { toast } from 'sonner';

export function SwaggerView() {
  const { settings } = useAppStore();
  const [swaggerContent, setSwaggerContent] = useState('');
  const [testCases, setTestCases] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [endpoints, setEndpoints] = useState<Array<{ path: string; method: string; description: string }>>([]);

  const sampleSwagger = JSON.stringify({
    openapi: "3.0.0",
    info: { title: "Sample API", version: "1.0.0" },
    paths: {
      "/users": {
        get: { summary: "Get all users", responses: { "200": { description: "Success" } } },
        post: { summary: "Create user", requestBody: { content: { "application/json": { schema: { type: "object", properties: { name: { type: "string" }, email: { type: "string" } } } } } }, responses: { "201": { description: "Created" } } }
      },
      "/users/{id}": {
        get: { summary: "Get user by ID", parameters: [{ name: "id", in: "path", required: true }], responses: { "200": { description: "Success" }, "404": { description: "Not found" } } },
        put: { summary: "Update user", responses: { "200": { description: "Updated" } } },
        delete: { summary: "Delete user", responses: { "204": { description: "Deleted" } } }
      }
    }
  }, null, 2);

  const handleGenerateTestCases = async () => {
    const content = swaggerContent || sampleSwagger;
    setIsGenerating(true);
    try {
      const parsed = JSON.parse(content);
      const eps: Array<{ path: string; method: string; description: string }> = [];

      if (parsed.paths) {
        Object.entries(parsed.paths).forEach(([path, methods]: [string, any]) => {
          Object.entries(methods).forEach(([method, details]: [string, any]) => {
            if (['get', 'post', 'put', 'delete', 'patch'].includes(method)) {
              eps.push({ path, method: method.toUpperCase(), description: details.summary || '' });
            }
          });
        });
      }
      setEndpoints(eps);

      // Use AI to generate intelligent test cases
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `Given this OpenAPI specification, generate comprehensive test cases for each endpoint. Include positive tests, negative tests, edge cases, security tests, and performance considerations. Format each test case clearly.\n\nSpec:\n${content}`,
          history: [],
          settings: { llm: settings.llm },
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const lines = data.response.split('\n').filter((l: string) => l.trim());
        setTestCases(lines);
        toast.success(`Generated test cases for ${eps.length} endpoints!`);
      } else {
        // Fallback to local generation
        const cases: string[] = [];
        eps.forEach(ep => {
          cases.push(`# TEST: ${ep.method} ${ep.path} - ${ep.description}`);
          cases.push(`  [POSITIVE] Should return success status code`);
          cases.push(`  [NEGATIVE] Should return 400 on invalid input`);
          cases.push(`  [AUTH] Should return 401 on unauthorized access`);
          cases.push(`  [NOT_FOUND] Should return 404 for non-existent resources`);
          cases.push(`  [EDGE] Should handle empty, null, and boundary values`);
          if (ep.method === 'POST' || ep.method === 'PUT') {
            cases.push(`  [VALIDATION] Should validate required fields`);
            cases.push(`  [VALIDATION] Should reject invalid data types`);
          }
          if (ep.method === 'DELETE') {
            cases.push(`  [IDEMPOTENT] Should be idempotent on repeated calls`);
          }
          cases.push('');
        });
        setTestCases(cases);
        toast.success(`Generated ${eps.length} endpoints and test cases locally`);
      }
    } catch (e) {
      toast.error('Invalid Swagger/OpenAPI JSON. Please check your input.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleExportTests = () => {
    const content = testCases.join('\n');
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `test-cases-${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Test cases exported!');
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Swagger/API Management</h1>
          <p className="text-slate-500">Upload API specs and generate AI-powered test cases</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setSwaggerContent(sampleSwagger)}>
            <Upload className="h-4 w-4 mr-2" />Load Sample
          </Button>
          <Button onClick={handleGenerateTestCases} disabled={isGenerating}>
            {isGenerating ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Generating...</>
            ) : (
              <><TestTube className="h-4 w-4 mr-2" />Generate Tests</>
            )}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>OpenAPI/Swagger Specification</CardTitle>
            <CardDescription>Paste your OpenAPI 3.0 or Swagger 2.0 JSON</CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              value={swaggerContent}
              onChange={(e) => setSwaggerContent(e.target.value)}
              placeholder="Paste your Swagger/OpenAPI JSON here..."
              className="min-h-[300px] font-mono text-sm"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Detected Endpoints ({endpoints.length})</CardTitle></CardHeader>
          <CardContent>
            {endpoints.length === 0 ? (
              <div className="text-center py-8">
                <FileCode className="h-12 w-12 mx-auto mb-4 text-slate-300" />
                <p className="text-slate-500">Generate tests to see endpoints</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[300px] overflow-auto">
                {endpoints.map((ep, i) => (
                  <div key={i} className="flex items-center gap-2 p-2 bg-slate-50 dark:bg-slate-800 rounded">
                    <Badge className={cn('w-16 justify-center text-white',
                      ep.method === 'GET' && 'bg-green-500',
                      ep.method === 'POST' && 'bg-blue-500',
                      ep.method === 'PUT' && 'bg-amber-500',
                      ep.method === 'DELETE' && 'bg-red-500',
                      ep.method === 'PATCH' && 'bg-purple-500',
                    )}>{ep.method}</Badge>
                    <code className="text-sm flex-1 font-mono">{ep.path}</code>
                    <span className="text-xs text-slate-500">{ep.description}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {testCases.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Generated Test Cases</CardTitle>
            <Button variant="outline" size="sm" onClick={handleExportTests}>
              <Download className="h-4 w-4 mr-2" />Export
            </Button>
          </CardHeader>
          <CardContent>
            <pre className="bg-slate-900 text-green-400 p-4 rounded-lg text-sm overflow-auto max-h-[400px] whitespace-pre-wrap">
              {testCases.join('\n')}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
