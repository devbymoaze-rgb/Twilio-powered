import type { Types } from "mongoose";

export type UserRole = "owner" | "admin" | "agent";

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

export type SmsUseCase =
  | "lead_generation"
  | "customer_support"
  | "follow_ups"
  | "appointment_reminders"
  | "marketing"
  | "other";

export type ConsentStatus = "opted_in" | "opted_out" | "unknown";

export type ConversationStatus = "open" | "closed" | "needs_human" | "qualified";

export type HandledBy = "ai" | "human" | "mixed";

export type MessageDirection = "inbound" | "outbound";

export type MessageStatus =
  | "queued"
  | "sent"
  | "delivered"
  | "failed"
  | "undelivered"
  | "received";

export type MessageSource = "ai" | "human" | "automation" | "campaign" | "system";

export type CampaignStatus = "draft" | "scheduled" | "running" | "paused" | "completed";

export type AutomationStatus = "draft" | "active" | "paused";

export type AutomationTriggerType =
  | "contact_added"
  | "campaign_started"
  | "sms_received"
  | "sms_delivered"
  | "no_response"
  | "keyword_received"
  | "lead_qualified"
  | "appointment_booked";

export type AutomationConditionType =
  | "intent"
  | "lead_score"
  | "tags"
  | "contact_field"
  | "time_elapsed"
  | "consent_status";

export type AutomationActionType =
  | "send_sms"
  | "generate_ai_reply"
  | "wait"
  | "add_tag"
  | "update_lead_score"
  | "assign_agent"
  | "create_task"
  | "notify_team"
  | "human_handoff"
  | "stop_automation";

export type KnowledgeCategory =
  | "products"
  | "services"
  | "pricing"
  | "faqs"
  | "policies"
  | "company";

export type Sentiment = "positive" | "neutral" | "negative" | "mixed";

export interface AuthPayload {
  userId: string;
  organizationId: string;
  role: UserRole;
}

export interface RequestUser extends AuthPayload {
  email: string;
  name: string;
}

export type ObjectIdLike = Types.ObjectId | string;
