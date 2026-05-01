import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { ChatMessage as ChatMessageType } from "@/lib/chatTypes";

interface ChatMessageProps {
  message: ChatMessageType;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === "user";
  const time = message.timestamp.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className={`flex flex-col gap-1 ${isUser ? "items-end" : "items-start"} mb-3`}>
      <div
        className={`px-3 py-2 text-sm leading-relaxed ${
          isUser
            ? "max-w-[85%] bg-primary text-primary-foreground rounded-2xl rounded-tr-sm"
            : "w-full bg-muted/70 border border-border text-foreground rounded-2xl rounded-tl-sm"
        }`}
      >
        {message.isStreaming && message.content === "" ? (
          // Typing indicator: three bouncing dots
          <div className="flex items-center gap-1 py-1 px-1">
            <span
              className="w-1.5 h-1.5 rounded-full bg-current opacity-60 animate-bounce"
              style={{ animationDelay: "0ms" }}
            />
            <span
              className="w-1.5 h-1.5 rounded-full bg-current opacity-60 animate-bounce"
              style={{ animationDelay: "150ms" }}
            />
            <span
              className="w-1.5 h-1.5 rounded-full bg-current opacity-60 animate-bounce"
              style={{ animationDelay: "300ms" }}
            />
          </div>
        ) : isUser ? (
          // User messages: plain text, no markdown needed
          <div className="whitespace-pre-wrap break-words">{message.content}</div>
        ) : (
          // Assistant messages: full markdown rendering
          <div className="prose-chat">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                // Headings
                h1: ({ children }) => (
                  <p className="font-bold text-base mt-2 mb-1 text-foreground">{children}</p>
                ),
                h2: ({ children }) => (
                  <p className="font-semibold text-sm mt-2 mb-1 text-foreground">{children}</p>
                ),
                h3: ({ children }) => (
                  <p className="font-semibold text-sm mt-1 mb-0.5 text-foreground">{children}</p>
                ),
                // Paragraphs
                p: ({ children }) => (
                  <p className="mb-1.5 last:mb-0 leading-relaxed">{children}</p>
                ),
                // Bold / italic
                strong: ({ children }) => (
                  <strong className="font-semibold text-foreground">{children}</strong>
                ),
                em: ({ children }) => <em className="italic opacity-90">{children}</em>,
                // Inline code
                code: ({ children, className }) => {
                  const isBlock = className?.includes("language-");
                  if (isBlock) {
                    return (
                      <code className="block bg-background/60 border border-border rounded px-2 py-1 text-xs font-mono my-1 whitespace-pre-wrap overflow-x-auto">
                        {children}
                      </code>
                    );
                  }
                  return (
                    <code className="bg-background/60 border border-border rounded px-1 py-0.5 text-xs font-mono">
                      {children}
                    </code>
                  );
                },
                pre: ({ children }) => <div className="my-1">{children}</div>,
                // Bullet lists
                ul: ({ children }) => (
                  <ul className="list-disc list-outside pl-4 mb-1.5 space-y-0.5">{children}</ul>
                ),
                // Ordered lists
                ol: ({ children }) => (
                  <ol className="list-decimal list-outside pl-4 mb-1.5 space-y-0.5">{children}</ol>
                ),
                li: ({ children }) => <li className="leading-relaxed">{children}</li>,
                // Blockquote
                blockquote: ({ children }) => (
                  <blockquote className="border-l-2 border-primary/40 pl-3 italic opacity-80 my-1">
                    {children}
                  </blockquote>
                ),
                // Horizontal rule
                hr: () => <hr className="border-border my-2" />,
                // Tables — the key fix for the screenshot issue
                table: ({ children }) => (
                  <div className="overflow-x-auto my-2 rounded border border-border max-w-full">
                    <table className="text-xs border-collapse whitespace-nowrap">{children}</table>
                  </div>
                ),
                thead: ({ children }) => (
                  <thead className="bg-muted/80 text-foreground">{children}</thead>
                ),
                tbody: ({ children }) => (
                  <tbody className="divide-y divide-border">{children}</tbody>
                ),
                tr: ({ children }) => <tr className="hover:bg-muted/30 transition-colors">{children}</tr>,
                th: ({ children }) => (
                  <th className="px-2 py-1.5 text-left font-semibold text-foreground border-r border-border last:border-r-0 whitespace-nowrap">
                    {children}
                  </th>
                ),
                td: ({ children }) => (
                  <td className="px-2 py-1.5 border-r border-border last:border-r-0 align-top">
                    {children}
                  </td>
                ),
              }}
            >
              {message.content}
            </ReactMarkdown>
            {message.isStreaming && (
              <span className="inline-block w-0.5 h-3.5 bg-current ml-0.5 animate-pulse align-middle" />
            )}
          </div>
        )}
      </div>
      <span className="text-[10px] text-muted-foreground px-1">{time}</span>
    </div>
  );
}
