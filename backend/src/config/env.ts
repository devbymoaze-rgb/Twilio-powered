import path from "path";
import dotenv from "dotenv";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });
dotenv.config();

const isProd = (process.env.NODE_ENV ?? "development") === "production";

function stripSlash(url: string) {
  return url.replace(/\/$/, "");
}

function required(name: string, devFallback?: string): string {
  const value = process.env[name] ?? (isProd ? undefined : devFallback);
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function railwayHttpsOrigin() {
  const domain = process.env.RAILWAY_PUBLIC_DOMAIN;
  return domain ? `https://${domain}` : undefined;
}

const frontendUrl = stripSlash(
  required("FRONTEND_URL", "http://127.0.0.1:3000")
);

const extraOrigins = (process.env.CORS_ORIGINS ?? "")
  .split(",")
  .map((item) => stripSlash(item.trim()))
  .filter(Boolean);

const publicApiUrl = stripSlash(
  process.env.PUBLIC_API_URL ??
    railwayHttpsOrigin() ??
    (isProd ? "" : "http://127.0.0.1:4000")
);

if (isProd && !publicApiUrl) {
  throw new Error("Missing required environment variable: PUBLIC_API_URL");
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: Number(process.env.PORT ?? 4000),
  mongoUri: required("MONGODB_URI", "mongodb://127.0.0.1:27017/textpulse"),
  jwtSecret: required("JWT_SECRET", "dev-only-change-me"),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "7d",
  encryptionKey: required(
    "ENCRYPTION_KEY",
    "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"
  ),
  frontendUrl,
  frontendOrigins: Array.from(
    new Set([frontendUrl, "http://127.0.0.1:3000", "http://localhost:3000", ...extraOrigins])
  ),
  publicApiUrl,
  openaiApiKey: process.env.OPENAI_API_KEY ?? "",
  openaiModel: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
  cookieSecure: process.env.COOKIE_SECURE === "true" || (isProd && process.env.COOKIE_SECURE !== "false"),
  isProd,
};
