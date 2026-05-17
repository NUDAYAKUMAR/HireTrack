import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
dotenv.config();

const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, lowercase: true },
  password: String,
  role: String,
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

const User = mongoose.model("User", userSchema);

const resetList = [
  { email: "admin@hiretrack.com",     password: "Admin@123",     role: "admin",     name: "Admin User",     isActive: true },
  { email: "recruiter@hiretrack.com", password: "Recruiter@123", role: "recruiter", name: "John Recruiter",  isActive: true },
  { email: "candidate@hiretrack.com", password: "Candidate@123", role: "candidate", name: "Jane Candidate",  isActive: true },
];

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("✅ Connected\n");

  // Print ALL existing users first
  const all = await User.find({}, "name email role isActive");
  console.log("── Existing users in DB ──");
  all.forEach(u => console.log(`  [${u.role}] ${u.email}  active=${u.isActive}`));
  console.log("");

  // Force upsert all three accounts
  for (const u of resetList) {
    const hashed = await bcrypt.hash(u.password, 10);
    await User.findOneAndUpdate(
      { email: u.email },
      { name: u.name, password: hashed, role: u.role, isActive: u.isActive },
      { upsert: true, new: true }
    );
    console.log(`✅ Upserted [${u.role}] ${u.email}  →  password: ${u.password}`);
  }

  await mongoose.disconnect();
  console.log("\n🎉 Done!");
}

run().catch(e => { console.error(e); process.exit(1); });
