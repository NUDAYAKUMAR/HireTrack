import express from "express";
import {
  getDashboardStats,
  listInterviews,
  listUsers,
  updateUserAccess,
  deleteUser
} from "../controllers/adminController.js";
import { allowRoles, protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(protect, allowRoles("admin"));
router.get("/stats", getDashboardStats);
router.get("/users", listUsers);
router.get("/interviews", listInterviews);
router.patch("/users/:id", updateUserAccess);
router.delete("/users/:id", deleteUser);

export default router;
