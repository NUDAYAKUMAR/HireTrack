import { useCallback, useEffect, useRef, useState } from "react";
import Editor from "@monaco-editor/react";
import { io } from "socket.io-client";
import "../interview-room.css";


const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";
const LANGUAGES = [
  { label: "JavaScript", value: "javascript" },
  { label: "Python",     value: "python"     },
  { label: "Java",       value: "java"       },
  { label: "C++",        value: "cpp"        },
  { label: "TypeScript", value: "typescript" },
  { label: "Go",         value: "go"         },
  { label: "Rust",       value: "rust"       },
  { label: "SQL",        value: "sql"        },
];
const REACTIONS = ["OK", "+1", "Idea", "Good", "Question"];

export default function InterviewRoom({ interview, user, token, onLeave }) {
  const isRecruiter = user?.role === "recruiter" || user?.role === "admin";

  const [code,          setCode]          = useState("// Start coding here\n");
  const [language,      setLanguage]      = useState("javascript");
  const [panel,         setPanel]         = useState("code");
  const [questions,     setQuestions]     = useState(interview.questions || []);
  const [activities,    setActivities]    = useState([]);
  const [messages,      setMessages]      = useState([]);
  const [chatInput,     setChatInput]     = useState("");
  const [floatEmojis,   setFloatEmojis]   = useState([]);
  const [wbColor,       setWbColor]       = useState("#00d4ff");
  const [wbSize,        setWbSize]        = useState(3);
  const [qInput,        setQInput]        = useState("");
  const [addingQ,       setAddingQ]       = useState(false);
  const [warnCount,     setWarnCount]     = useState(0);
  const [warnMsg,       setWarnMsg]       = useState("");
  const [kicked,        setKicked]        = useState(false);
  const [fsGranted,     setFsGranted]     = useState(isRecruiter);
  const [output,        setOutput]        = useState("");
  const [isRunning,     setIsRunning]     = useState(false);
  const [isError,       setIsError]       = useState(false);

  const socketRef   = useRef(null);
  const myVidRef    = useRef(null);
  const remVidRef   = useRef(null);
  const canvasRef   = useRef(null);
  const peerRef     = useRef(null);
  const localSRef   = useRef(null);
  const drawing     = useRef(false);
  const chatEnd     = useRef(null);
  const warnTimer   = useRef(null);
  const warnRef     = useRef(0);
  const authH       = { Authorization: `Bearer ${token}` };

  /* ─── WebRTC peer setup ─── */
  const createPC = useCallback((stream) => {
    if (peerRef.current) {
      try { peerRef.current.close(); } catch (_) {}
    }
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" }
      ]
    });
    stream.getTracks().forEach(t => pc.addTrack(t, stream));
    pc.ontrack = ({ streams: [s] }) => {
      if (remVidRef.current) remVidRef.current.srcObject = s;
    };
    pc.onicecandidate = ({ candidate }) => {
      if (candidate) socketRef.current?.emit("webrtc:ice", { roomId: interview.pin, candidate });
    };
    peerRef.current = pc;
    return pc;
  }, [interview.pin]);

  /* ─── warn helper (candidate) ─── */
  const triggerWarn = useCallback((type, detail) => {
    if (isRecruiter) return;
    warnRef.current += 1;
    const c = warnRef.current;
    setWarnCount(c);
    reportAct(type, detail);
    if (c >= 3) {
      setWarnMsg("Third violation. You are being removed.");
      clearTimeout(warnTimer.current);
      setTimeout(() => { setKicked(true); setTimeout(onLeave, 1800); }, 2200);
    } else {
      setWarnMsg(`Warning ${c}/3: ${detail} (${3 - c} left)`);
      clearTimeout(warnTimer.current);
      warnTimer.current = setTimeout(() => setWarnMsg(""), 5000);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRecruiter, onLeave]);

  /* ─── activity logger ─── */
  const reportAct = useCallback(async (type, details) => {
    const a = { type, details, at: new Date().toISOString() };
    setActivities(p => [a, ...p].slice(0, 60));
    socketRef.current?.emit("candidate:activity", { roomId: interview.pin, activity: a });
    try {
      await fetch(`${API_URL}/api/interviews/${interview.pin}/activity`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ type, details })
      });
    } catch (_) {}
  }, [interview.pin, token]);

  /* ─── floating reaction ─── */
  const showFloat = useCallback((emoji) => {
    const id = Date.now() + Math.random();
    setFloatEmojis(p => [...p, { emoji, id }]);
    setTimeout(() => setFloatEmojis(p => p.filter(x => x.id !== id)), 2500);
  }, []);

  const sendReaction = (emoji) => {
    showFloat(emoji);
    socketRef.current?.emit("reaction:send", { roomId: interview.pin, emoji, sender: user?.name || "You" });
  };

  /* ─── chat ─── */
  const sendChat = (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    const msg = { text: chatInput.trim(), sender: user?.name || "You", own: true, at: new Date().toISOString() };
    setMessages(p => [...p, msg]);
    socketRef.current?.emit("chat:message", { roomId: interview.pin, text: msg.text, sender: msg.sender });
    setChatInput("");
  };

  /* ─── questions (recruiter) ─── */
  const addQuestion = async () => {
    if (!qInput.trim()) return;
    setAddingQ(true);
    try {
      const r = await fetch(`${API_URL}/api/interviews/${interview._id}/questions`, {
        method: "POST", headers: { ...authH, "Content-Type": "application/json" },
        body: JSON.stringify({ question: qInput.trim() })
      });
      if (r.ok) {
        const d = await r.json();
        setQuestions(d.interview.questions);
        setQInput("");
        socketRef.current?.emit("questions:update", { roomId: interview.pin, questions: d.interview.questions });
      }
    } catch (_) {}
    setAddingQ(false);
  };

  const removeQuestion = async (idx) => {
    try {
      const r = await fetch(`${API_URL}/api/interviews/${interview._id}/questions`, {
        method: "DELETE", headers: { ...authH, "Content-Type": "application/json" },
        body: JSON.stringify({ index: idx })
      });
      if (r.ok) {
        const d = await r.json();
        setQuestions(d.interview.questions);
        socketRef.current?.emit("questions:update", { roomId: interview.pin, questions: d.interview.questions });
      }
    } catch (_) {}
  };

  /* ─── code execution ─── */
  const runCode = async () => {
    setIsRunning(true);
    setOutput("Running code...");
    setIsError(false);
    try {
      const langMap = {
        javascript: "nodejs-20.17.0",
        python:     "cpython-3.14.0",
        java:       "openjdk-jdk-22+36",
        cpp:        "gcc-head",
        typescript: "typescript-5.6.2",
        go:         "go-1.23.2",
        rust:       "rust-1.82.0",
        sql:        "sqlite-3.46.1",
      };
      const compilerName = langMap[language] || "gcc-head";
      const res = await fetch("https://wandbox.org/api/compile.json", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          compiler: compilerName,
          code: code
        })
      });
      if (!res.ok) {
        const text = await res.text();
        setOutput(`API error ${res.status}: ${text}`);
        setIsError(true);
        setIsRunning(false);
        return;
      }
      const data = await res.json();
      const hasErr = data.status !== "0";
      const errOut = data.program_error || data.compiler_error || data.compiler_message;
      const stdOut = data.program_output || data.compiler_output || "";
      let finalOut = stdOut;
      
      if (hasErr) {
          finalOut = errOut ? `Error:\n${errOut}\n\nOutput:\n${stdOut}` : (stdOut || "Failed to execute");
      } else if (errOut) {
          finalOut = `stderr:\n${errOut}\n\nstdout:\n${stdOut}`;
      } else {
          finalOut = stdOut || "(no output)";
      }
      
      setOutput(finalOut);
      setIsError(hasErr);
      socketRef.current?.emit("code:output", { roomId: interview.pin, output: finalOut, isError: hasErr });
    } catch (err) {
      setOutput(`Failed to connect to execution engine.\n\nDetails: ${err.message}`);
      setIsError(true);
    }
    setIsRunning(false);
  };

  /* ─── whiteboard ─── */
  const startDraw = (e) => {
    drawing.current = true;
    const cv = canvasRef.current;
    const r = cv.getBoundingClientRect();
    const x = e.clientX - r.left, y = e.clientY - r.top;
    const ctx = cv.getContext("2d");
    ctx.beginPath(); ctx.moveTo(x, y);
    socketRef.current?.emit("whiteboard:draw", { roomId: interview.pin, payload: { action: "start", x, y, color: wbColor, size: wbSize } });
  };
  const onDraw = (e) => {
    if (!drawing.current) return;
    const cv = canvasRef.current;
    const ctx = cv.getContext("2d");
    const r = cv.getBoundingClientRect();
    const x = e.clientX - r.left, y = e.clientY - r.top;
    ctx.strokeStyle = wbColor; ctx.lineWidth = wbSize; ctx.lineCap = "round";
    ctx.lineTo(x, y); ctx.stroke();
    socketRef.current?.emit("whiteboard:draw", { roomId: interview.pin, payload: { action: "draw", x, y, color: wbColor, size: wbSize } });
  };
  const clearCanvas = () => {
    const cv = canvasRef.current;
    cv.getContext("2d").clearRect(0, 0, cv.width, cv.height);
    socketRef.current?.emit("whiteboard:clear", { roomId: interview.pin });
  };

  /* ─── main socket + camera setup ─── */
  useEffect(() => {
    if (!isRecruiter && !fsGranted) return;

    const socket = io(API_URL, { transports: ["websocket"] });
    socketRef.current = socket;
    const roomId = interview.pin;

    socket.emit("room:join", { roomId, user: user || { name: "Guest" } });

    socket.on("editor:change",    val      => setCode(val));
    socket.on("lang:change",      lang     => setLanguage(lang));
    socket.on("questions:update", qs       => setQuestions(qs));
    socket.on("candidate:activity", act   => setActivities(p => [act, ...p].slice(0, 60)));
    socket.on("chat:message", msg          => setMessages(p => [...p, { ...msg, own: false }]));
    socket.on("reaction:send", ({ emoji }) => showFloat(emoji));
    socket.on("code:output", ({ output, isError }) => {
      setOutput(output);
      setIsError(isError);
    });
    socket.on("whiteboard:clear", ()       => {
      const cv = canvasRef.current;
      if (cv) cv.getContext("2d").clearRect(0, 0, cv.width, cv.height);
    });
    socket.on("whiteboard:draw", ({ payload }) => {
      const cv = canvasRef.current;
      if (!cv) return;
      const ctx = cv.getContext("2d");
      if (payload.action === "start") {
        ctx.beginPath(); ctx.moveTo(payload.x, payload.y);
      } else {
        ctx.strokeStyle = payload.color; ctx.lineWidth = payload.size; ctx.lineCap = "round";
        ctx.lineTo(payload.x, payload.y); ctx.stroke();
      }
    });

    /* When someone new joins, tell them we are ready (if we already have camera) */
    socket.on("room:user-joined", () => {
      if (localSRef.current) socket.emit("webrtc:ready", { roomId });
    });

    const iceQueue = [];

    /* WebRTC – when the other peer is ready with their camera, initiate offer */
    socket.on("webrtc:ready", async () => {
      if (!localSRef.current) return;
      const pc = createPC(localSRef.current);
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.emit("webrtc:offer", { roomId, offer });
    });
    socket.on("webrtc:offer", async (offer) => {
      if (!localSRef.current) return;
      const pc = createPC(localSRef.current);
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit("webrtc:answer", { roomId, answer });

      // Process any queued candidates
      while (iceQueue.length > 0) {
        const cand = iceQueue.shift();
        try { await pc.addIceCandidate(cand); } catch (_) {}
      }
    });
    socket.on("webrtc:answer", async (answer) => {
      const pc = peerRef.current;
      if (pc) {
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
        // Process any queued candidates
        while (iceQueue.length > 0) {
          const cand = iceQueue.shift();
          try { await pc.addIceCandidate(cand); } catch (_) {}
        }
      }
    });
    socket.on("webrtc:ice", async (candidate) => {
      const cand = new RTCIceCandidate(candidate);
      const pc = peerRef.current;
      if (pc && pc.remoteDescription) {
        try { await pc.addIceCandidate(cand); } catch (_) {}
      } else {
        iceQueue.push(cand);
      }
    });

    /* camera – use localSRef so WebRTC handlers can access the stream */
    navigator.mediaDevices?.getUserMedia({ video: true, audio: true })
      .then(stream => {
        localSRef.current = stream;
        if (myVidRef.current) myVidRef.current.srcObject = stream;
        // Tell others we have our camera ready
        socket.emit("webrtc:ready", { roomId });
      })
      .catch(() => { if (!isRecruiter) triggerWarn("camera-denied", "Camera access denied"); });

    if (!isRecruiter) {
      const onVis  = () => { if (document.hidden) triggerWarn("tab-switch", "Switched tabs"); };
      const onPaste= e => { e.preventDefault(); triggerWarn("paste", "Paste blocked"); };
      const onCopy = e => { e.preventDefault(); triggerWarn("copy",  "Copy blocked");  };
      const onCtx  = e => e.preventDefault();
      const onFs   = () => { if (!document.fullscreenElement) triggerWarn("fullscreen-exit", "Exited fullscreen"); };
      document.addEventListener("visibilitychange", onVis);
      document.addEventListener("paste", onPaste);
      document.addEventListener("copy",  onCopy);
      document.addEventListener("contextmenu", onCtx);
      document.addEventListener("fullscreenchange", onFs);
      return () => {
        socket.disconnect();
        peerRef.current?.close();
        localSRef.current?.getTracks().forEach(t => t.stop());
        document.removeEventListener("visibilitychange", onVis);
        document.removeEventListener("paste", onPaste);
        document.removeEventListener("copy",  onCopy);
        document.removeEventListener("contextmenu", onCtx);
        document.removeEventListener("fullscreenchange", onFs);
        clearTimeout(warnTimer.current);
      };
    }
    return () => {
      socket.disconnect();
      peerRef.current?.close();
      localSRef.current?.getTracks().forEach(t => t.stop());
    };
  }, [interview.pin, isRecruiter, fsGranted, createPC, showFloat, triggerWarn, user]);

  useEffect(() => { chatEnd.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const handleCodeChange = val => {
    setCode(val || "");
    socketRef.current?.emit("editor:change", { roomId: interview.pin, code: val || "" });
  };
  const handleLangChange = e => {
    setLanguage(e.target.value);
    socketRef.current?.emit("lang:change", { roomId: interview.pin, language: e.target.value });
  };

  /* ─── FULLSCREEN GATE (candidate) ─── */
  if (!isRecruiter && !fsGranted) {
    return (
      <div className="fs-gate">
        <div className="fs-gate-card">
          <div className="fs-gate-icon">Lock</div>
          <h2>Fullscreen Required</h2>
          <p>This interview runs in <strong>fullscreen only</strong>. Tab switching, copy &amp; paste are monitored.</p>
          <p className="fs-gate-warn">You get <strong>3 warnings</strong> before being removed.</p>
          <button className="int-btn int-btn-primary" style={{ marginTop: 16, fontSize: 16, padding: "14px 36px" }}
            onClick={async () => {
              try { await document.documentElement.requestFullscreen(); } catch (_) {}
              setFsGranted(true);
            }}>
            🚀 Enter Fullscreen &amp; Begin
          </button>
        </div>
      </div>
    );
  }

  if (kicked) {
    return (
      <div className="fs-gate kicked-screen">
        <div className="fs-gate-card">
          <div className="fs-gate-icon">Removed</div>
          <h2>Removed from Interview</h2>
          <p>You exceeded the maximum violations and have been removed.</p>
        </div>
      </div>
    );
  }

  /* ─── MAIN ROOM ─── */
  return (
    <div className="int-shell">
      {/* Floating reactions */}
      <div className="float-layer">
        {floatEmojis.map(({ emoji, id }) => (
          <span key={id} className="float-emoji">{emoji}</span>
        ))}
      </div>

      {/* Warning banner */}
      {warnMsg && (
        <div className={`int-warn-banner ${warnCount >= 3 ? "warn-critical" : ""}`}>{warnMsg}</div>
      )}

      {/* Header */}
      <header className="int-header">
        <div className="int-header-left">
          <span className="int-kicker">{isRecruiter ? "Recruiter / Live Session" : "Interview in Progress"}</span>
          <h2 className="int-title">{interview.title}</h2>
        </div>
        <div className="int-header-center">
          {!isRecruiter && warnCount > 0 && (
            <div className="warn-dots">
              {[1,2,3].map(n => (
                <span key={n} className={`wdot ${warnCount >= n ? (warnCount >= 3 ? "wdot-red" : "wdot-amber") : "wdot-off"}`} />
              ))}
              <span className="wdot-label">{warnCount}/3</span>
            </div>
          )}
        </div>
        <div className="int-header-right">
          <span className="int-name-tag">{user?.name || interview.candidateName}</span>
          <button className="int-btn int-btn-danger" onClick={onLeave}>
            {isRecruiter ? "End Session" : "Leave"}
          </button>
        </div>
      </header>

      {/* Body */}
      <div className="int-body">
        {/* ── LEFT: main panel ── */}
        <div className="int-main">
          {/* Panel tabs */}
          <div className="int-tabs">
            <button className={`int-tab ${panel === "code" ? "int-tab-active" : ""}`} onClick={() => setPanel("code")}>
              Code Editor
            </button>
            <button className={`int-tab ${panel === "whiteboard" ? "int-tab-active" : ""}`} onClick={() => setPanel("whiteboard")}>
              Whiteboard
            </button>
            {panel === "code" && (
              <select className="lang-select" value={language} onChange={handleLangChange}>
                {LANGUAGES.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
              </select>
            )}
            {panel === "whiteboard" && (
              <div className="wb-controls">
                <input type="color" value={wbColor} onChange={e => setWbColor(e.target.value)} className="wb-color" title="Brush color" />
                <select className="wb-size-sel" value={wbSize} onChange={e => setWbSize(Number(e.target.value))}>
                  <option value={2}>Thin</option>
                  <option value={4}>Medium</option>
                  <option value={8}>Thick</option>
                  <option value={16}>Marker</option>
                </select>
                <button className="int-btn int-btn-ghost" onClick={clearCanvas}>🗑 Clear</button>
              </div>
            )}
          </div>

          {/* Code editor */}
          {panel === "code" && (
            <div className="int-editor-wrap">
              {isRecruiter && <div className="live-overlay">Live candidate code</div>}
              <div style={{ flex: 1, minHeight: 0 }}>
                <Editor
                  height="100%"
                  language={language}
                  value={code}
                  onChange={isRecruiter ? undefined : handleCodeChange}
                  theme="vs-dark"
                  options={{ readOnly: isRecruiter, fontSize: 15, minimap: { enabled: false }, quickSuggestions: false,
                    scrollBeyondLastLine: false, padding: { top: 12 }, fontFamily: "JetBrains Mono, Fira Code, monospace" }}
                />
              </div>
              <div className="output-pane">
                <div className="output-header">
                  <span>Console Output</span>
                  <button className="int-btn int-btn-success" onClick={runCode} disabled={isRunning} style={{ padding: "4px 12px", fontSize: "11px" }}>
                    {isRunning ? "Running..." : "Run Code"}
                  </button>
                </div>
                <div className={`output-content ${isError ? "output-error" : ""}`}>
                  {output || "Output will appear here..."}
                </div>
              </div>
            </div>
          )}

          {/* Whiteboard */}
          {panel === "whiteboard" && (
            <div className="int-wb-wrap">
              <canvas
                ref={canvasRef} width={900} height={520}
                className="int-canvas"
                onMouseDown={startDraw}
                onMouseMove={onDraw}
                onMouseUp={() => { drawing.current = false; }}
                onMouseLeave={() => { drawing.current = false; }}
              />
            </div>
          )}

          {/* Reactions bar */}
          <div className="reactions-bar">
            {REACTIONS.map(e => (
              <button key={e} className="reaction-btn" onClick={() => sendReaction(e)}>{e}</button>
            ))}
            <span className="reaction-hint">React</span>
          </div>
        </div>

        {/* ── RIGHT: sidebar ── */}
        <aside className="int-sidebar">
          {/* Camera feeds */}
          <div className="cam-feeds combined-cam" id="cam-container">
            <div className="cam-box remote-cam">
              <video ref={remVidRef} autoPlay playsInline className="cam-vid" />
              <span className="cam-label">{isRecruiter ? "Candidate" : "Recruiter"}</span>
            </div>
            <div className="cam-box local-cam-pip">
              <video ref={myVidRef} autoPlay muted playsInline className="cam-vid" />
              <span className="cam-label">You</span>
            </div>
            <button className="cam-fullscreen-btn" onClick={(e) => {
               const el = document.getElementById("cam-container");
               if (!document.fullscreenElement) {
                 el.requestFullscreen().catch(()=>{});
               } else {
                 document.exitFullscreen().catch(()=>{});
               }
            }} title="Toggle Fullscreen">
              ⛶
            </button>
          </div>

          {/* Questions */}
          <div className="side-section">
            <div className="side-section-head">
              <span>Questions</span>
              <span className="q-badge">{questions.length}</span>
            </div>
            <ol className="q-ol">
              {questions.length === 0 && <p className="side-empty">{isRecruiter ? "Add questions below." : "No questions yet."}</p>}
              {questions.map((q, i) => (
                <li key={i} className="q-li">
                  <span>{q}</span>
                  {isRecruiter && <button className="q-del" onClick={() => removeQuestion(i)}>✕</button>}
                </li>
              ))}
            </ol>
            {isRecruiter && (
              <div className="q-add">
                <input className="q-add-input" placeholder="Add a question…" value={qInput}
                  onChange={e => setQInput(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addQuestion(); } }} />
                <button className="int-btn int-btn-success" onClick={addQuestion} disabled={addingQ || !qInput.trim()}>+</button>
              </div>
            )}
          </div>

          {/* Activity log (recruiter) */}
          {isRecruiter && (
            <div className="side-section act-section">
              <div className="side-section-head">
                <span>Activity</span>
                {activities.length > 0 && <span className="act-badge">{activities.length}</span>}
              </div>
              <div className="act-list">
                {activities.length === 0 && <p className="side-empty">Waiting for activity…</p>}
                {activities.map((a, i) => (
                  <div key={i} className={`act-row ${a.type.includes("switch")||a.type==="paste"||a.type==="copy"?"act-bad":"act-good"}`}>
                    <strong>{a.type}</strong><span>{a.details}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Chat */}
          <div className="side-section chat-section">
            <div className="side-section-head"><span>Chat</span></div>
            <div className="chat-msgs">
              {messages.length === 0 && <p className="side-empty">No messages yet.</p>}
              {messages.map((m, i) => (
                <div key={i} className={`chat-bubble ${m.own ? "bubble-own" : "bubble-other"}`}>
                  <span className="bubble-sender">{m.own ? "You" : m.sender}</span>
                  <span className="bubble-text">{m.text}</span>
                </div>
              ))}
              <div ref={chatEnd} />
            </div>
            <form className="chat-input-row" onSubmit={sendChat}>
              <input className="chat-input" placeholder="Type a message…" value={chatInput} autoComplete="off"
                onChange={e => setChatInput(e.target.value)} />
              <button type="submit" className="int-btn int-btn-primary">Send</button>
            </form>
          </div>
        </aside>
      </div>
    </div>
  );
}
