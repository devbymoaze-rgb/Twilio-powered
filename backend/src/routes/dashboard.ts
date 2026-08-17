import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { asyncHandler } from "../utils/asyncHandler";
import { dashboardMetrics } from "../services/analyticsService";
import { generateDailyBrief } from "../services/aiService";

const router = Router();
router.use(requireAuth);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const data = await dashboardMetrics(req.user!.organizationId);
    let brief = "";
    try {
      brief = await generateDailyBrief(req.user!.organizationId);
    } catch {
      brief = "Your daily brief will appear once conversations start coming in.";
    }
    res.json({ ...data, brief });
  })
);

export default router;
