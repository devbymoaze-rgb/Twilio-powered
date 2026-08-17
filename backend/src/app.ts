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
      origin(origin, callback) {
        if (!origin || env.frontendOrigins.includes(origin)) {
          callback(null, true);
          return;
        }
        callback(null, false);
      },
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

  app.get("/", (req, res) => {
    const frontend = env.frontendUrl;
    const payload = {
      success: true,
      service: "textpulse-api",
      health: "/health",
      frontend,
      message: "TextPulse API is running. Open the frontend URL to use the product.",
    };

    const accept = req.headers.accept ?? "";
    if (accept.includes("text/html")) {
      const safeFrontend = escapeHtml(frontend);
      res
        .type("html")
        .send(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta http-equiv="refresh" content="0; url=${safeFrontend}" />
    <title>TextPulse API</title>
  </head>
  <body style="font-family:sans-serif;padding:48px;background:#F8FAFC;color:#0F172A">
    <p>This is the API. Opening the app at <a href="${safeFrontend}">${safeFrontend}</a></p>
  </body>
</html>`);
      return;
    }

    res.json(payload);
  });

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

  app.use((req, res) => {
    res.status(404).json({
      success: false,
      error: `No route for ${req.method} ${req.path}`,
      code: "NOT_FOUND",
      hint:
        req.path === "/"
          ? "Open the frontend app instead of the API root."
          : "API routes live under /api. Health check is GET /health.",
    });
  });

  app.use(errorHandler);
  return app;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
