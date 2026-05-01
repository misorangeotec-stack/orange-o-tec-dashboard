export type ChatRole = "user" | "assistant";

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
}

export type PageContext =
  | "dashboard"
  | "risk-register"
  | "customer-detail"
  | "alerts"
  | "exim"
  | "other";

export interface ChatPageContext {
  page: PageContext;
  customerId?: string;
  customerName?: string;
}
