import { useCallback, useEffect, useState } from "react";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

function RecruiterDashboard({ token, onJoinRoom }) {
  const [interviews, setInterviews] = useState([]);
  const [form, setForm] = useState({
    candidateName: "",
    candidateEmail: "",
    title: "",
    scheduledAt: "",
    description: ""
  });
  const [message, setMessage] = useState({ text: "", isError: true });
  const [sendingId, setSendingId] = useState("");
  const [expandedId, setExpandedId] = useState(null);
  const [questionInput, setQuestionInput] = useState("");
  const [addingQuestion, setAddingQuestion] = useState(false);

  const authHeaders = { Authorization: `Bearer ${token}` };

  const loadInterviews = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/interviews/mine`, { headers: authHeaders });
      if (res.ok) {
        setInterviews(await res.json());
      }
    } catch (_) {
      setMessage({ text: "Could not load interviews.", isError: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    loadInterviews();
  }, [loadInterviews]);

  const createInterview = async (event) => {
    event.preventDefault();
    setMessage({ text: "", isError: true });

    try {
      const res = await fetch(`${API_URL}/api/interviews/create`, {
        method: "POST",
        headers: { ...authHeaders, "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });
      const data = await res.json();

      if (!res.ok) {
        setMessage({ text: data.message || "Could not create interview", isError: true });
        return;
      }

      setMessage({ text: `Interview created. PIN: ${data.interview.pin}`, isError: false });
      setForm({ candidateName: "", candidateEmail: "", title: "", scheduledAt: "", description: "" });
      loadInterviews();
    } catch (_) {
      setMessage({ text: "Server error. Try again.", isError: true });
    }
  };

  const sendEmail = async (interviewId) => {
    setSendingId(interviewId);
    setMessage({ text: "", isError: true });

    try {
      const res = await fetch(`${API_URL}/api/interviews/${interviewId}/send-email`, {
        method: "POST",
        headers: authHeaders
      });
      const data = await res.json();

      if (!res.ok) {
        setMessage({ text: data.message || "Email could not be sent", isError: true });
      } else {
        setMessage({ text: "Invitation email sent successfully.", isError: false });
      }
      loadInterviews();
    } catch (_) {
      setMessage({ text: "Server error sending email.", isError: true });
    } finally {
      setSendingId("");
    }
  };

  const addQuestion = async (interviewId) => {
    if (!questionInput.trim()) return;
    setAddingQuestion(true);

    try {
      const res = await fetch(`${API_URL}/api/interviews/${interviewId}/questions`, {
        method: "POST",
        headers: { ...authHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({ question: questionInput.trim() })
      });
      if (res.ok) {
        setQuestionInput("");
        loadInterviews();
      }
    } catch (_) {}
    finally {
      setAddingQuestion(false);
    }
  };

  const removeQuestion = async (interviewId, index) => {
    try {
      await fetch(`${API_URL}/api/interviews/${interviewId}/questions`, {
        method: "DELETE",
        headers: { ...authHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({ index })
      });
      loadInterviews();
    } catch (_) {}
  };

  const set = (field) => (event) => setForm({ ...form, [field]: event.target.value });

  const totalInterviews = interviews.length;
  const sentEmails = interviews.filter((i) => i.emailStatus === "sent").length;
  const upcomingInterviews = interviews.filter((i) => new Date(i.scheduledAt) >= new Date()).length;
  const failedEmails = interviews.filter((i) => i.emailStatus === "failed").length;

  return (
    <div className="recruiter-dashboard">
      {/* Metrics */}
      <section className="metric-row recruiter-metrics">
        <article className="metric-card">
          <span>Total interviews</span>
          <strong>{totalInterviews}</strong>
        </article>
        <article className="metric-card">
          <span>Upcoming</span>
          <strong>{upcomingInterviews}</strong>
        </article>
        <article className="metric-card">
          <span>Emails sent</span>
          <strong>{sentEmails}</strong>
        </article>
        <article className="metric-card">
          <span>Email failures</span>
          <strong>{failedEmails}</strong>
        </article>
      </section>

      {message.text && (
        <p className={`form-message ${message.isError ? "form-message-error" : "form-message-success"}`}>
          {message.text}
        </p>
      )}

      <div className="recruiter-layout">
        {/* Create Interview form */}
        <form className="panel stack-form recruiter-form" onSubmit={createInterview}>
          <p className="section-kicker">Recruiter workspace</p>
          <h2>Create interview</h2>
          <p className="muted">
            Fill in the candidate details to generate a unique link and 6-digit PIN.
          </p>
          <input
            placeholder="Candidate name"
            required
            value={form.candidateName}
            onChange={set("candidateName")}
          />
          <input
            type="email"
            placeholder="Candidate email"
            required
            value={form.candidateEmail}
            onChange={set("candidateEmail")}
          />
          <input
            placeholder="Interview title / position"
            required
            value={form.title}
            onChange={set("title")}
          />
          <input
            type="datetime-local"
            required
            value={form.scheduledAt}
            onChange={set("scheduledAt")}
          />
          <textarea
            placeholder="Message to candidate (optional, appears in their invitation email)"
            value={form.description}
            onChange={set("description")}
            rows={3}
            className="desc-textarea"
          />
          <button className="btn btn-primary">Generate link + PIN</button>
        </form>

        {/* Interviews list */}
        <section className="panel">
          <div className="panel-heading">
            <div>
              <p className="section-kicker">Pipeline</p>
              <h2>Scheduled interviews</h2>
            </div>
          </div>

          <div className="interview-list">
            {interviews.length === 0 && (
              <p className="muted" style={{ marginTop: 12 }}>No interviews yet. Create your first one.</p>
            )}

            {interviews.map((interview) => {
              const isExpanded = expandedId === interview._id;
              return (
                <article key={interview._id} className="interview-card richer-card">
                  <div className="interview-main">
                    <h3>{interview.title}</h3>
                    <p>{interview.candidateName}</p>
                    <small>{interview.candidateEmail}</small>
                  </div>

                  <div className="interview-meta">
                    <span className="pin-badge">PIN {interview.pin}</span>
                    <small>{new Date(interview.scheduledAt).toLocaleString()}</small>
                    <small className={`email-pill ${interview.emailStatus || "not_sent"}`}>
                      Email: {interview.emailStatus || "not_sent"}
                    </small>
                    <small className={`status-pill status-${interview.status}`}>
                      {interview.status}
                    </small>
                  </div>

                  <div className="card-actions">
                    <button
                      type="button"
                      className="btn btn-outline-primary btn-sm"
                      onClick={() => sendEmail(interview._id)}
                      disabled={sendingId === interview._id}
                    >
                      {sendingId === interview._id ? "Sending..." : "Send Email"}
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline-secondary btn-sm"
                      onClick={() => navigator.clipboard?.writeText(interview.interviewLink)}
                    >
                      Copy Link
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={() => onJoinRoom?.(interview)}
                    >
                      Open Room
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline-secondary btn-sm"
                      onClick={() => {
                        setExpandedId(isExpanded ? null : interview._id);
                        setQuestionInput("");
                      }}
                    >
                      {isExpanded ? "Hide" : "Questions"}
                    </button>
                  </div>

                  {/* Expandable questions section */}
                  {isExpanded && (
                    <div className="questions-expand" style={{ gridColumn: "1 / -1" }}>
                      <h4>Interview Questions</h4>
                      {interview.questions && interview.questions.length > 0 ? (
                        <ol className="question-list">
                          {interview.questions.map((q, i) => (
                            <li key={i} className="question-item">
                              <span>{q}</span>
                              <button
                                className="btn btn-sm btn-danger"
                                onClick={() => removeQuestion(interview._id, i)}
                              >
                                ✕
                              </button>
                            </li>
                          ))}
                        </ol>
                      ) : (
                        <p className="muted" style={{ fontSize: 13 }}>No questions added yet.</p>
                      )}
                      <div className="add-question-row">
                        <input
                          placeholder="Type a question and press Add"
                          value={questionInput}
                          onChange={(e) => setQuestionInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              addQuestion(interview._id);
                            }
                          }}
                        />
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => addQuestion(interview._id)}
                          disabled={addingQuestion || !questionInput.trim()}
                        >
                          Add
                        </button>
                      </div>

                      {/* Live activity log */}
                      {interview.activities && interview.activities.length > 0 && (
                        <div className="live-activity">
                          <h4>Candidate Activity Log</h4>
                          <div className="activity-mini-list">
                            {interview.activities.slice(0, 15).map((act, i) => (
                              <div key={i} className={`activity-mini-row ${act.type.includes("block") || act.type === "tab-switch" ? "activity-alert" : ""}`}>
                                <strong>{act.type}</strong>
                                <span>{act.details}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}

export default RecruiterDashboard;
