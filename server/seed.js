import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";

dotenv.config();

const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, lowercase: true },
  password: String,
  role: { type: String, enum: ["admin", "recruiter", "candidate"], default: "candidate" },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

const User = mongoose.model("User", userSchema);

const users = [
  { name: "Admin User",      email: "admin@hiretrack.com",     password: "Admin@123",     role: "admin",     isActive: true },
  { name: "John Recruiter",  email: "recruiter@hiretrack.com", password: "Recruiter@123", role: "recruiter", isActive: true },
  { name: "Jane Candidate",  email: "candidate@hiretrack.com", password: "Candidate@123", role: "candidate", isActive: true },
];

async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("✅ Connected to MongoDB");

  for (const u of users) {
    const exists = await User.findOne({ email: u.email });
    if (exists) {
      console.log(`⚠️  Already exists: ${u.email} — skipping`);
      continue;
    }
    const hashed = await bcrypt.hash(u.password, 10);
    await User.create({ ...u, password: hashed });
    console.log(`✅ Created [${u.role}]: ${u.email} / ${u.password}`);
  }

  await mongoose.disconnect();
  console.log("\n🎉 Seeding complete!");
}

seed().catch(e => { console.error(e); process.exit(1); });
