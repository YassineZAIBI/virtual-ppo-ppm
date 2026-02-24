// Tool Call Parser — extracts structured tool_call blocks from LLM response text

export interface ParsedToolCall {
  tool: string;
  args: Record<string, any>;
  reason: string;
}

/**
 * Parses the LLM response to extract tool_call JSON blocks.
 * Returns the clean display text (with blocks removed) and the parsed tool calls.
 */
export function parseToolCalls(responseText: string): {
  cleanText: string;
  toolCalls: ParsedToolCall[];
} {
  const toolCalls: ParsedToolCall[] = [];

  // Match ```tool_call ... ``` blocks (with optional whitespace variations)
  const regex = /```tool_call\s*\n([\s\S]*?)```/g;
  let match;

  while ((match = regex.exec(responseText)) !== null) {
    try {
      const jsonStr = match[1].trim();
      const parsed = JSON.parse(jsonStr);
      if (parsed.tool && typeof parsed.tool === 'string') {
        toolCalls.push({
          tool: parsed.tool,
          args: parsed.args || {},
          reason: parsed.reason || '',
        });
      }
    } catch {
      // LLM produced malformed JSON — skip this block silently
      console.warn('Failed to parse tool_call block:', match[1]?.substring(0, 200));
    }
  }

  // Remove tool_call blocks from the display text
  const cleanText = responseText
    .replace(/```tool_call\s*\n[\s\S]*?```/g, '')
    .replace(/\n{3,}/g, '\n\n') // collapse excessive newlines
    .trim();

  return { cleanText, toolCalls };
}
