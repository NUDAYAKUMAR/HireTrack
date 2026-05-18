import { useMemo, useState } from "react";
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
