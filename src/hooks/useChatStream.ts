import { useRef, useState } from "react";
import Anthropic from "@anthropic-ai/sdk";

interface UseChatStreamOptions {
  onChunk: (chunk: string) => void;
  onComplete: () => void;
  onError: (err: string) => void;
}

export interface UseChatStreamReturn {
  sendMessage: (
    messages: { role: "user" | "assistant"; content: string }[],
    systemPrompt: string
  ) => Promise<void>;
  isStreaming: boolean;
  abort: () => void;
}

export function useChatStream(options: UseChatStreamOptions): UseChatStreamReturn {
  const [isStreaming, setIsStreaming] = useState(false);
  const clientRef = useRef<Anthropic | null>(null);
  // Store the stream's controller so we can abort it
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
    systemPrompt: string
  ) => {
    if (!clientRef.current) return;

    setIsStreaming(true);
    let aborted = false;

    try {
      const stream = clientRef.current.messages.stream({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1024,
        system: systemPrompt,
        messages,
      });

      // Allow aborting by calling stream's controller
      abortRef.current = () => {
        aborted = true;
        stream.abort();
      };

      stream.on("text", (text: string) => {
        if (!aborted) {
          options.onChunk(text);
        }
      });

      await stream.finalMessage();

      if (!aborted) {
        options.onComplete();
      }
    } catch (err) {
      if (!aborted) {
        const message =
          err instanceof Error ? err.message : "An error occurred. Please try again.";
        // Provide a helpful message for missing API key
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
