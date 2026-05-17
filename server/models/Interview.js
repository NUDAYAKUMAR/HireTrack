import mongoose from "mongoose";

const activitySchema = new mongoose.Schema(
  {
    type: {
      type: String,
      required: true
    },
    details: {
      type: String,
      default: ""
    }
  },
  { timestamps: true }
);

const interviewSchema = new mongoose.Schema(
  {
    recruiterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    candidateName: {
      type: String,
      required: true,
      trim: true
    },
    candidateEmail: {
      type: String,
      required: true,
      lowercase: true,
      trim: true
    },
    title: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      default: ""
    },
    interviewLink: {
      type: String,
      required: true
    },
    pin: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    scheduledAt: {
      type: Date,
      required: true
    },
    status: {
      type: String,
      enum: ["scheduled", "live", "completed", "cancelled"],
      default: "scheduled"
    },
    result: {
      type: String,
      enum: ["pending", "selected", "rejected", "hold"],
      default: "pending"
    },
    notes: {
      type: String,
      default: ""
    },
    questions: {
      type: [String],
      default: []
    },
    emailStatus: {
      type: String,
      enum: ["not_sent", "sent", "failed"],
      default: "not_sent"
    },
    lastEmailSentAt: {
      type: Date
    },
    activities: [activitySchema]
  },
  { timestamps: true }
);

const Interview = mongoose.model("Interview", interviewSchema);

export default Interview;
