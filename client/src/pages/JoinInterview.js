import { useState } from "react";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

function JoinInterview({ onJoined }) {
  const [pin, setPin] = useState(() => {
    return localStorage.getItem("invite-pin") || "";
  });
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleJoin = async (event) => {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const res = await fetch(`${API_URL}/api/interviews/join`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ pin })
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage(data.message || "Invalid PIN");
        return;
      }

      localStorage.removeItem("invite-pin");
      onJoined?.(data.interview);
    } catch (error) {
      setMessage("Server unavailable");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="panel join-panel">
      <div>
        <p className="section-kicker">Candidate access</p>
        <h2>Join interview room</h2>
        <p className="muted">Enter the 6-digit PIN from your invitation email.</p>
      </div>

      <form onSubmit={handleJoin} className="stack-form">
        <input
          type="text"
          inputMode="numeric"
          maxLength="6"
          placeholder="Enter PIN"
          value={pin}
          onChange={(event) => setPin(event.target.value.replace(/\D/g, ""))}
        />
        <button className="btn btn-primary" disabled={loading || pin.length !== 6}>
          {loading ? "⏳ Checking..." : "🚀 Join Interview"}
        </button>
      </form>

      {message && <p className="form-message">{message}</p>}
    </section>
  );
}

export default JoinInterview;
