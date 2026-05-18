import { useEffect, useMemo, useState } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import "./App.css";
import AuthPanel from "./components/AuthPanel";
import AdminDashboard from "./pages/AdminDashboard";
import RecruiterDashboard from "./pages/RecruiterDashboard";
import JoinInterview from "./pages/JoinInterview";
import InterviewRoom from "./pages/InterviewRoom";

function App() {
  const [auth, setAuth] = useState(() => {
    try {
      const stored = localStorage.getItem("hiretrack-auth");
      return stored ? JSON.parse(stored) : null;
    } catch (_) {
      return null;
    }
  });
  const [activeView, setActiveView] = useState("dashboard");
  const [room, setRoom] = useState(null);
  const [joiningFromUrl, setJoiningFromUrl] = useState(() => {
    return !!window.location.pathname.match(/\/join\/(\d{6})/);
  });
  const [urlError, setUrlError] = useState("");

  const urlPin = useMemo(() => {
    const match = window.location.pathname.match(/\/join\/(\d{6})/);
    return match ? match[1] : null;
  }, []);

  useEffect(() => {
    if (urlPin) {
      const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";
      fetch(`${API_URL}/api/interviews/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: urlPin })
      })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Invalid or expired PIN link");
        return data;
      })
      .then((data) => {
        // Auto-login candidate as guest
        const guestAuth = {
          user: { name: data.interview.candidateName, role: "candidate" },
          token: null
        };
        setAuth(guestAuth);
        setRoom(data.interview);
        setJoiningFromUrl(false);
        window.history.replaceState({}, document.title, "/");
      })
      .catch((err) => {
        setUrlError(err.message);
        setJoiningFromUrl(false);
      });
    }
  }, [urlPin]);

  const role = auth?.user?.role;

  const handleAuth = (data) => {
    localStorage.setItem("hiretrack-auth", JSON.stringify(data));
    setAuth(data);
    setActiveView("dashboard");
  };

  const logout = () => {
    localStorage.removeItem("hiretrack-auth");
    setAuth(null);
    setRoom(null);
    setActiveView("dashboard");
  };

  const content = useMemo(() => {
    if (joiningFromUrl) {
      return (
        <div className="fs-gate">
          <div className="fs-gate-card">
            <div className="loading-spinner" style={{ margin: "0 auto 20px" }}></div>
            <h2>Connecting to Session...</h2>
            <p className="muted">Please wait while we verify your interview credentials.</p>
          </div>
        </div>
      );
    }

    if (urlError) {
      return (
        <div className="fs-gate">
          <div className="fs-gate-card">
            <div className="fs-gate-icon">⚠️</div>
            <h2>Verification Failed</h2>
            <p className="fs-gate-warn" style={{ marginTop: 12 }}>{urlError}</p>
            <button className="btn btn-primary" style={{ marginTop: 24, padding: "10px 28px" }} onClick={() => setUrlError("")}>
              Go to Portal
            </button>
          </div>
        </div>
      );
    }

    if (room) {
      return (
        <InterviewRoom
          interview={room}
          user={auth?.user}
          token={auth?.token}
          onLeave={() => setRoom(null)}
        />
      );
    }

    if (!auth) {
      return <AuthPanel onAuth={handleAuth} />;
    }

    if (activeView === "join" || role === "candidate") {
      return <JoinInterview onJoined={setRoom} />;
    }

    if (role === "admin") {
      return <AdminDashboard token={auth.token} />;
    }

    if (role === "recruiter") {
      return <RecruiterDashboard token={auth.token} onJoinRoom={setRoom} />;
    }

    return <JoinInterview onJoined={setRoom} />;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeView, auth, role, room]);

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Interview operations</p>
          <h1>HireTrack</h1>
        </div>

        {auth && !room && (
          <nav className="top-actions">
            {role !== "candidate" && (
              <button
                className={`btn btn-outline-light${activeView === "dashboard" ? " active-nav" : ""}`}
                onClick={() => setActiveView("dashboard")}
              >
                📊 Dashboard
              </button>
            )}
            <button
              className={`btn btn-outline-light${activeView === "join" ? " active-nav" : ""}`}
              onClick={() => setActiveView("join")}
            >
              🔗 Join Room
            </button>
            <span className="nav-user">
              {auth.user?.name} / <em>{role}</em>
            </span>
            <button className="btn btn-light" onClick={logout}>
              🚪 Logout
            </button>
          </nav>
        )}
      </header>

      <main className="content-wrap">{content}</main>
    </div>
  );
}

export default App;
