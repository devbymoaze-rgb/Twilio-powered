import { AiAssistant } from "../models/AiAssistant";
import { BusinessProfile } from "../models/BusinessProfile";
import { ComplianceSettings } from "../models/ComplianceSettings";

export async function bootstrapOrganization(organizationId: string, companyName: string) {
  await Promise.all([
    BusinessProfile.create({
      organizationId,
      companyName,
    }),
    AiAssistant.create({
      organizationId,
      tone: "professional",
      autoReplyEnabled: true,
      qualificationQuestions: [
        "What are you looking to accomplish?",
        "What is your timeline?",
        "Who else is involved in the decision?",
      ],
      conversationRules:
        "Answer the contact's question first. Be concise and natural. Do not ask a qualification question after every message. Only qualify when the conversation naturally allows it.",
      escalationRules:
        "Hand off to a human when the contact asks for a person, is frustrated, discusses pricing negotiation, legal issues, or a complex custom request.",
    }),
    ComplianceSettings.create({
      organizationId,
      businessName: companyName,
      requireOptIn: true,
    }),
  ]);
}
