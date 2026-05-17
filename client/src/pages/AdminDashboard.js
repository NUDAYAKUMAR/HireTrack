import { useCallback, useEffect, useState } from "react";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

function AdminDashboard({ token }) {
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [interviews, setInterviews] = useState([]);
  const [activeTab, setActiveTab] = useState("users");
  const [actionId, setActionId] = useState(null);
  const [message, setMessage] = useState("");

  const headers = { Authorization: `Bearer ${token}` };

  const loadData = useCallback(async () => {
    try {
      const [statsRes, usersRes, interviewsRes] = await Promise.all([
        fetch(`${API_URL}/api/admin/stats`, { headers }),
        fetch(`${API_URL}/api/admin/users`, { headers }),
        fetch(`${API_URL}/api/admin/interviews`, { headers })
      ]);

      if (statsRes.ok) setStats(await statsRes.json());
      if (usersRes.ok) setUsers(await usersRes.json());
      if (interviewsRes.ok) setInterviews(await interviewsRes.json());
    } catch (_) {
      setMessage("Failed to load data. Check your connection.");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const updateUser = async (id, patch) => {
    setActionId(id);
    setMessage("");
    try {
      const res = await fetch(`${API_URL}/api/admin/users/${id}`, {
        method: "PATCH",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify(patch)
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.message || "Action failed");
      } else {
        setMessage(`User "${data.name}" updated.`);
        loadData();
      }
    } catch (_) {
      setMessage("Server error. Try again.");
    } finally {
      setActionId(null);
    }
  };

  const deleteUser = async (id, name) => {
    if (!window.confirm(`Delete user "${name}"? This cannot be undone.`)) return;
    setActionId(id);
    setMessage("");
    try {
      const res = await fetch(`${API_URL}/api/admin/users/${id}`, {
        method: "DELETE",
        headers
      });
      if (!res.ok) {
        const data = await res.json();
        setMessage(data.message || "Delete failed");
      } else {
        setMessage(`User "${name}" deleted.`);
        loadData();
      }
    } catch (_) {
      setMessage("Server error. Try again.");
    } finally {
      setActionId(null);
    }
  };

  const pendingRecruiters = users.filter((u) => u.role === "recruiter" && !u.isActive);

  return (
    <div className="dashboard-grid">
      {/* Stats */}
      <section className="metric-row">
        <article className="metric-card">
          <span>Total users</span>
          <strong>{stats?.users ?? "—"}</strong>
        </article>
        <article className="metric-card">
          <span>Total interviews</span>
          <strong>{stats?.interviews ?? "—"}</strong>
        </article>
        <article className="metric-card">
          <span>Live now</span>
          <strong>{stats?.liveInterviews ?? "—"}</strong>
        </article>
        <article className="metric-card" style={{ borderColor: pendingRecruiters.length ? "#f59e0b" : undefined }}>
          <span>Pending recruiters</span>
          <strong style={{ color: pendingRecruiters.length ? "#d97706" : undefined }}>
            {stats?.pendingRecruiters ?? "—"}
          </strong>
        </article>
      </section>

      {message && <p className="form-message">{message}</p>}

      {/* Tabs */}
      <div className="admin-tabs">
        <button
          className={`admin-tab-btn${activeTab === "users" ? " active" : ""}`}
          onClick={() => setActiveTab("users")}
        >
          Users {pendingRecruiters.length > 0 && <span className="tab-badge">{pendingRecruiters.length}</span>}
        </button>
        <button
          className={`admin-tab-btn${activeTab === "interviews" ? " active" : ""}`}
          onClick={() => setActiveTab("interviews")}
        >
          Interviews
        </button>
      </div>

      {activeTab === "users" && (
        <section className="panel">
          <div className="panel-heading">
            <div>
              <p className="section-kicker">Access management</p>
              <h2>Users</h2>
            </div>
          </div>

          {pendingRecruiters.length > 0 && (
            <div className="pending-banner">
              ⚠️ {pendingRecruiters.length} recruiter{pendingRecruiters.length > 1 ? "s" : ""} pending approval
            </div>
          )}

          <div className="table-list" style={{ marginTop: 18 }}>
            {users.map((user) => (
              <div key={user._id} className="table-row admin-user-row">
                <div>
                  <strong>{user.name}</strong>
                  <small style={{ display: "block", color: "var(--muted)" }}>{user.email}</small>
                </div>
                <span className={`role-pill role-${user.role}`}>{user.role}</span>
                <span className={`status-pill ${user.isActive ? "active" : "inactive"}`}>
                  {user.isActive ? "Active" : user.role === "recruiter" ? "Pending" : "Blocked"}
                </span>
                <div className="admin-actions">
                  {!user.isActive ? (
                    <button
                      className="btn btn-sm btn-success"
                      disabled={actionId === user._id}
                      onClick={() => updateUser(user._id, { isActive: true })}
                    >
                      Approve
                    </button>
                  ) : (
                    <button
                      className="btn btn-sm btn-warning"
                      disabled={actionId === user._id}
                      onClick={() => updateUser(user._id, { isActive: false })}
                    >
                      Block
                    </button>
                  )}
                  <button
                    className="btn btn-sm btn-danger"
                    disabled={actionId === user._id}
                    onClick={() => deleteUser(user._id, user.name)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {activeTab === "interviews" && (
        <section className="panel">
          <div className="panel-heading">
            <div>
              <p className="section-kicker">All sessions</p>
              <h2>Interviews</h2>
            </div>
          </div>
          <div className="table-list" style={{ marginTop: 18 }}>
            {interviews.map((interview) => (
              <div key={interview._id} className="table-row">
                <div>
                  <strong>{interview.title}</strong>
                  <small style={{ display: "block", color: "var(--muted)" }}>{interview.candidateName}</small>
                </div>
                <span style={{ color: "var(--muted)", fontSize: 13 }}>
                  {interview.recruiterId?.name || "Unknown recruiter"}
                </span>
                <span className={`status-pill status-${interview.status}`}>{interview.status}</span>
                <span className={`email-pill ${interview.emailStatus || "not_sent"}`}>
                  Email: {interview.emailStatus || "not_sent"}
                </span>
                <small style={{ color: "var(--muted)" }}>
                  {new Date(interview.scheduledAt).toLocaleDateString()}
                </small>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

export default AdminDashboard;
