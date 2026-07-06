// T017 - API functions to interact with the backend agent streaming route
import { v4 as uuidv4 } from 'uuid';

export interface AgentStreamChunk {
  id?: string;
  steps?: Array<{
    role: string;
    content?: Array<{
      text?: string;
    }>;
    // other fields omitted
  }>;
}

export async function streamAgentResponse(
  input: string, 
  previousInteractionId: string | null,
  onChunk: (text: string, rawChunk: any) => void
): Promise<{ interactionId: string }> {
  
  const response = await fetch('/api/agent/stream', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ input, previousInteractionId }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || `Request failed with status ${response.status}`);
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error("No readable stream available");

  const decoder = new TextDecoder();
  let interactionId = '';
  let buffer = '';

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    
    // Process SSE lines
    const lines = buffer.split('\n\n');
    buffer = lines.pop() || ''; // Keep the incomplete line in the buffer

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const jsonStr = line.substring(6).trim();
        if (jsonStr) {
          try {
            const chunk = JSON.parse(jsonStr) as AgentStreamChunk;
            if (chunk.id) {
              interactionId = chunk.id;
            }
            
            // Extract text from the chunk
            let newText = '';
            if (chunk.steps && chunk.steps.length > 0) {
              const step = chunk.steps[chunk.steps.length - 1];
              if (step.content && step.content.length > 0 && step.content[0].text) {
                newText = step.content[0].text;
              }
            }
            
            onChunk(newText, chunk);
          } catch (e) {
            console.error("Error parsing SSE chunk JSON", e, jsonStr);
          }
        }
      }
    }
  }

  return { interactionId };
}
