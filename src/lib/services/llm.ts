// LLM Provider Service
// Provides a unified interface for multiple LLM providers:
// OpenAI, Anthropic, Azure OpenAI, Gemini, Z-AI, and Ollama.

import type { LLMConfig } from '../types';

interface ChatMessage {
  role: string;
  content: string;
}

interface ChatOptions {
  temperature?: number;
  maxTokens?: number;
}

export class LLMService {
  private provider: LLMConfig['provider'];
  private apiKey: string;
  private endpoint: string | undefined;
  private model: string;

  private constructor(config: LLMConfig) {
    this.provider = config.provider;
    this.apiKey = config.apiKey;
    this.endpoint = config.apiEndpoint;
    this.model = config.model || this.getDefaultModel();
  }

  /**
   * Factory method to create an LLMService instance from configuration.
   */
  static create(config: LLMConfig): LLMService {
    if (!config.provider) {
      throw new Error('LLM provider must be specified in config');
    }

    // Validate that an API key is provided for cloud providers
    if (['openai', 'anthropic', 'azure', 'z-ai', 'gemini'].includes(config.provider) && !config.apiKey) {
      throw new Error(`API key is required for the ${config.provider} provider. Please configure it in Settings > LLM Provider.`);
    }

    // Validate that an endpoint is provided for providers that need it
    if (['azure', 'ollama'].includes(config.provider) && !config.apiEndpoint) {
      throw new Error(`API endpoint is required for the ${config.provider} provider`);
    }

    // Z-AI requires an endpoint
    if (config.provider === 'z-ai' && !config.apiEndpoint) {
      throw new Error('API endpoint is required for Z-AI. Please enter your Z-AI base URL in Settings.');
    }

    return new LLMService(config);
  }

  /**
   * Returns the default model for each provider.
   */
  private getDefaultModel(): string {
    switch (this.provider) {
      case 'openai':
        return 'gpt-4';
      case 'anthropic':
        return 'claude-sonnet-4-20250514';
      case 'azure':
        return 'gpt-4';
      case 'gemini':
        return 'gemini-2.0-flash';
      case 'z-ai':
        return 'gpt-4';
      case 'ollama':
        return 'llama3';
      default:
        return 'gpt-4';
    }
  }

  /**
   * Sends a chat completion request to the configured LLM provider.
   * Returns the assistant's response text.
   */
  async chat(
    messages: ChatMessage[],
    options?: ChatOptions
  ): Promise<string> {
    switch (this.provider) {
      case 'openai':
        return this.chatWithOpenAI(messages, options);
      case 'anthropic':
        return this.chatWithAnthropic(messages, options);
      case 'azure':
        return this.chatWithAzure(messages, options);
      case 'gemini':
        return this.chatWithGemini(messages, options);
      case 'z-ai':
        return this.chatWithZAI(messages, options);
      case 'ollama':
        return this.chatWithOllama(messages, options);
      default:
        throw new Error(`Unsupported LLM provider: ${this.provider}`);
    }
  }

  /**
   * Streaming chat completion (AsyncGenerator).
   * Yields text chunks as they arrive from the provider.
   */
  async *streamChat(
    messages: ChatMessage[],
    options?: ChatOptions
  ): AsyncGenerator<string> {
    switch (this.provider) {
      case 'openai':
        yield* this.streamOpenAICompatible(
          'https://api.openai.com/v1/chat/completions',
          messages,
          options
        );
        break;
      case 'z-ai':
        yield* this.streamOpenAICompatible(
          `${this.endpoint}/chat/completions`,
          messages,
          options
        );
        break;
      case 'anthropic':
        yield* this.streamAnthropic(messages, options);
        break;
      case 'azure':
        yield* this.streamOpenAICompatible(
          `${this.endpoint}/openai/deployments/${this.model}/chat/completions?api-version=2024-02-01`,
          messages,
          options,
          { 'api-key': this.apiKey }
        );
        break;
      case 'ollama':
        yield* this.streamOllama(messages, options);
        break;
      default:
        throw new Error(`Streaming not supported for provider: ${this.provider}`);
    }
  }

  // ---------------------------------------------------------------------------
  // Provider-specific implementations
  // ---------------------------------------------------------------------------

  /**
   * Chat using the OpenAI REST API.
   */
  private async chatWithOpenAI(
    messages: ChatMessage[],
    options?: ChatOptions
  ): Promise<string> {
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          messages: messages.map((m) => ({ role: m.role, content: m.content })),
          temperature: options?.temperature ?? 0.7,
          max_tokens: options?.maxTokens ?? 4096,
        }),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(
          `OpenAI API error: ${response.status} ${response.statusText} - ${errorBody}`
        );
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;

      if (!content) {
        throw new Error('OpenAI returned an empty response');
      }

      return content;
    } catch (error) {
      if (
        error instanceof Error &&
        (error.message.startsWith('OpenAI API error') ||
          error.message === 'OpenAI returned an empty response')
      ) {
        throw error;
      }
      throw new Error(
        `OpenAI chat request failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Chat using the Z-AI REST API.
   * Z-AI uses an OpenAI-compatible chat/completions endpoint at the user's configured base URL.
   */
  private async chatWithZAI(
    messages: ChatMessage[],
    options?: ChatOptions
  ): Promise<string> {
    try {
      const baseUrl = this.endpoint!.replace(/\/+$/, '');

      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          messages: messages.map((m) => ({ role: m.role, content: m.content })),
          temperature: options?.temperature ?? 0.7,
          max_tokens: options?.maxTokens ?? 4096,
        }),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(
          `Z-AI API error: ${response.status} ${response.statusText} - ${errorBody}`
        );
      }

      const data = await response.json();
      const content =
        data.choices?.[0]?.message?.content ||
        data.content ||
        data.text ||
        '';

      if (!content) {
        throw new Error('Z-AI returned an empty response');
      }

      return content;
    } catch (error) {
      if (
        error instanceof Error &&
        (error.message.startsWith('Z-AI API error') ||
          error.message === 'Z-AI returned an empty response')
      ) {
        throw error;
      }
      throw new Error(
        `Z-AI chat request failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Chat using the Anthropic Messages API.
   */
  private async chatWithAnthropic(
    messages: ChatMessage[],
    options?: ChatOptions
  ): Promise<string> {
    try {
      let systemPrompt: string | undefined;
      const anthropicMessages: Array<{ role: string; content: string }> = [];

      for (const msg of messages) {
        if (msg.role === 'system') {
          systemPrompt = msg.content;
        } else {
          anthropicMessages.push({
            role: msg.role === 'assistant' ? 'assistant' : 'user',
            content: msg.content,
          });
        }
      }

      const body: any = {
        model: this.model,
        messages: anthropicMessages,
        max_tokens: options?.maxTokens ?? 4096,
        temperature: options?.temperature ?? 0.7,
      };

      if (systemPrompt) {
        body.system = systemPrompt;
      }

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(
          `Anthropic API error: ${response.status} ${response.statusText} - ${errorBody}`
        );
      }

      const data = await response.json();
      const content = data.content
        ?.filter((block: any) => block.type === 'text')
        .map((block: any) => block.text)
        .join('');

      if (!content) {
        throw new Error('Anthropic returned an empty response');
      }

      return content;
    } catch (error) {
      if (
        error instanceof Error &&
        (error.message.startsWith('Anthropic API error') ||
          error.message === 'Anthropic returned an empty response')
      ) {
        throw error;
      }
      throw new Error(
        `Anthropic chat request failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Chat using the Google Gemini API.
   */
  private async chatWithGemini(
    messages: ChatMessage[],
    options?: ChatOptions
  ): Promise<string> {
    try {
      // Convert messages to Gemini format
      let systemInstruction: string | undefined;
      const geminiContents: Array<{ role: string; parts: Array<{ text: string }> }> = [];

      for (const msg of messages) {
        if (msg.role === 'system') {
          systemInstruction = msg.content;
        } else {
          geminiContents.push({
            role: msg.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: msg.content }],
          });
        }
      }

      const body: any = {
        contents: geminiContents,
        generationConfig: {
          temperature: options?.temperature ?? 0.7,
          maxOutputTokens: options?.maxTokens ?? 4096,
        },
      };

      if (systemInstruction) {
        body.systemInstruction = { parts: [{ text: systemInstruction }] };
      }

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        }
      );

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(
          `Gemini API error: ${response.status} ${response.statusText} - ${errorBody}`
        );
      }

      const data = await response.json();
      const content = data.candidates?.[0]?.content?.parts
        ?.map((part: any) => part.text)
        .join('');

      if (!content) {
        throw new Error('Gemini returned an empty response');
      }

      return content;
    } catch (error) {
      if (
        error instanceof Error &&
        (error.message.startsWith('Gemini API error') ||
          error.message === 'Gemini returned an empty response')
      ) {
        throw error;
      }
      throw new Error(
        `Gemini chat request failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Chat using the Azure OpenAI REST API.
   */
  private async chatWithAzure(
    messages: ChatMessage[],
    options?: ChatOptions
  ): Promise<string> {
    try {
      const url = `${this.endpoint}/openai/deployments/${this.model}/chat/completions?api-version=2024-02-01`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'api-key': this.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: messages.map((m) => ({ role: m.role, content: m.content })),
          temperature: options?.temperature ?? 0.7,
          max_tokens: options?.maxTokens ?? 4096,
        }),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(
          `Azure OpenAI API error: ${response.status} ${response.statusText} - ${errorBody}`
        );
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;

      if (!content) {
        throw new Error('Azure OpenAI returned an empty response');
      }

      return content;
    } catch (error) {
      if (
        error instanceof Error &&
        (error.message.startsWith('Azure OpenAI API error') ||
          error.message === 'Azure OpenAI returned an empty response')
      ) {
        throw error;
      }
      throw new Error(
        `Azure OpenAI chat request failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Chat using the Ollama local API.
   */
  private async chatWithOllama(
    messages: ChatMessage[],
    options?: ChatOptions
  ): Promise<string> {
    try {
      const endpoint = this.endpoint || 'http://localhost:11434';

      const response = await fetch(`${endpoint}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          messages: messages.map((m) => ({ role: m.role, content: m.content })),
          stream: false,
          options: {
            temperature: options?.temperature ?? 0.7,
            num_predict: options?.maxTokens ?? 4096,
          },
        }),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(
          `Ollama API error: ${response.status} ${response.statusText} - ${errorBody}`
        );
      }

      const data = await response.json();
      const content = data.message?.content;

      if (!content) {
        throw new Error('Ollama returned an empty response');
      }

      return content;
    } catch (error) {
      if (
        error instanceof Error &&
        (error.message.startsWith('Ollama API error') ||
          error.message === 'Ollama returned an empty response')
      ) {
        throw error;
      }
      throw new Error(
        `Ollama chat request failed: ${error instanceof Error ? error.message : String(error)}. ` +
        'Ensure Ollama is running locally.'
      );
    }
  }

  // ---------------------------------------------------------------------------
  // Streaming implementations
  // ---------------------------------------------------------------------------

  private async *streamOpenAICompatible(
    url: string,
    messages: ChatMessage[],
    options?: ChatOptions,
    extraHeaders?: Record<string, string>
  ): AsyncGenerator<string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...extraHeaders,
    };

    if (!extraHeaders?.['api-key']) {
      headers.Authorization = `Bearer ${this.apiKey}`;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: this.model,
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
        temperature: options?.temperature ?? 0.7,
        max_tokens: options?.maxTokens ?? 4096,
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Streaming API error: ${response.status} ${response.statusText} - ${errorBody}`);
    }

    if (!response.body) {
      throw new Error('Response body is null; streaming not supported by the runtime');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data: ')) continue;

          const data = trimmed.slice(6);
          if (data === '[DONE]') return;

          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              yield content;
            }
          } catch {
            // Skip non-JSON lines
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  private async *streamAnthropic(
    messages: ChatMessage[],
    options?: ChatOptions
  ): AsyncGenerator<string> {
    let systemPrompt: string | undefined;
    const anthropicMessages: Array<{ role: string; content: string }> = [];

    for (const msg of messages) {
      if (msg.role === 'system') {
        systemPrompt = msg.content;
      } else {
        anthropicMessages.push({
          role: msg.role === 'assistant' ? 'assistant' : 'user',
          content: msg.content,
        });
      }
    }

    const body: any = {
      model: this.model,
      messages: anthropicMessages,
      max_tokens: options?.maxTokens ?? 4096,
      temperature: options?.temperature ?? 0.7,
      stream: true,
    };

    if (systemPrompt) {
      body.system = systemPrompt;
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Anthropic streaming API error: ${response.status} ${response.statusText} - ${errorBody}`);
    }

    if (!response.body) {
      throw new Error('Response body is null; streaming not supported by the runtime');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data: ')) continue;

          const data = trimmed.slice(6);

          try {
            const parsed = JSON.parse(data);

            if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
              yield parsed.delta.text;
            }

            if (parsed.type === 'message_stop') {
              return;
            }
          } catch {
            // Skip non-JSON lines
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  private async *streamOllama(
    messages: ChatMessage[],
    options?: ChatOptions
  ): AsyncGenerator<string> {
    const endpoint = this.endpoint || 'http://localhost:11434';

    const response = await fetch(`${endpoint}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.model,
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
        stream: true,
        options: {
          temperature: options?.temperature ?? 0.7,
          num_predict: options?.maxTokens ?? 4096,
        },
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Ollama streaming API error: ${response.status} ${response.statusText} - ${errorBody}`);
    }

    if (!response.body) {
      throw new Error('Response body is null; streaming not supported by the runtime');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;

          try {
            const parsed = JSON.parse(trimmed);

            if (parsed.message?.content) {
              yield parsed.message.content;
            }

            if (parsed.done) {
              return;
            }
          } catch {
            // Skip non-JSON lines
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }
}

export default LLMService;
