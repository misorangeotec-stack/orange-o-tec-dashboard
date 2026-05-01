import * as SheetPrimitive from "@radix-ui/react-dialog";
import { useEffect, useRef, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChatMessage } from "./ChatMessage";
import { ChatSuggestions } from "./ChatSuggestions";
import { buildChatContext } from "@/lib/buildChatContext";
import { buildSystemPrompt } from "@/lib/buildSystemPrompt";
import { useChatStream } from "@/hooks/useChatStream";
import type { ChatMessage as ChatMessageType, ChatPageContext } from "@/lib/chatTypes";
import type { Customer, DashboardData, CustomerDetail, KPIs } from "@/lib/types";
import type { EximSummary } from "@/lib/eximTypes";

interface ChatPanelProps {
  isOpen: boolean;
  onClose: () => void;
  pageCtx: ChatPageContext;
  allCustomers: Customer[];
  dashboard: DashboardData | null;
  customerDetail: Record<string, CustomerDetail>;
  kpis: KPIs | null;
  eximSummary?: EximSummary | null;
}

export function ChatPanel({
  isOpen,
  onClose,
  pageCtx,
  allCustomers,
  dashboard,
  customerDetail,
  kpis,
  eximSummary,
}: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [inputValue, setInputValue] = useState("");
  const scrollBottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const { sendMessage, isStreaming, abort } = useChatStream({
    onChunk: (chunk) => {
      setMessages((prev) => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        if (last && last.role === "assistant") {
          updated[updated.length - 1] = {
            ...last,
            content: last.content + chunk,
          };
        }
        return updated;
      });
    },
    onComplete: () => {
      setMessages((prev) => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        if (last && last.role === "assistant") {
          updated[updated.length - 1] = { ...last, isStreaming: false };
        }
        return updated;
      });
    },
    onError: (err) => {
      setMessages((prev) => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        if (last && last.role === "assistant") {
          updated[updated.length - 1] = {
            ...last,
            content: `Error: ${err}`,
            isStreaming: false,
          };
        }
        return updated;
      });
    },
  });

  // Auto-scroll to bottom when messages update
  useEffect(() => {
    scrollBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input when panel opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  const handleSend = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isStreaming) return;

    setInputValue("");

    const userMessage: ChatMessageType = {
      id: crypto.randomUUID(),
      role: "user",
      content: trimmed,
      timestamp: new Date(),
    };

    const assistantMessage: ChatMessageType = {
      id: crypto.randomUUID(),
      role: "assistant",
      content: "",
      timestamp: new Date(),
      isStreaming: true,
    };

    setMessages((prev) => [...prev, userMessage, assistantMessage]);

    // Build context and system prompt at send time (not render time)
    const slicedContext = buildChatContext(
      pageCtx,
      allCustomers,
      dashboard,
      customerDetail,
      kpis,
      eximSummary
    );
    const systemPrompt = buildSystemPrompt(pageCtx, slicedContext);

    // Build conversation history (exclude current streaming assistant message)
    const history = [...messages, userMessage].map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

    await sendMessage(history, systemPrompt);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend(inputValue);
    }
  };

  const handleClear = () => {
    setMessages([]);
    setInputValue("");
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  return (
    <SheetPrimitive.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetPrimitive.Portal>
        {/* No SheetOverlay — background stays visible and interactive */}
        <SheetPrimitive.Content
          className="fixed inset-y-0 right-0 z-50 w-[500px] max-w-[95vw]
                     bg-background border-l border-border shadow-2xl
                     flex flex-col
                     data-[state=open]:animate-in data-[state=closed]:animate-out
                     data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right
                     duration-300"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          {/* Required for accessibility */}
          <SheetPrimitive.Title className="sr-only">AI Assistant</SheetPrimitive.Title>
          <SheetPrimitive.Description className="sr-only">
            Ask questions about your receivables data
          </SheetPrimitive.Description>

          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
            <div className="flex items-center gap-2">
              <svg
                className="w-4 h-4 text-primary shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                />
              </svg>
              <span className="text-sm font-semibold text-foreground">Ask AI</span>
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                claude-haiku
              </Badge>
            </div>
            <div className="flex items-center gap-1">
              {messages.length > 0 && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={handleClear}
                  title="Clear conversation"
                >
                  <svg
                    className="w-3.5 h-3.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                </Button>
              )}
              <SheetPrimitive.Close asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7">
                  <svg
                    className="w-3.5 h-3.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </Button>
              </SheetPrimitive.Close>
            </div>
          </div>

          {/* Messages area */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden px-4 py-3">
            {messages.length === 0 ? (
              <ChatSuggestions pageCtx={pageCtx} onSelect={handleSend} />
            ) : (
              messages.map((msg) => <ChatMessage key={msg.id} message={msg} />)
            )}
            <div ref={scrollBottomRef} />
          </div>

          {/* Input area */}
          <div className="border-t border-border px-4 py-3 shrink-0 space-y-2">
            <div className="flex gap-2 items-end">
              <Textarea
                ref={inputRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about customers, invoices, overdue..."
                className="min-h-[44px] max-h-[120px] resize-none text-sm flex-1"
                disabled={isStreaming}
                rows={1}
              />
              {isStreaming ? (
                <Button
                  variant="outline"
                  size="icon"
                  className="h-10 w-10 shrink-0"
                  onClick={abort}
                  title="Stop generating"
                >
                  <svg
                    className="w-3.5 h-3.5"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <rect x="6" y="6" width="12" height="12" rx="1" />
                  </svg>
                </Button>
              ) : (
                <Button
                  size="icon"
                  className="h-10 w-10 shrink-0"
                  onClick={() => handleSend(inputValue)}
                  disabled={!inputValue.trim()}
                  title="Send (Enter)"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                    />
                  </svg>
                </Button>
              )}
            </div>
            <p className="text-[10px] text-muted-foreground text-center">
              Answers based on receivables data as of{" "}
              {dashboard?.asOfDate ?? "2026-03-25"} · Enter to send · Shift+Enter for newline
            </p>
          </div>
        </SheetPrimitive.Content>
      </SheetPrimitive.Portal>
    </SheetPrimitive.Root>
  );
}
