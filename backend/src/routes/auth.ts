import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { Organization } from "../models/Organization";
import { User } from "../models/User";
import { requireAuth, signToken } from "../middleware/auth";
import { asyncHandler } from "../utils/asyncHandler";
import { AppError, ConflictError, UnauthorizedError } from "../utils/errors";
import { bootstrapOrganization } from "../services/orgBootstrap";
import { env } from "../config/env";

const router = Router();

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  companyName: z.string().min(2),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

function setAuthCookie(res: import("express").Response, token: string) {
  res.cookie("tp_token", token, {
    httpOnly: true,
    sameSite: env.isProd ? "none" : "lax",
    secure: env.cookieSecure || env.isProd,
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

router.post(
  "/register",
  asyncHandler(async (req, res) => {
    const body = registerSchema.parse(req.body);
    const existing = await User.findOne({ email: body.email.toLowerCase() });
    if (existing) throw new ConflictError("An account with that email already exists");

    const organization = await Organization.create({
      name: body.companyName,
      onboardingStep: "business",
    });
    const passwordHash = await bcrypt.hash(body.password, 12);
    const user = await User.create({
      organizationId: organization._id,
      email: body.email.toLowerCase(),
      passwordHash,
      name: body.name,
      role: "owner",
    });
    await bootstrapOrganization(String(organization._id), body.companyName);

    const token = signToken({
      userId: String(user._id),
      organizationId: String(organization._id),
      role: "owner",
    });
    setAuthCookie(res, token);
    res.status(201).json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        organizationId: organization._id,
        onboardingCompleted: false,
        onboardingStep: organization.onboardingStep,
      },
    });
  })
);

router.post(
  "/login",
  asyncHandler(async (req, res) => {
    const body = loginSchema.parse(req.body);
    const user = await User.findOne({ email: body.email.toLowerCase() });
    if (!user) throw new UnauthorizedError("Invalid email or password");
    const ok = await bcrypt.compare(body.password, user.passwordHash);
    if (!ok) throw new UnauthorizedError("Invalid email or password");
    user.lastLoginAt = new Date();
    await user.save();
    const organization = await Organization.findById(user.organizationId);
    const token = signToken({
      userId: String(user._id),
      organizationId: String(user.organizationId),
      role: user.role as "owner" | "admin" | "agent",
    });
    setAuthCookie(res, token);
    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        organizationId: user.organizationId,
        onboardingCompleted: organization?.onboardingCompleted ?? false,
        onboardingStep: organization?.onboardingStep ?? "complete",
      },
    });
  })
);

router.get(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    const organization = await Organization.findById(req.user!.organizationId);
    res.json({
      user: {
        id: req.user!.userId,
        name: req.user!.name,
        email: req.user!.email,
        role: req.user!.role,
        organizationId: req.user!.organizationId,
        onboardingCompleted: organization?.onboardingCompleted ?? false,
        onboardingStep: organization?.onboardingStep ?? "complete",
        organizationName: organization?.name ?? "",
        plan: organization?.plan ?? "trial",
      },
    });
  })
);

router.post(
  "/logout",
  asyncHandler(async (_req, res) => {
    res.clearCookie("tp_token");
    res.json({ ok: true });
  })
);

router.post(
  "/password",
  requireAuth,
  asyncHandler(async (req, res) => {
    const body = z
      .object({ currentPassword: z.string().min(1), newPassword: z.string().min(8) })
      .parse(req.body);
    const user = await User.findById(req.user!.userId);
    if (!user) throw new AppError("User not found", 404);
    const ok = await bcrypt.compare(body.currentPassword, user.passwordHash);
    if (!ok) throw new UnauthorizedError("Current password is incorrect");
    user.passwordHash = await bcrypt.hash(body.newPassword, 12);
    await user.save();
    res.json({ ok: true });
  })
);

export default router;
