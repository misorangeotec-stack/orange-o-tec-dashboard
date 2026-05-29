import { useRef, useState } from "react";
import Anthropic from "@anthropic-ai/sdk";

const MODEL = "claude-haiku-4-5-20251001";
const MAX_TOKENS = 2048;
const MAX_TOOL_TURNS = 5;

type ToolExecutor = (name: string, input: Record<string, unknown>) => string;

interface SendOptions {
  tools?: Anthropic.Tool[];
  executor?: ToolExecutor;
  onToolStart?: (name: string) => void;
}

interface UseChatStreamOptions {
  onChunk: (chunk: string) => void;
  onComplete: () => void;
  onError: (err: string) => void;
}

export interface UseChatStreamReturn {
  sendMessage: (
    messages: { role: "user" | "assistant"; content: string }[],
    systemPrompt: string,
    opts?: SendOptions
  ) => Promise<void>;
  isStreaming: boolean;
  abort: () => void;
}

export function useChatStream(options: UseChatStreamOptions): UseChatStreamReturn {
  const [isStreaming, setIsStreaming] = useState(false);
  const clientRef = useRef<Anthropic | null>(null);
  // Store the current iteration's abort fn so the Stop button can cancel it.
  const abortRef = useRef<(() => void) | null>(null);

  if (!clientRef.current) {
    clientRef.current = new Anthropic({
      apiKey: import.meta.env.VITE_ANTHROPIC_API_KEY as string,
      dangerouslyAllowBrowser: true,
    });
  }

  const abort = () => {
    if (abortRef.current) {
      abortRef.current();
      abortRef.current = null;
    }
    setIsStreaming(false);
  };

  const sendMessage = async (
    messages: { role: "user" | "assistant"; content: string }[],
    systemPrompt: string,
    opts?: SendOptions
  ) => {
    const client = clientRef.current;
    if (!client) return;

    setIsStreaming(true);
    let aborted = false;

    // Internal conversation can hold structured content blocks (tool_use /
    // tool_result), separate from the plain-string messages the UI renders.
    const convo: Anthropic.MessageParam[] = messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    try {
      for (let turn = 0; turn < MAX_TOOL_TURNS; turn++) {
        const stream = client.messages.stream({
          model: MODEL,
          max_tokens: MAX_TOKENS,
          system: systemPrompt,
          messages: convo,
          ...(opts?.tools ? { tools: opts.tools } : {}),
        });

        // Re-point abort to THIS iteration's stream each pass.
        abortRef.current = () => {
          aborted = true;
          stream.abort();
        };

        stream.on("text", (text: string) => {
          if (!aborted) options.onChunk(text);
        });

        const final = await stream.finalMessage();
        if (aborted) return;

        // No tool calls → this is the final answer.
        if (final.stop_reason !== "tool_use" || !opts?.executor) {
          options.onComplete();
          return;
        }

        // Record the assistant turn (with its tool_use blocks), then run each tool
        // locally and feed the results back for the next turn.
        convo.push({ role: "assistant", content: final.content });

        const toolResults: Anthropic.ToolResultBlockParam[] = [];
        for (const block of final.content) {
          if (block.type !== "tool_use") continue;
          opts.onToolStart?.(block.name);
          const out = opts.executor(block.name, (block.input ?? {}) as Record<string, unknown>);
          toolResults.push({
            type: "tool_result",
            tool_use_id: block.id,
            content: out,
          });
        }

        convo.push({ role: "user", content: toolResults });
        // loop continues → model sees tool results and produces its answer
      }

      // Exhausted the tool-turn budget without a final text answer.
      if (!aborted) options.onComplete();
    } catch (err) {
      if (!aborted) {
        const message =
          err instanceof Error ? err.message : "An error occurred. Please try again.";
        if (message.includes("401") || message.includes("API key")) {
          options.onError(
            "Invalid API key. Please set VITE_ANTHROPIC_API_KEY in your .env.local file."
          );
        } else if (message.includes("network") || message.includes("fetch")) {
          options.onError("Network error. Please check your connection.");
        } else {
          options.onError(message);
        }
      }
    } finally {
      abortRef.current = null;
      setIsStreaming(false);
    }
  };

  return { sendMessage, isStreaming, abort };
}
