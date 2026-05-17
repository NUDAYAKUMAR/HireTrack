import crypto from "crypto";
import Interview from "../models/Interview.js";
import { sendInterviewInvitation } from "../services/emailService.js";

const clientUrl = process.env.CLIENT_URL || "http://localhost:3000";

const generateUniquePin = async () => {
  let pin;
  let exists = true;

  while (exists) {
    pin = crypto.randomInt(100000, 1000000).toString();
    exists = await Interview.exists({ pin });
  }

  return pin;
};

export const createInterview = async (req, res) => {
  try {
    const { candidateName, candidateEmail, title, scheduledAt, description } = req.body;

    if (!candidateName || !candidateEmail || !title || !scheduledAt) {
      return res.status(400).json({
        message: "Candidate name, email, title, and schedule are required"
      });
    }

    const pin = await generateUniquePin();
    const interviewLink = `${clientUrl}/join/${pin}`;

    const interview = await Interview.create({
      recruiterId: req.user.id,
      candidateName,
      candidateEmail,
      title,
      scheduledAt,
      description: description || "",
      interviewLink,
      pin
    });

    res.status(201).json({
      message: "Interview created",
      interview
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const listRecruiterInterviews = async (req, res) => {
  try {
    const interviews = await Interview.find({ recruiterId: req.user.id }).sort({ scheduledAt: -1 });
    res.json(interviews);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const joinInterview = async (req, res) => {
  try {
    const { pin } = req.body;

    if (!pin) {
      return res.status(400).json({ message: "PIN is required" });
    }

    const interview = await Interview.findOne({ pin });

    if (!interview) {
      return res.status(404).json({ message: "Invalid PIN" });
    }

    if (interview.status === "cancelled") {
      return res.status(403).json({ message: "This interview has been cancelled" });
    }

    res.status(200).json({
      message: "Interview found",
      interview
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const updateInterviewResult = async (req, res) => {
  try {
    const { result, notes, status } = req.body;
    const interview = await Interview.findOneAndUpdate(
      { _id: req.params.id, recruiterId: req.user.id },
      { result, notes, status },
      { new: true, runValidators: true }
    );

    if (!interview) {
      return res.status(404).json({ message: "Interview not found" });
    }

    res.json(interview);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const sendInterviewEmail = async (req, res) => {
  try {
    const interview = await Interview.findOne({
      _id: req.params.id,
      recruiterId: req.user.id
    });

    if (!interview) {
      return res.status(404).json({ message: "Interview not found" });
    }

    const email = await sendInterviewInvitation({
      to: interview.candidateEmail,
      candidateName: interview.candidateName,
      title: interview.title,
      link: interview.interviewLink,
      pin: interview.pin,
      scheduledAt: interview.scheduledAt
    });

    interview.emailStatus = email.sent ? "sent" : "failed";
    interview.lastEmailSentAt = email.sent ? new Date() : interview.lastEmailSentAt;
    await interview.save();

    if (!email.sent) {
      return res.status(500).json({
        message: email.reason || "Email could not be sent",
        interview
      });
    }

    res.json({
      message: "Invitation email sent",
      interview
    });
  } catch (error) {
    try {
      const interview = await Interview.findOne({
        _id: req.params.id,
        recruiterId: req.user.id
      });
      if (interview) {
        interview.emailStatus = "failed";
        await interview.save();
      }
    } catch (_) {}

    res.status(500).json({ message: "Email could not be sent", error: error.message });
  }
};

// Requires auth so only legitimate interview participants can log
export const logActivity = async (req, res) => {
  try {
    const { type, details } = req.body;

    if (!type) {
      return res.status(400).json({ message: "Activity type is required" });
    }

    const interview = await Interview.findOneAndUpdate(
      { pin: req.params.pin },
      { $push: { activities: { type, details: details || "" } } },
      { new: true }
    );

    if (!interview) {
      return res.status(404).json({ message: "Interview not found" });
    }

    res.status(201).json({ message: "Activity logged" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const addQuestion = async (req, res) => {
  try {
    const { question } = req.body;

    if (!question || !question.trim()) {
      return res.status(400).json({ message: "Question text is required" });
    }

    const interview = await Interview.findOneAndUpdate(
      { _id: req.params.id, recruiterId: req.user.id },
      { $push: { questions: question.trim() } },
      { new: true }
    );

    if (!interview) {
      return res.status(404).json({ message: "Interview not found" });
    }

    res.json({ message: "Question added", interview });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const removeQuestion = async (req, res) => {
  try {
    const { index } = req.body;

    if (index === undefined || index === null) {
      return res.status(400).json({ message: "Question index is required" });
    }

    const interview = await Interview.findOne({
      _id: req.params.id,
      recruiterId: req.user.id
    });

    if (!interview) {
      return res.status(404).json({ message: "Interview not found" });
    }

    interview.questions.splice(Number(index), 1);
    await interview.save();

    res.json({ message: "Question removed", interview });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
