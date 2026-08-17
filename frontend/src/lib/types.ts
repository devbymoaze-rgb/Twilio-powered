export type OnboardingStep =
  | "account"
  | "business"
  | "use_case"
  | "twilio"
  | "sms_number"
  | "business_profile"
  | "ai_personality"
  | "compliance"
  | "first_automation"
  | "complete";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: "owner" | "admin" | "agent";
  organizationId: string;
  onboardingCompleted: boolean;
  onboardingStep: OnboardingStep;
  organizationName?: string;
  plan?: string;
}

export interface Contact {
  _id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  tags: string[];
  leadScore: number;
  consentStatus: "opted_in" | "opted_out" | "unknown";
  optInSource?: string;
  lastMessageAt?: string;
  conversationStatus: string;
  assignedAgentId?: { _id: string; name: string; email: string } | string;
}

export interface Conversation {
  _id: string;
  status: "open" | "closed" | "needs_human" | "qualified";
  unreadCount: number;
  lastMessageAt: string;
  lastMessagePreview: string;
  handledBy: "ai" | "human" | "mixed";
  intent?: string;
  sentiment?: string;
  leadScore: number;
  aiSummary?: string;
  tags?: string[];
  nextBestAction?: string;
  objection?: string;
  contactId: Contact | string;
  assignedAgentId?: { _id: string; name: string; email: string } | null;
}

export interface Message {
  _id: string;
  direction: "inbound" | "outbound";
  body: string;
  status: string;
  source: string;
  mediaUrls?: string[];
  createdAt: string;
  senderId?: { name?: string };
}

export interface Campaign {
  _id: string;
  name: string;
  message: string;
  aiPersonalization: boolean;
  status: "draft" | "scheduled" | "running" | "paused" | "completed";
  scheduledAt?: string;
  rateLimitPerMinute: number;
  audience?: {
    type?: string;
    tags?: string[];
    consentOnly?: boolean;
  };
  stats: {
    targeted: number;
    sent: number;
    delivered: number;
    failed: number;
    replies: number;
    optOuts: number;
    qualifiedLeads: number;
  };
}

export interface Automation {
  _id: string;
  name: string;
  description?: string;
  status: "draft" | "active" | "paused";
  triggerType: string;
  triggerConfig?: Record<string, unknown>;
  nodes: Array<{
    id: string;
    type: "trigger" | "condition" | "action";
    position: { x: number; y: number };
    data?: Record<string, unknown>;
  }>;
  edges: Array<{
    id: string;
    source: string;
    target: string;
    sourceHandle?: string;
  }>;
  runCount: number;
  lastRunAt?: string;
}

export interface KnowledgeArticle {
  _id: string;
  category: string;
  title: string;
  content: string;
  published: boolean;
  updatedAt: string;
}
