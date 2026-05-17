import Interview from "../models/Interview.js";
import User from "../models/User.js";

export const getDashboardStats = async (req, res) => {
  try {
    const [totalUsers, totalInterviews, liveInterviews, pendingRecruiters] = await Promise.all([
      User.countDocuments(),
      Interview.countDocuments(),
      Interview.countDocuments({ status: "live" }),
      User.countDocuments({ role: "recruiter", isActive: false })
    ]);

    res.json({ users: totalUsers, interviews: totalInterviews, liveInterviews, pendingRecruiters });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const listUsers = async (req, res) => {
  try {
    const users = await User.find().select("-password").sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const listInterviews = async (req, res) => {
  try {
    const interviews = await Interview.find()
      .populate("recruiterId", "name email")
      .sort({ scheduledAt: -1 });
    res.json(interviews);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const updateUserAccess = async (req, res) => {
  try {
    const { isActive, role } = req.body;

    const updateFields = {};
    if (typeof isActive === "boolean") updateFields.isActive = isActive;
    if (role && ["admin", "recruiter", "candidate"].includes(role)) updateFields.role = role;

    const user = await User.findByIdAndUpdate(req.params.id, updateFields, {
      new: true
    }).select("-password");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const deleteUser = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ message: "User deleted" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
