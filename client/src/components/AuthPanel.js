import { useState } from "react";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

function AuthPanel({ onAuth }) {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "candidate"
  });
  const [message, setMessage] = useState({ text: "", isError: true });
  const [loading, setLoading] = useState(false);

  const set = (field) => (event) => setForm({ ...form, [field]: event.target.value });

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setMessage({ text: "", isError: true });

    const endpoint = mode === "login" ? "login" : "register";
    const payload =
      mode === "login"
        ? { email: form.email, password: form.password }
        : form;

    try {
      const res = await fetch(`${API_URL}/api/auth/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (!res.ok) {
        setMessage({ text: data.message || "Request failed", isError: true });
        return;
      }

      // Recruiter registration returns a message but no token (pending approval)
      if (data.message && !data.token) {
        setMessage({ text: data.message, isError: false });
        setMode("login");
        return;
      }

      onAuth(data);
    } catch (_) {
      setMessage({ text: "Server unavailable. Please try again.", isError: true });
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (next) => {
    setMode(next);
    setMessage({ text: "", isError: true });
  };

  return (
    <section className="auth-grid">
      <div className="intro-copy">
        <p className="section-kicker">Advanced interview platform</p>
        <h2>Run secure coding interviews from one workspace.</h2>
        <p>
          Manage users, schedule sessions, send invitations, monitor candidate activity,
          and conduct live coding rounds with video and whiteboard support.
        </p>
        <ul className="feature-list">
          <li>Role-based access for Admin, Recruiter, and Candidate</li>
          <li>Automated invitation emails with PIN access</li>
          <li>Real-time coding, chat, and shared whiteboard tools</li>
          <li>Video sessions with candidate activity monitoring</li>
          <li>Question management and code execution support</li>
          <li>Tab-switch, copy, and paste detection</li>
        </ul>
      </div>

      <form className="panel stack-form" onSubmit={handleSubmit}>
        <div className="segmented">
          <button type="button" className={mode === "login" ? "active" : ""} onClick={() => switchMode("login")}>
            Login
          </button>
          <button type="button" className={mode === "register" ? "active" : ""} onClick={() => switchMode("register")}>
            Register
          </button>
        </div>

        {mode === "register" && (
          <input
            placeholder="Full name"
            required
            value={form.name}
            onChange={set("name")}
          />
        )}
        <input
          type="email"
          placeholder="Email address"
          required
          value={form.email}
          onChange={set("email")}
        />
        <input
          type="password"
          placeholder="Password"
          required
          minLength={6}
          value={form.password}
          onChange={set("password")}
        />
        {mode === "register" && (
          <>
            <select value={form.role} onChange={set("role")}>
              <option value="candidate">Candidate</option>
              <option value="recruiter">Recruiter (requires admin approval)</option>
            </select>
            {form.role === "recruiter" && (
              <p className="muted" style={{ fontSize: 13 }}>
                Recruiter accounts are reviewed by an admin before activation.
              </p>
            )}
          </>
        )}
        <button className="btn btn-primary" disabled={loading}>
          {loading ? "Please wait..." : mode === "login" ? "Login" : "Create account"}
        </button>
        {message.text && (
          <p className={`form-message ${message.isError ? "form-message-error" : "form-message-success"}`}>
            {message.text}
          </p>
        )}
      </form>
    </section>
  );
}

export default AuthPanel;
