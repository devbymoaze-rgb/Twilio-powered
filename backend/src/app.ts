import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import { env } from "./config/env";
import { errorHandler } from "./middleware/errorHandler";
import authRoutes from "./routes/auth";
import onboardingRoutes from "./routes/onboarding";
import contactRoutes from "./routes/contacts";
import conversationRoutes from "./routes/conversations";
import campaignRoutes from "./routes/campaigns";
import automationRoutes from "./routes/automations";
import twilioRoutes from "./routes/twilio";
import webhookRoutes from "./routes/webhooks";
import dashboardRoutes from "./routes/dashboard";
import analyticsRoutes from "./routes/analytics";
import assistantRoutes from "./routes/assistant";
import knowledgeRoutes from "./routes/knowledge";
import settingsRoutes from "./routes/settings";

export function createApp() {
  const app = express();

  app.set("trust proxy", 1);
  app.use(helmet());
  app.use(
    cors({
      origin: env.frontendUrl,
      credentials: true,
    })
  );
  app.use("/api/webhooks/twilio", express.urlencoded({ extended: false }));
  app.use(express.json({ limit: "2mb" }));
  app.use(cookieParser());
  app.use(morgan(env.isProd ? "combined" : "dev"));

  const limiter = rateLimit({
    windowMs: 60_000,
    max: 180,
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use("/api", limiter);

  app.get("/health", (_req, res) => {
    res.json({ ok: true, service: "textpulse-api" });
  });

  app.use("/api/auth", authRoutes);
  app.use("/api/onboarding", onboardingRoutes);
  app.use("/api/contacts", contactRoutes);
  app.use("/api/conversations", conversationRoutes);
  app.use("/api/campaigns", campaignRoutes);
  app.use("/api/automations", automationRoutes);
  app.use("/api/twilio", twilioRoutes);
  app.use("/api/webhooks", webhookRoutes);
  app.use("/api/dashboard", dashboardRoutes);
  app.use("/api/analytics", analyticsRoutes);
  app.use("/api/assistant", assistantRoutes);
  app.use("/api/knowledge", knowledgeRoutes);
  app.use("/api/settings", settingsRoutes);

  app.use(errorHandler);
  return app;
}
