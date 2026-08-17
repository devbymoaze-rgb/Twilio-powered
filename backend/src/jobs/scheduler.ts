import { Message } from "../models/Message";
import { Conversation } from "../models/Conversation";
import { resumeWaitingRuns, runAutomations } from "../services/automationEngine";
import { resumeScheduledCampaigns } from "../services/campaignService";

let timer: NodeJS.Timeout | null = null;

async function tick() {
  try {
    await resumeScheduledCampaigns();
    await resumeWaitingRuns();

    const cutoff = new Date(Date.now() - 30 * 60_000);
    const stale = await Conversation.find({
      status: "open",
      lastMessageAt: { $lte: cutoff },
      $or: [{ noResponseFiredAt: { $exists: false } }, { noResponseFiredAt: { $lt: cutoff } }],
    }).limit(20);

    for (const conversation of stale) {
      const last = await Message.findOne({ conversationId: conversation._id }).sort({ createdAt: -1 });
      if (last?.direction === "outbound") {
        await runAutomations({
          organizationId: String(conversation.organizationId),
          triggerType: "no_response",
          contactId: String(conversation.contactId),
          conversationId: String(conversation._id),
        });
        conversation.set("noResponseFiredAt", new Date());
        await conversation.save();
      }
    }
  } catch (error) {
    console.error("Scheduler tick failed", error);
  }
}

export function startScheduler() {
  if (timer) return;
  timer = setInterval(() => {
    void tick();
  }, 60_000);
  void tick();
}

export function stopScheduler() {
  if (timer) clearInterval(timer);
  timer = null;
}
