import express from "express";
import {
  createInterview,
  joinInterview,
  listRecruiterInterviews,
  logActivity,
  sendInterviewEmail,
  updateInterviewResult,
  addQuestion,
  removeQuestion
} from "../controllers/interviewController.js";
import { allowRoles, protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/create", protect, allowRoles("recruiter"), createInterview);
router.get("/mine", protect, allowRoles("recruiter"), listRecruiterInterviews);
router.post("/join", joinInterview);
// Activity logging now requires a valid JWT so random bots can't spam it
router.post("/:pin/activity", protect, logActivity);
router.post("/:id/send-email", protect, allowRoles("recruiter"), sendInterviewEmail);
router.patch("/:id", protect, allowRoles("recruiter"), updateInterviewResult);
router.post("/:id/questions", protect, allowRoles("recruiter"), addQuestion);
router.delete("/:id/questions", protect, allowRoles("recruiter"), removeQuestion);

export default router;
