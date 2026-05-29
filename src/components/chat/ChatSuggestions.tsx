import type { PageContext, ChatPageContext } from "@/lib/chatTypes";

const SUGGESTIONS: Record<PageContext, string[]> = {
  dashboard: [
    "How much collection received from customers of Karan in the last 27 days?",
    "What is our total overdue and how does it compare to outstanding?",
    "Show me outstanding broken down by salesperson.",
    "Show me the top 5 customers by overdue amount.",
  ],
  "risk-register": [
    "List all critical customers and their outstanding amounts.",
    "Which customers are over their credit limit?",
    "Which salesperson has the highest overdue?",
    "Compare O-tec vs Enterprise outstanding totals.",
  ],
  "customer-detail": [
    "Why is this customer classified at their current risk level?",
    "Which invoices are still unpaid and by how much?",
    "Has this customer's outstanding been increasing or decreasing?",
    "What is the credit limit utilization for this customer?",
  ],
  alerts: [
    "How many critical alerts are there right now?",
    "Which customers triggered credit limit breach alerts?",
    "List all customers overdue beyond 180 days.",
    "What is the combined outstanding for all alerted customers?",
  ],
  exim: [
    "Which category has the highest import value?",
    "Who are the top 5 sellers by quantity and which countries do they come from?",
    "What is the average unit price for UV Inkjet imports?",
    "Which buyers are sourcing the most products and from which countries?",
  ],
  other: [
    "What is the total outstanding across all customers?",
    "Who are the riskiest customers?",
    "What is the total overdue amount?",
    "How many customers are over their credit limit?",
  ],
};

interface ChatSuggestionsProps {
  pageCtx: ChatPageContext;
  onSelect: (question: string) => void;
}

export function ChatSuggestions({ pageCtx, onSelect }: ChatSuggestionsProps) {
  const questions = SUGGESTIONS[pageCtx.page] ?? SUGGESTIONS.other;

  return (
    <div className="flex flex-col gap-4 py-4">
      <div className="text-center">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
          <svg
            className="w-5 h-5 text-primary"
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
        </div>
        <p className="text-sm font-medium text-foreground">Ask about your data</p>
        <p className="text-xs text-muted-foreground mt-1">
          Questions are answered using your live receivables data
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide px-1">
          Suggested questions
        </p>
        {questions.map((q) => (
          <button
            key={q}
            onClick={() => onSelect(q)}
            className="text-left text-xs px-3 py-2 rounded-lg border border-border bg-background
                       hover:bg-muted/50 hover:border-primary/30 transition-colors
                       text-foreground leading-snug"
          >
            {q}
          </button>
        ))}
      </div>
    </div>
  );
}
