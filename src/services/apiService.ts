import { Model, ModelResponse } from '../types';

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ChatRequestOptions {
  messages: ChatMessage[];
  model: Model;
  temperature: number;
  maxTokens: number;
  signal?: AbortSignal;
  onChunk: (chunk: string) => void;
}

const activeAbortControllers = new Map<string, AbortController>();

export async function sendChatRequest(options: ChatRequestOptions): Promise<void> {
  const { messages, model, temperature, maxTokens, signal, onChunk } = options;
  
  const requestId = crypto.randomUUID();
  
  try {
    const isOpenAI = model.baseUrl.includes('openai.com');
    const endpoint = isOpenAI 
      ? `${model.baseUrl}/chat/completions` 
      : `${model.baseUrl}/chat/completions`;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${model.apiKey}`
      },
      body: JSON.stringify({
        model: model.modelName,
        messages,
        temperature,
        max_tokens: maxTokens,
        stream: true
      }),
      signal
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API request failed: ${response.status} ${errorText}`);
    }

    if (!response.body) {
      throw new Error('Response body is empty');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      buffer += chunk;

      // Process complete server-sent events
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          
          if (data === '[DONE]') {
            break;
          }

          try {
            const json = JSON.parse(data);
            let content = '';
            
            if (isOpenAI) {
              // OpenAI format
              content = json.choices?.[0]?.delta?.content || '';
            } else {
              // Handle other API formats as needed
              content = json.choices?.[0]?.delta?.content || 
                       json.choices?.[0]?.text || 
                       json.output || 
                       '';
            }
            
            if (content) {
              onChunk(content);
            }
          } catch (e) {
            console.warn('Failed to parse SSE data:', data);
          }
        }
      }
    }
  } catch (error: any) {
    if (error.name === 'AbortError') {
      throw new Error('Request was cancelled');
    }
    throw error;
  } finally {
    activeAbortControllers.delete(requestId);
  }
}

export function abortRequest(requestId: string): void {
  const controller = activeAbortControllers.get(requestId);
  if (controller) {
    controller.abort();
    activeAbortControllers.delete(requestId);
  }
}