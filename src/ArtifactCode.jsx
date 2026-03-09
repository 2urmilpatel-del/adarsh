import { useState, useEffect, useRef } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid, Cell } from "recharts";

// ─── CONFIG ───────────────────────────────────────────────────────────────────
const TEAM = {
  A: { name: "Team Satsang", color: "#c0392b", glow: "#c0392b44", bg: "#c0392b14" },
  B: { name: "Team Sadhana", color: "#d4a017", glow: "#d4a01744", bg: "#d4a01714" },
};
const MILESTONES = [
  { pts: 300, badge: "👑", label: "Champion" },
  { pts: 200, badge: "⭐", label: "Star" },
  { pts: 100, badge: "💥", label: "On Fire" },
  { pts: 50,  badge: "✦",  label: "Rising Star" },
];
const PRESETS = [
  { id: "sabha",        label: "Coming to Sabha",   pts: 20, color: "#6c5ce7", isStreak: true  },
  { id: "jabho",        label: "Wear Jabho Lengho", pts: 5,  color: "#00b894", isStreak: false },
  { id: "presentation", label: "Presentation",      pts: 10, color: "#e17055", isStreak: false },
  { id: "mc",           label: "MC",                pts: 5,  color: "#0984e3", isStreak: false },
  { id: "dpk",          label: "DPK",               pts: 5,  color: "#fd79a8", isStreak: false },
  { id: "seva",         label: "Seva",              pts: 5,  color: "#55efc4", isStreak: false },
  { id: "participation", label: "Sabha Participation", pts: 2,  color: "#a29bfe", isStreak: false },
];
const ADMIN_PASSWORD = "admin123";
const TOURNAMENT_END = new Date("2026-06-30T23:59:59");
const STORAGE_KEY = "adarsh-v6-data-v3";

// ─── DEFAULT DATA ─────────────────────────────────────────────────────────────
const DEFAULT_PLAYERS = [
  { id: 1,  name: "Riddhesh Sharma",   team: "A", points: 116, captain: true,  streak: 0 },
  { id: 2,  name: "Ayush Patel",        team: "A", points: 79,  captain: false, streak: 0 },
  { id: 3,  name: "Veer Sangani",       team: "A", points: 96,  captain: false, streak: 0 },
  { id: 4,  name: "Sumukh Sheth",       team: "A", points: 87,  captain: false, streak: 0 },
  { id: 5,  name: "Avee Patel",         team: "A", points: 78,  captain: false, streak: 0 },
  { id: 6,  name: "Pratham Shukla",     team: "A", points: 35,  captain: false, streak: 0 },
  { id: 7,  name: "Tej Zaveri",         team: "A", points: 66,  captain: false, streak: 0 },
  { id: 8,  name: "Neev Bhadesia",      team: "A", points: 22,  captain: false, streak: 0 },
  { id: 9,  name: "Mandar Brahmbhatt",  team: "B", points: 92,  captain: true,  streak: 0 },
  { id: 10, name: "Urmil Patel",        team: "B", points: 158, captain: false, streak: 0 },
  { id: 11, name: "Rohan Patel",        team: "B", points: 61,  captain: false, streak: 0 },
  { id: 12, name: "Dwij Sharma",        team: "B", points: 92,  captain: false, streak: 0 },
  { id: 13, name: "Oam Patel",          team: "B", points: 110, captain: false, streak: 0 },
  { id: 14, name: "Niyam Patel",        team: "B", points: 88,  captain: false, streak: 0 },
  { id: 15, name: "Rudra Patel",        team: "B", points: 34,  captain: false, streak: 0 },
  { id: 16, name: "Harsh Sodavadiya",   team: "B", points: 0,   captain: false, streak: 0 },
];
const DEFAULT_DATA = {
  players: DEFAULT_PLAYERS,
  activity: [],
  poll: { question: "Who is the MVP of the tournament so far?", votes: {} },
  history: [],
  duels: [],
};

// ─── HELPERS ──────────────────────────────────────────────────────────────────
const teamTotal = (players, team) =>
  players.filter(p => p.team === team).reduce((s, p) => s + p.points, 0);
const byPoints = arr => [...arr].sort((a, b) => b.points - a.points);
const getMilestone = pts => MILESTONES.find(m => pts >= m.pts) || null;
const mostImproved = (players, activity) => {
  const cutoff = Date.now() - 7 * 86400000;
  const gains = {};
  (activity || []).filter(a => a.ts > cutoff && a.delta > 0).forEach(a => {
    gains[a.pid] = (gains[a.pid] || 0) + a.delta;
  });
  const top = Object.entries(gains).sort((a, b) => b[1] - a[1])[0];
  if (!top) return null;
  const p = players.find(p => p.id === Number(top[0]));
  return p ? { player: p, gained: top[1] } : null;
};

// ─── HOOKS ────────────────────────────────────────────────────────────────────
function useCountdown(target) {
  const calc = () => {
    const diff = target - Date.now();
    if (!(diff >= 1)) return { d: 0, h: 0, m: 0, s: 0, done: true };
    return {
      d: Math.floor(diff / 86400000),
      h: Math.floor((diff % 86400000) / 3600000),
      m: Math.floor((diff % 3600000) / 60000),
      s: Math.floor((diff % 60000) / 1000),
      done: false,
    };
  };
  const [t, setT] = useState(calc);
  useEffect(() => { const id = setInterval(() => setT(calc()), 1000); return () => clearInterval(id); }, []);
  return t;
}

function useAnimatedNumber(target, dur = 700) {
  const [val, setVal] = useState(target);
  const fromRef = useRef(target);
  const rafRef = useRef(null);
  useEffect(() => {
    if (fromRef.current === target) return;
    const start = fromRef.current, diff = target - start, t0 = performance.now();
    const step = now => {
      const p = Math.min((now - t0) / dur, 1);
      setVal(Math.round(start + diff * (1 - Math.pow(1 - p, 3))));
      if (!(p >= 1)) rafRef.current = requestAnimationFrame(step);
      else fromRef.current = target;
    };
    rafRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target]);
  return val;
}

function useSharedData() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState("saved");
  const undoRef = useRef(null);
  const [canUndo, setCanUndo] = useState(false);

  const load = async (silent = false) => {
    try {
      const res = await window.storage.get(STORAGE_KEY, true);
      if (res?.value) {
        const parsed = JSON.parse(res.value);
        setData({ ...DEFAULT_DATA, ...parsed });
      } else {
        await window.storage.set(STORAGE_KEY, JSON.stringify(DEFAULT_DATA), true);
        setData(DEFAULT_DATA);
      }
    } catch { setData(prev => prev || DEFAULT_DATA); }
    if (!silent) setLoading(false);
  };

  useEffect(() => { load(); const id = setInterval(() => load(true), 5000); return () => clearInterval(id); }, []);

  const save = (updater) => {
    setSaveStatus("saving");
    setData(prev => {
      undoRef.current = prev;
      setCanUndo(true);
      const next = typeof updater === "function" ? updater(prev) : updater;
      window.storage.set(STORAGE_KEY, JSON.stringify(next), true).catch(() => {});
      setTimeout(() => setSaveStatus("saved"), 500);
      return next;
    });
  };

  const undo = () => {
    if (!undoRef.current) return;
    const prev = undoRef.current;
    undoRef.current = null;
    setCanUndo(false);
    setData(prev);
    window.storage.set(STORAGE_KEY, JSON.stringify(prev), true).catch(() => {});
  };

  return { data, save, undo, canUndo, saveStatus, loading };
}

// ─── STYLES ───────────────────────────────────────────────────────────────────
const St = {
  root: { minHeight: "100vh", background: "#090910", color: "#e0e0ee", fontFamily: "'Bebas Neue', 'Arial Narrow', sans-serif", letterSpacing: "0.04em" },
  nav: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 28px", borderBottom: "1px solid #ffffff10", background: "#0c0c16", flexWrap: "wrap", gap: 10 },
  logo: { fontSize: 18, color: "#fff", letterSpacing: "0.12em" },
  tabs: { display: "flex", gap: 4, flexWrap: "wrap" },
  tab: a => ({ padding: "7px 15px", border: "1px solid", borderColor: a ? "#ffffff44" : "#ffffff14", background: a ? "#ffffff0f" : "transparent", color: a ? "#fff" : "#555", borderRadius: 6, cursor: "pointer", fontSize: 12, letterSpacing: "0.08em", fontFamily: "inherit", transition: "all 0.15s" }),
  page: { maxWidth: 980, margin: "0 auto", padding: "28px 20px 80px" },
  // countdown
  cdLabel: { textAlign: "center", fontSize: 10, color: "#444", letterSpacing: "0.16em", marginBottom: 10 },
  cdRow: { display: "flex", justifyContent: "center", gap: 8, marginBottom: 30 },
  cdUnit: { textAlign: "center", background: "#ffffff07", border: "1px solid #ffffff0e", borderRadius: 10, padding: "12px 16px", minWidth: 62 },
  cdNum: { fontSize: 32, color: "#fff", lineHeight: 1 },
  cdULabel: { fontSize: 9, color: "#3a3a5a", letterSpacing: "0.14em", marginTop: 4 },
  cdSep: { display: "flex", alignItems: "center", paddingBottom: 10, fontSize: 22, color: "#222" },
  // teams
  scoreGrid: { display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 12, marginBottom: 10 },
  teamCard: t => ({ background: TEAM[t].bg, border: `1px solid ${TEAM[t].color}44`, borderRadius: 14, padding: "22px 18px", textAlign: "center", boxShadow: `0 0 32px ${TEAM[t].glow}` }),
  teamLabel: t => ({ fontSize: 11, color: TEAM[t].color, letterSpacing: "0.14em", marginBottom: 6 }),
  teamScore: { fontSize: 60, fontWeight: 700, color: "#fff", lineHeight: 1 },
  vsBox: { display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, color: "#2a2a3a", fontWeight: 700 },
  leadBanner: t => ({ textAlign: "center", padding: "10px 18px", marginBottom: 20, borderRadius: 10, background: TEAM[t].bg, border: `1px solid ${TEAM[t].color}44`, fontSize: 13, color: TEAM[t].color, letterSpacing: "0.07em" }),
  tieBanner: { textAlign: "center", padding: "10px 18px", marginBottom: 20, borderRadius: 10, background: "#ffffff07", border: "1px solid #ffffff12", fontSize: 13, color: "#555", letterSpacing: "0.07em" },
  // win prob bar
  winBar: { marginBottom: 24 },
  winBarTrack: { height: 8, borderRadius: 99, overflow: "hidden", display: "flex" },
  // sections
  sTitle: { fontSize: 11, color: "#444", letterSpacing: "0.16em", textTransform: "uppercase", marginBottom: 12, borderBottom: "1px solid #ffffff07", paddingBottom: 6, marginTop: 28 },
  twoCol: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 },
  // player row
  pRow: (rank, team) => ({ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", borderRadius: 9, background: rank === 0 ? TEAM[team].bg : "#ffffff04", border: `1px solid ${rank === 0 ? TEAM[team].color + "44" : "#ffffff08"}`, marginBottom: 5 }),
  rankBadge: (rank, team) => ({ width: 22, height: 22, borderRadius: "50%", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700, color: "#fff", background: rank === 0 ? TEAM[team].color : rank === 1 ? "#777" : rank === 2 ? "#444" : "#1e1e2e" }),
  pName: { flex: 1, fontSize: 13, color: "#d0d0e0" },
  pPts: t => ({ fontSize: 14, fontWeight: 700, color: TEAM[t].color, flexShrink: 0 }),
  // activity
  actRow: t => ({ display: "flex", alignItems: "center", gap: 8, padding: "7px 11px", background: "#ffffff05", borderRadius: 8, borderLeft: `3px solid ${(TEAM[t] ? TEAM[t].color : "#555")}`, marginBottom: 4 }),
  // admin
  adminCard: { background: "#0f0f1c", border: "1px solid #ffffff0e", borderRadius: 12, padding: "18px" },
  pBtn: bg => ({ height: 28, padding: "0 9px", borderRadius: 5, border: "none", cursor: "pointer", fontSize: 11, fontWeight: 700, fontFamily: "inherit", background: bg || "#252535", color: "#fff", whiteSpace: "nowrap" }),
  sInput: { padding: "7px 10px", background: "#ffffff0a", border: "1px solid #ffffff14", borderRadius: 5, color: "#fff", fontSize: 12, fontFamily: "inherit", outline: "none" },
  captBadge: { fontSize: 9, color: "#f0c040", border: "1px solid #f0c04033", borderRadius: 4, padding: "1px 5px", marginLeft: 4, letterSpacing: "0.06em" },
  presetBtn: (color, sel) => ({ padding: "9px 16px", background: sel ? color + "33" : color + "15", border: `1px solid ${sel ? color : color + "44"}`, outline: sel ? `2px solid ${color}` : "none", borderRadius: 8, color: "#fff", fontSize: 12, fontFamily: "inherit", cursor: "pointer", display: "flex", alignItems: "center", gap: 8, transition: "all 0.15s" }),
  logEntry: { fontSize: 10, color: "#444", marginBottom: 3 },
  // login
  loginWrap: { maxWidth: 340, margin: "80px auto", textAlign: "center" },
  loginInput: { width: "100%", padding: "11px 15px", background: "#ffffff0a", border: "1px solid #ffffff18", borderRadius: 8, color: "#fff", fontSize: 14, fontFamily: "inherit", marginBottom: 10, boxSizing: "border-box", outline: "none" },
  loginBtn: { width: "100%", padding: "11px", background: "#c0392b", border: "none", borderRadius: 8, color: "#fff", fontSize: 15, fontFamily: "inherit", letterSpacing: "0.08em", cursor: "pointer" },
  errText: { color: "#e74c3c", fontSize: 12, marginBottom: 8 },
};

// ─── SMALL COMPONENTS ─────────────────────────────────────────────────────────
function MilestoneBadge({ points }) {
  const m = getMilestone(points);
  return m ? <span style={{ fontSize: 12, marginLeft: 3 }}>{m.badge}</span> : null;
}

function StreakBadge({ streak }) {
  if (!streak || !(streak >= 1)) return null;
  return <span style={{ fontSize: 10, color: "#f39c12", marginLeft: 4, letterSpacing: "0.04em" }}>🔥{streak}</span>;
}

function CaptainBadge() {
  return <span style={St.captBadge}>C</span>;
}

function Countdown() {
  const { d, h, m, s, done } = useCountdown(TOURNAMENT_END);
  if (done) return <div style={{ textAlign: "center", fontSize: 18, color: "#f0c040", marginBottom: 28, letterSpacing: "0.1em" }}>TOURNAMENT HAS ENDED</div>;
  const units = [{ v: d, l: "DAYS" }, { v: h, l: "HRS" }, { v: m, l: "MIN" }, { v: s, l: "SEC" }];
  return (
    <div>
      <div style={St.cdLabel}>TIME UNTIL TOURNAMENT ENDS</div>
      <div style={St.cdRow}>
        {units.map((u, i) => (
          <div key={u.l} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={St.cdUnit}>
              <div style={St.cdNum}>{String(u.v).padStart(2, "0")}</div>
              <div style={St.cdULabel}>{u.l}</div>
            </div>
            {i !== 3 && <div style={St.cdSep}>:</div>}
          </div>
        ))}
      </div>
    </div>
  );
}

function WinProbBar({ players }) {
  const a = teamTotal(players, "A"), b = teamTotal(players, "B"), total = a + b;
  const pA = total > 0 ? (a / total * 100) : 50, pB = 100 - pA;
  return (
    <div style={St.winBar}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#555", letterSpacing: "0.1em", marginBottom: 6 }}>
        <span style={{ color: TEAM.A.color }}>{TEAM.A.name} {pA.toFixed(1)}%</span>
        <span>SCORE SHARE</span>
        <span style={{ color: TEAM.B.color }}>{pB.toFixed(1)}% {TEAM.B.name}</span>
      </div>
      <div style={St.winBarTrack}>
        <div style={{ width: `${pA}%`, background: TEAM.A.color, transition: "width 0.7s ease" }} />
        <div style={{ width: `${pB}%`, background: TEAM.B.color, transition: "width 0.7s ease" }} />
      </div>
    </div>
  );
}

function ActivityFeed({ activity }) {
  if (!(activity && activity.length)) return <div style={{ fontSize: 12, color: "#333", textAlign: "center", padding: "14px 0" }}>No activity yet — add some points!</div>;
  return (
    <div>
      {activity.slice(0, 8).map(a => (
        <div key={a.id} style={St.actRow(a.team)}>
          <div style={{ flex: 1, fontSize: 12, color: "#bbb" }}>{a.name}</div>
          <div style={{ fontSize: 12, color: a.delta > 0 ? "#2ecc71" : "#e74c3c", fontWeight: 700 }}>{a.delta > 0 ? "+" : ""}{a.delta}</div>
          <div style={{ fontSize: 10, color: "#555" }}>{a.reason}</div>
          <div style={{ fontSize: 9, color: "#333" }}>{new Date(a.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
        </div>
      ))}
    </div>
  );
}

function PlayerRow({ p, rank, showBar = true }) {
  const total = p._teamTotal || 1;
  const pct = total > 0 ? (p.points / total * 100) : 0;
  return (
    <div style={St.pRow(rank, p.team)}>
      <div style={St.rankBadge(rank, p.team)}>{rank + 1}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", marginBottom: showBar ? 4 : 0 }}>
          <div style={{ ...St.pName, flex: 1 }}>
            {p.name}
            {p.captain && <CaptainBadge />}
            <MilestoneBadge points={p.points} />
            <StreakBadge streak={p.streak} />
            {p._teamAvg && p.points < p._teamAvg && <span style={{ fontSize: 9, color: "#27ae60", background: "#27ae6022", border: "1px solid #27ae6044", borderRadius: 4, padding: "1px 5px", marginLeft: 3 }}>1.5x</span>}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
            {showBar && <div style={{ fontSize: 10, color: "#444", letterSpacing: "0.04em" }}>{pct.toFixed(1)}%</div>}
            <div style={St.pPts(p.team)}>{p.points}</div>
          </div>
        </div>
        {showBar && (
          <div style={{ height: 2, background: "#ffffff08", borderRadius: 99 }}>
            <div style={{ height: "100%", width: `${pct}%`, background: TEAM[p.team].color, borderRadius: 99, transition: "width 0.5s ease" }} />
          </div>
        )}
      </div>
    </div>
  );
}


// ─── EMOJI KEY ────────────────────────────────────────────────────────────────
function EmojiKey() {
  const badges = [
    { badge: "👑", label: "Champion",     desc: "300+ points" },
    { badge: "⭐", label: "Star",          desc: "200+ points" },
    { badge: "💥", label: "On Fire",       desc: "100+ points" },
    { badge: "✦",  label: "Rising Star",   desc: "50+ points" },
    { badge: "🔥#", label: "Sabha Streak", desc: "Consecutive Sabhas attended" },
    { badge: "C",  label: "Captain",       desc: "Team captain" },
  ];
  const pointsKey = [
    { label: "Coming to Sabha",   pts: 20,  color: "#6c5ce7", desc: "Attend a Sabha" },
    { label: "Wear Jabho Lengho", pts: 5,   color: "#00b894", desc: "Come in traditional dress" },
    { label: "Presentation",      pts: 10,  color: "#e17055", desc: "Give a presentation at Sabha" },
    { label: "MC",                pts: 5,   color: "#0984e3", desc: "Host/MC the Sabha" },
    { label: "DPK",               pts: 5,   color: "#fd79a8", desc: "Perform DPK at Sabha" },
    { label: "Seva",              pts: 5,   color: "#55efc4", desc: "Volunteer seva" },
    { label: "Sabha Participation", pts: 2, color: "#a29bfe", desc: "Answer/ask a question, ashivard clip mention, etc." },
    { label: "Sabha Kahoot",      pts: null, color: "#f9ca24", desc: "1 point per correct answer" },
  ];
  return (
    <div style={{ marginTop: 28 }}>
      <div style={St.sTitle}>Badge Key</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 8, marginBottom: 24 }}>
        {badges.map(item => {
          const isC = item.badge === "C";
          const isFire = item.badge === "🔥#";
          const badgeStyle = { fontSize: isC ? 11 : 16, minWidth: 24, textAlign: "center", color: isC ? "#f0c040" : undefined, border: isC ? "1px solid #f0c04044" : "none", borderRadius: isC ? 4 : 0, padding: isC ? "1px 5px" : 0, letterSpacing: isC ? "0.06em" : undefined };
          return (
            <div key={item.label} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 13px", background: "#ffffff05", border: "1px solid #ffffff0a", borderRadius: 9 }}>
              <div style={badgeStyle}>
                {isFire ? "🔥2" : item.badge}
              </div>
              <div>
                <div style={{ fontSize: 12, color: "#d0d0e0" }}>{item.label}</div>
                <div style={{ fontSize: 10, color: "#555", marginTop: 1 }}>{item.desc}</div>
              </div>
            </div>
          );
        })}
      </div>

      <div style={St.sTitle}>How to Earn Points</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 8 }}>
        {pointsKey.map(item => (
          <div key={item.label} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", background: item.color + "10", border: `1px solid ${item.color}33`, borderRadius: 9 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: item.color, minWidth: 36, textAlign: "center", flexShrink: 0 }}>
              {item.pts !== null ? `+${item.pts}` : "var"}
            </div>
            <div>
              <div style={{ fontSize: 12, color: "#d0d0e0" }}>{item.label}</div>
              <div style={{ fontSize: 10, color: "#666", marginTop: 1 }}>{item.desc}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── SCOREBOARD PAGE ──────────────────────────────────────────────────────────

// ─── DUEL CARD ────────────────────────────────────────────────────────────────
function DuelCard({ duels, players, save }) {
  if (!duels || duels.length === 0) return null;
  const now = Date.now();
  return (
    <div>
      {duels.map(d => {
        const p1 = players.find(p => p.id === d.p1id);
        const p2 = players.find(p => p.id === d.p2id);
        if (!p1 || !p2) return null;
        const pts1 = p1.points - (d.startScores[d.p1id] || 0);
        const pts2 = p2.points - (d.startScores[d.p2id] || 0);
        const t1 = TEAM[p1.team].color;
        const t2 = TEAM[p2.team].color;
        const expired = d.endDate && now > d.endDate;
        const winner = expired ? (pts1 > pts2 ? p1 : pts2 > pts1 ? p2 : null) : null;
        const loser = winner ? (winner.id === p1.id ? p2 : p1) : null;
        const timeLeft = d.endDate ? Math.max(0, d.endDate - now) : null;
        const daysLeft = timeLeft !== null ? Math.floor(timeLeft / 86400000) : null;
        const hrsLeft = timeLeft !== null ? Math.floor((timeLeft % 86400000) / 3600000) : null;
        return (
          <div key={d.id} style={{ marginBottom: 16, padding: "14px 16px", background: "linear-gradient(135deg, #0a0a1a, #1a0a1a)", border: "1px solid " + (expired ? "#f0c04055" : "#a855f733"), borderRadius: 12, position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: "linear-gradient(to right, " + t1 + ", #a855f7, " + t2 + ")" }} />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <div style={{ fontSize: 10, color: "#a855f7", letterSpacing: "0.14em" }}>🥊 DUEL{d.label ? " — " + d.label : ""}</div>
              <div style={{ fontSize: 10, color: "#f0c040", fontWeight: 700 }}>🏆 {d.prize} pts on the line</div>
            </div>
            {expired && winner && (
              <div style={{ textAlign: "center", marginBottom: 10, padding: "6px 12px", background: "#f0c04022", border: "1px solid #f0c04055", borderRadius: 8, fontSize: 12, color: "#f0c040" }}>
                🏆 {winner.name} wins! {loser.name} owes {d.prize} pts
              </div>
            )}
            {expired && !winner && (
              <div style={{ textAlign: "center", marginBottom: 10, fontSize: 11, color: "#888" }}>Duel ended — it&apos;s a tie! No pts transferred.</div>
            )}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 16 }}>
              <div style={{ textAlign: "center", flex: 1 }}>
                <div style={{ fontSize: 12, color: t1, letterSpacing: "0.06em", marginBottom: 4 }}>{p1.name}</div>
                <div style={{ fontSize: 30, fontWeight: 700, color: winner === p1 ? "#f0c040" : "#fff" }}>{"+" + pts1}</div>
                {winner === p1 && <div style={{ fontSize: 9, color: "#f0c040" }}>WINNER</div>}
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 14, color: "#444", fontWeight: 700 }}>VS</div>
                {!expired && daysLeft !== null && (
                  <div style={{ fontSize: 9, color: "#555", marginTop: 4 }}>{daysLeft}d {hrsLeft}h left</div>
                )}
              </div>
              <div style={{ textAlign: "center", flex: 1 }}>
                <div style={{ fontSize: 12, color: t2, letterSpacing: "0.06em", marginBottom: 4 }}>{p2.name}</div>
                <div style={{ fontSize: 30, fontWeight: 700, color: winner === p2 ? "#f0c040" : "#fff" }}>{"+" + pts2}</div>
                {winner === p2 && <div style={{ fontSize: 9, color: "#f0c040" }}>WINNER</div>}
              </div>
            </div>
            {!expired && pts1 !== pts2 && (
              <div style={{ textAlign: "center", marginTop: 8, fontSize: 10, color: "#666" }}>
                {pts1 > pts2 ? p1.name : p2.name} leading by {Math.abs(pts1 - pts2)} pt{Math.abs(pts1 - pts2) !== 1 ? "s" : ""}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function ScoreboardPage({ data }) {
  const { players, activity, duels } = data;
  const sA = teamTotal(players, "A"), sB = teamTotal(players, "B");
  const animA = useAnimatedNumber(sA), animB = useAnimatedNumber(sB);
  const diff = Math.abs(sA - sB);
  const leading = sA > sB ? "A" : sB > sA ? "B" : null;

  const withTotals = team => {
    const teamPls = players.filter(p => p.team === team);
    const total = teamTotal(players, team);
    const avg = teamPls.length > 0 ? teamPls.reduce((s, p) => s + p.points, 0) / teamPls.length : 0;
    return byPoints(teamPls).map(p => ({ ...p, _teamTotal: total, _teamAvg: avg }));
  };

  return (
    <div style={St.page}>
      <Countdown />
      <div style={{ textAlign: "center", fontSize: 11, color: "#555", letterSpacing: "0.08em", marginBottom: 16, marginTop: 4, fontStyle: "italic" }}>"Do the Best, Leave the Rest" — Mahant Swami Maharaj</div>
      <style>{`@keyframes glowPulse{0%,100%{box-shadow:0 0 18px 4px var(--gc)}50%{box-shadow:0 0 38px 12px var(--gc)}}`}</style>
      {leading && (
        <div style={{ "--gc": TEAM[leading].color + "88", animation: "glowPulse 2s ease-in-out infinite", background: TEAM[leading].color + "18", border: `1px solid ${TEAM[leading].color}66`, borderRadius: 12, padding: "13px 20px", textAlign: "center", marginBottom: 14, fontSize: 15, fontWeight: 700, color: TEAM[leading].color, letterSpacing: "0.08em" }}>
          ⚡ {TEAM[leading].name} is Leading by {diff} pt{diff !== 1 ? "s" : ""}
        </div>
      )}
      <div style={St.scoreGrid}>
        <div style={St.teamCard("A")}>
          <div style={St.teamLabel("A")}>{TEAM.A.name}</div>
          <div style={St.teamScore}>{animA}</div>
          <div style={{ fontSize: 11, color: "#555", marginTop: 5 }}>TOTAL PTS</div>
        </div>
        <div style={St.vsBox}>VS</div>
        <div style={St.teamCard("B")}>
          <div style={St.teamLabel("B")}>{TEAM.B.name}</div>
          <div style={St.teamScore}>{animB}</div>
          <div style={{ fontSize: 11, color: "#555", marginTop: 5 }}>TOTAL PTS</div>
        </div>
      </div>



      <WinProbBar players={players} />

      <div style={St.sTitle}>All Participants</div>
      <div style={St.twoCol}>
        {["A", "B"].map(team => (
          <div key={team}>
            <div style={{ fontSize: 10, color: TEAM[team].color, marginBottom: 8, letterSpacing: "0.1em" }}>{TEAM[team].name}</div>
            {withTotals(team).map((p, i) => <PlayerRow key={p.id} p={p} rank={i} />)}
          </div>
        ))}
      </div>

      <div style={St.sTitle}>Recent Activity</div>
      <DuelCard duels={duels} players={players} />
      <ActivityFeed activity={activity} />
      <EmojiKey />
    </div>
  );
}

// ─── LEADERBOARD PAGE ─────────────────────────────────────────────────────────
function LeaderboardPage({ data }) {
  const { players, activity } = data;
  const allSorted = byPoints(players);
  const grand = players.reduce((s, p) => s + p.points, 0);
  const improved = mostImproved(players, activity);

  return (
    <div style={St.page}>
      {improved && (
        <div style={{ padding: "14px 18px", background: "#f0c04014", border: "1px solid #f0c04033", borderRadius: 12, marginBottom: 24, display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ fontSize: 22 }}>📈</div>
          <div>
            <div style={{ fontSize: 11, color: "#f0c040", letterSpacing: "0.1em" }}>MOST IMPROVED (LAST 7 DAYS)</div>
            <div style={{ fontSize: 15, color: "#fff", marginTop: 2 }}>{improved.player.name} <span style={{ color: "#2ecc71" }}>+{improved.gained} pts</span></div>
          </div>
        </div>
      )}

      <div style={St.sTitle}>Overall Rankings — All Participants</div>
      {allSorted.map((p, i) => {
        const pct = grand > 0 ? (p.points / grand * 100).toFixed(1) : "0.0";
        const milestone = getMilestone(p.points);
        const isTop = i === 0 || i === 1 || i === 2;
        const rankBg = i === 0 ? "#d4a017" : i === 1 ? "#888" : i === 2 ? "#a0522d" : "#1e1e2e";
        return (
          <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 14px", borderRadius: 10, background: isTop ? TEAM[p.team].bg : "#ffffff04", border: "1px solid " + (isTop ? TEAM[p.team].color + "44" : "#ffffff08"), marginBottom: 6 }}>
            <div style={{ width: 28, height: 28, borderRadius: "50%", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "#fff", background: rankBg }}>
              {i + 1}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", marginBottom: 4 }}>
                <div style={{ fontSize: 14, color: "#d0d0e0", flex: 1 }}>
                  {p.name}
                  {p.captain && <CaptainBadge />}
                  {milestone && <span style={{ fontSize: 12, marginLeft: 4 }}>{milestone.badge}</span>}
                  {p.streak > 0 && <span style={{ fontSize: 10, color: "#f39c12", marginLeft: 4 }}>🔥{p.streak}</span>}
                </div>
                <div style={{ fontSize: 10, color: TEAM[p.team].color, marginRight: 10, letterSpacing: "0.06em" }}>{TEAM[p.team].name}</div>
                <div style={{ fontSize: 10, color: "#555", marginRight: 10 }}>{pct}% of total</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: TEAM[p.team].color }}>{p.points}</div>
              </div>
              <div style={{ height: 2, background: "#ffffff08", borderRadius: 99 }}>
                <div style={{ height: "100%", width: `${grand > 0 ? p.points / grand * 100 : 0}%`, background: TEAM[p.team].color, borderRadius: 99, transition: "width 0.5s ease" }} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── CHARTS PAGE ──────────────────────────────────────────────────────────────
function ChartsPage({ data }) {
  const { players, history } = data;
  const barData = byPoints(players).map(p => ({
    name: p.name.split(" ")[0],
    pts: p.points,
    team: p.team,
  }));
  const lineData = (history || []).slice(-30).map((h, i) => ({
    i: i + 1,
    [TEAM.A.name]: h.scoreA,
    [TEAM.B.name]: h.scoreB,
  }));
  const tip = { contentStyle: { background: "#12121f", border: "1px solid #ffffff15", borderRadius: 8, color: "#fff", fontSize: 12 }, cursor: { fill: "#ffffff08" } };

  return (
    <div style={St.page}>
      <div style={St.sTitle}>Individual Points — All Participants</div>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={barData} margin={{ top: 8, right: 10, left: -18, bottom: 55 }}>
          <XAxis dataKey="name" tick={{ fill: "#555", fontSize: 10 }} angle={-45} textAnchor="end" interval={0} />
          <YAxis tick={{ fill: "#555", fontSize: 10 }} />
          <Tooltip {...tip} />
          <Bar dataKey="pts" radius={[4, 4, 0, 0]}>
            {barData.map((entry, i) => <Cell key={i} fill={TEAM[entry.team].color} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      <div style={St.sTitle}>Team Score Over Time</div>
      {lineData.length > 1 ? (
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={lineData} margin={{ top: 8, right: 10, left: -18, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff06" />
            <XAxis dataKey="i" tick={{ fill: "#444", fontSize: 10 }} label={{ value: "Updates", position: "insideBottom", offset: -2, fill: "#333", fontSize: 10 }} />
            <YAxis tick={{ fill: "#555", fontSize: 10 }} />
            <Tooltip {...tip} />
            <Line type="monotone" dataKey={TEAM.A.name} stroke={TEAM.A.color} strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey={TEAM.B.name} stroke={TEAM.B.color} strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      ) : (
        <div style={{ textAlign: "center", fontSize: 13, color: "#333", padding: "40px 0" }}>Score history will appear here as points are added by admin</div>
      )}

      <div style={{ display: "flex", gap: 16, justifyContent: "center", marginTop: 12 }}>
        {["A", "B"].map(t => (
          <div key={t} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 24, height: 3, background: TEAM[t].color, borderRadius: 99 }} />
            <div style={{ fontSize: 11, color: "#555" }}>{TEAM[t].name}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── ADMIN PANEL ──────────────────────────────────────────────────────────────
function AdminPanel({ data, save, undo, canUndo, saveStatus }) {
  const { players, activity, duels } = data;
  const [selPreset, setSelPreset] = useState(null);
  const [duelP1, setDuelP1] = useState("");
  const [duelP2, setDuelP2] = useState("");
  const [duelPrize, setDuelPrize] = useState("10");
  const [duelLabel, setDuelLabel] = useState("");
  const [duelEndDate, setDuelEndDate] = useState("");
  const [bulkSel, setBulkSel] = useState(new Set());
  const [customPts, setCustomPts] = useState({});
  const [kahootMode, setKahootMode] = useState(false);
  const [kahootPts, setKahootPts] = useState({});
  const [expanded, setExpanded] = useState(null);
  const [newName, setNewName] = useState("");
  const [newTeam, setNewTeam] = useState("A");

  const makeActivity = (p, delta, reason) => ({
    id: Date.now() + Math.random(),
    pid: p.id, name: p.name, team: p.team, delta, reason: reason || "Manual", ts: Date.now(),
  });

  const adjustPoints = (pid, delta, reason = "", isStreak = false) => {
    const p = players.find(x => x.id === pid);
    if (!p) return;
    let finalDelta = delta;
    let finalReason = reason;
    if (delta > 0) {
      const teamPlayers = players.filter(x => x.team === p.team);
      const teamAvg = teamPlayers.reduce((s, x) => s + x.points, 0) / teamPlayers.length;
      if (p.points < teamAvg) {
        finalDelta = Math.round(delta * 1.5);
        finalReason = reason + " (1.5x comeback)";
      }
    }
    const act = makeActivity(p, finalDelta, finalReason);
    save(prev => {
      const updPlayers = prev.players.map(x => x.id !== pid ? x : {
        ...x,
        points: Math.max(0, x.points + finalDelta),
        streak: isStreak && finalDelta > 0 ? (x.streak || 0) + 1 : (x.streak || 0),
      });
      const scoreA = teamTotal(updPlayers, "A"), scoreB = teamTotal(updPlayers, "B");
      return {
        ...prev,
        players: updPlayers,
        activity: [act, ...(prev.activity || [])].slice(0, 100),
        history: [...(prev.history || []), { ts: Date.now(), scoreA, scoreB }].slice(-100),
      };
    });
  };

  const applyBulk = () => {
    if (!selPreset || !bulkSel.size) return;
    bulkSel.forEach(pid => adjustPoints(pid, selPreset.pts, selPreset.label, selPreset.isStreak));
    setBulkSel(new Set()); setSelPreset(null);
  };

  const applyAllKahoot = () => {
    Object.entries(kahootPts).forEach(([pid, val]) => {
      const pts = parseInt(val, 10);
      if (!pts || isNaN(pts) || !(pts >= 0)) return;
      adjustPoints(Number(pid), pts, "Sabha Kahoot");
    });
    setKahootPts({});
    setKahootMode(false);
  };

  const handleCustom = (pid, positive) => {
    const val = parseInt(customPts[pid] || "0", 10);
    if (!val || isNaN(val)) return;
    adjustPoints(pid, positive ? val : -val);
    setCustomPts(c => ({ ...c, [pid]: "" }));
  };

  const addPlayer = (team) => {
    if (!newName.trim()) return;
    const p = { id: Date.now(), name: newName.trim(), team, points: 0, captain: false, streak: 0 };
    save(prev => ({ ...prev, players: [...prev.players, p] }));
    setNewName("");
  };

  const getHistory = pid => (activity || []).filter(a => a.pid === pid).slice(0, 8);

  return (
    <div style={St.page}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20, flexWrap: "wrap" }}>
        <div style={{ fontSize: 11, color: "#444", letterSpacing: "0.1em" }}>ADMIN — POINT MANAGER</div>
        <div style={{ fontSize: 10, color: saveStatus === "saved" ? "#2ecc71" : "#f39c12", display: "flex", alignItems: "center", gap: 5 }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: saveStatus === "saved" ? "#2ecc71" : "#f39c12" }} />
          {saveStatus === "saved" ? "ALL CHANGES SYNCED" : "SAVING..."}
        </div>
        {canUndo && (
          <button onClick={undo} style={{ ...St.pBtn("#e74c3c"), fontSize: 11, padding: "0 12px", height: 26 }}>↩ UNDO LAST ACTION</button>
        )}
      </div>

      {/* Presets + Bulk */}
      <div style={St.adminCard}>
        <div style={{ fontSize: 10, color: "#444", letterSpacing: "0.12em", marginBottom: 10 }}>PRESET ACTIONS</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
          {PRESETS.map(pr => {
            const isSel = !!(selPreset && selPreset.id === pr.id);
            const handlePreset = () => { setSelPreset(isSel ? null : pr); setKahootMode(false); };
            const btnStyle = St.presetBtn(pr.color, isSel);
            const ptLabel = "+" + pr.pts;
            return (
              <button key={pr.id} style={btnStyle} onClick={handlePreset}>
                <span>{pr.label}</span>
                <span style={{ background: "#ffffff18", borderRadius: 4, padding: "2px 7px", fontSize: 11 }}>{ptLabel}</span>
              </button>
            );
          })}
          <button style={St.presetBtn("#f9ca24", kahootMode)} onClick={() => { setKahootMode(!kahootMode); setSelPreset(null); setKahootPts({}); }}>
            <span>Sabha Kahoot</span>
            <span style={{ background: "#ffffff18", borderRadius: 4, padding: "2px 7px", fontSize: 11 }}>variable</span>
          </button>
        </div>
        {selPreset && bulkSel.size > 0 && (
          <button onClick={applyBulk} style={{ ...St.pBtn(selPreset.color), height: 32, padding: "0 16px", fontSize: 12, marginBottom: 10 }}>
            Apply "{selPreset.label}" to {bulkSel.size} selected player{bulkSel.size > 1 ? "s" : ""}
          </button>
        )}
        {selPreset && <div style={{ fontSize: 11, color: "#555", marginBottom: 6 }}>Check players below to apply preset in bulk, or click Apply on individual player</div>}
        {kahootMode && (
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <div style={{ fontSize: 11, color: "#f9ca24" }}>Enter each player's Kahoot score below, then click Apply All</div>
            <button onClick={applyAllKahoot} style={{ ...St.pBtn("#f9ca24"), height: 30, padding: "0 16px", color: "#000", fontWeight: 700 }}>Apply All Kahoot Scores</button>
          </div>
        )}
      </div>

      {/* Player grids */}
      <div style={St.twoCol}>
        {["A", "B"].map(team => (
          <div key={team} style={{ ...St.adminCard, marginTop: 12 }}>
            <div style={{ fontSize: 11, color: TEAM[team].color, marginBottom: 14, letterSpacing: "0.1em" }}>
              {TEAM[team].name} — {teamTotal(players, team)} pts
            </div>
            {players.filter(p => p.team === team).sort((a, b) => b.points - a.points).map(p => (
              <div key={p.id} style={{ background: "#ffffff05", border: "1px solid #ffffff08", borderRadius: 8, padding: "10px 11px", marginBottom: 7 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 7 }}>
                  {selPreset && (
                    <input type="checkbox" checked={bulkSel.has(p.id)} onChange={e => {
                      const s = new Set(bulkSel);
                      e.target.checked ? s.add(p.id) : s.delete(p.id);
                      setBulkSel(s);
                    }} style={{ cursor: "pointer" }} />
                  )}
                  <div style={{ flex: 1, fontSize: 12, color: "#ccc" }}>
                    {p.name}
                    {p.captain && <CaptainBadge />}
                    <MilestoneBadge points={p.points} />
                    <StreakBadge streak={p.streak} />
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: TEAM[team].color }}>{p.points}</div>
                  <button onClick={() => setExpanded(expanded === p.id ? null : p.id)} style={{ ...St.pBtn("#ffffff14"), fontSize: 10, padding: "0 8px" }}>
                    {expanded === p.id ? "▲" : "▼"}
                  </button>
                </div>
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                  <input type="number" min="1" placeholder="pts" value={customPts[p.id] || ""} onChange={e => setCustomPts(c => ({ ...c, [p.id]: e.target.value }))} style={{ ...St.sInput, width: 50 }} />
                  <button style={St.pBtn("#27ae60")} onClick={() => handleCustom(p.id, true)}>+</button>
                  <button style={St.pBtn("#c0392b")} onClick={() => handleCustom(p.id, false)}>−</button>
                  <button style={St.pBtn()} onClick={() => adjustPoints(p.id, 1)}>+1</button>
                  <button style={St.pBtn()} onClick={() => adjustPoints(p.id, 5)}>+5</button>
                  <button style={St.pBtn()} onClick={() => adjustPoints(p.id, 10)}>+10</button>
                  {selPreset && <button style={St.pBtn(selPreset.color)} onClick={() => adjustPoints(p.id, selPreset.pts, selPreset.label, selPreset.isStreak)}>Apply +{selPreset.pts}</button>}
                  {kahootMode && (
                    <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 2 }}>
                      <span style={{ fontSize: 11, color: "#f9ca24" }}>Kahoot:</span>
                      <input
                        type="number" min="0" placeholder="score"
                        value={kahootPts[p.id] || ""}
                        onChange={e => setKahootPts(k => ({ ...k, [p.id]: e.target.value }))}
                        style={{ ...St.sInput, width: 64, border: "1px solid #f9ca2455" }}
                      />
                      <button
                        style={St.pBtn("#f9ca24")}
                        onClick={() => {
                          const pts = parseInt(kahootPts[p.id] || "0", 10);
                          if (!pts || isNaN(pts)) return;
                          adjustPoints(p.id, pts, "Sabha Kahoot");
                          setKahootPts(k => ({ ...k, [p.id]: "" }));
                        }}
                      >+ Apply</button>
                    </div>
                  )}
                  <button style={St.pBtn("#555")} onClick={() => adjustPoints(p.id, 0, "Streak reset") || save(prev => ({ ...prev, players: prev.players.map(x => x.id === p.id ? { ...x, streak: 0 } : x) }))}>Reset Streak</button>
                </div>
                {expanded === p.id && (
                  <div style={{ marginTop: 10, padding: "8px", background: "#ffffff04", borderRadius: 6 }}>
                    <div style={{ fontSize: 9, color: "#444", letterSpacing: "0.1em", marginBottom: 6 }}>POINT HISTORY</div>
                    {getHistory(p.id).length === 0
                      ? <div style={{ fontSize: 11, color: "#333" }}>No history yet</div>
                      : getHistory(p.id).map((a, i) => (
                        <div key={i} style={St.logEntry}>
                          {new Date(a.ts).toLocaleString()} — {a.delta > 0 ? "+" : ""}{a.delta} ({a.reason})
                        </div>
                      ))
                    }
                  </div>
                )}
              </div>
            ))}
            <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
              <input value={newTeam === team ? newName : ""} onChange={e => { setNewTeam(team); setNewName(e.target.value); }} onFocus={() => setNewTeam(team)} placeholder="Add new participant…" style={{ ...St.sInput, flex: 1 }} />
              <button style={{ ...St.pBtn(TEAM[team].color), height: 32, padding: "0 12px" }} onClick={() => { setNewTeam(team); addPlayer(team); }}>+ Add</button>
            </div>
          </div>
        ))}
      </div>

      {/* Duels */}
      <div style={St.adminCard}>
        <div style={{ fontSize: 10, color: "#a855f7", letterSpacing: "0.12em", marginBottom: 12 }}>🥊 DUELS</div>
        <div>
          {((data.duels || []).map(d => {
            const dp1 = players.find(p => p.id === d.p1id);
            const dp2 = players.find(p => p.id === d.p2id);
            const expired = d.endDate && Date.now() > d.endDate;
            const pts1 = dp1 ? dp1.points - (d.startScores[d.p1id] || 0) : 0;
            const pts2 = dp2 ? dp2.points - (d.startScores[d.p2id] || 0) : 0;
            const winner = expired ? (pts1 > pts2 ? dp1 : pts2 > pts1 ? dp2 : null) : null;
            const loser = winner ? (winner.id === dp1.id ? dp2 : dp1) : null;
            return (
              <div key={d.id} style={{ padding: "8px 10px", background: "#ffffff05", borderRadius: 8, marginBottom: 6 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                  <div style={{ fontSize: 11, color: "#ccc" }}>{dp1 ? dp1.name : "?"} vs {dp2 ? dp2.name : "?"} — 🏆{d.prize}pts</div>
                  <div style={{ display: "flex", gap: 6 }}>
                    {expired && winner && (
                      <button style={{ ...St.pBtn("#f0c040"), fontSize: 10, padding: "2px 8px" }} onClick={() => {
                        save(prev => ({
                          ...prev,
                          players: prev.players.map(x => {
                            if (x.id === winner.id) return { ...x, points: x.points + d.prize };
                            if (x.id === loser.id) return { ...x, points: Math.max(0, x.points - d.prize) };
                            return x;
                          }),
                          duels: (prev.duels || []).filter(x => x.id !== d.id),
                          activity: [{ id: Date.now(), pid: winner.id, name: winner.name, team: winner.team, delta: d.prize, reason: "Duel win vs " + loser.name, ts: Date.now() }, { id: Date.now() + 1, pid: loser.id, name: loser.name, team: loser.team, delta: -d.prize, reason: "Duel loss vs " + winner.name, ts: Date.now() }, ...(prev.activity || [])].slice(0, 100),
                        }));
                      }}>⚡ Settle ({winner.name} wins)</button>
                    )}
                    {expired && !winner && (
                      <button style={{ ...St.pBtn("#555"), fontSize: 10, padding: "2px 8px" }} onClick={() => save(prev => ({ ...prev, duels: (prev.duels || []).filter(x => x.id !== d.id) }))}>Dismiss (tie)</button>
                    )}
                    {!expired && (
                      <button style={{ ...St.pBtn("#c0392b"), fontSize: 10, padding: "2px 8px" }} onClick={() => save(prev => ({ ...prev, duels: (prev.duels || []).filter(x => x.id !== d.id) }))}>Cancel</button>
                    )}
                  </div>
                </div>
                {d.label && <div style={{ fontSize: 10, color: "#555" }}>{d.label}{expired ? " — ENDED" : ""}</div>}
              </div>
            );
          }))}
          <div style={{ display: "flex", gap: 8, marginBottom: 8, flexWrap: "wrap", marginTop: 8 }}>
            <select value={duelP1} onChange={e => setDuelP1(e.target.value)} style={{ ...St.sInput, flex: 1 }}>
              <option value="">Player 1…</option>
              {players.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <select value={duelP2} onChange={e => setDuelP2(e.target.value)} style={{ ...St.sInput, flex: 1 }}>
              <option value="">Player 2…</option>
              {players.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div style={{ display: "flex", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
            <input value={duelLabel} onChange={e => setDuelLabel(e.target.value)} placeholder="Label (e.g. Sabha 5 Duel)" style={{ ...St.sInput, flex: 1 }} />
            <input value={duelPrize} onChange={e => setDuelPrize(e.target.value)} placeholder="Prize pts" type="number" style={{ ...St.sInput, width: 90, flexShrink: 0 }} />
          </div>
          <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
            <input value={duelEndDate} onChange={e => setDuelEndDate(e.target.value)} type="date" style={{ ...St.sInput, flex: 1 }} />
          </div>
          <button style={{ ...St.pBtn("#a855f7"), fontSize: 11 }} onClick={() => {
            if (!duelP1 || !duelP2 || duelP1 === duelP2) return;
            const p1 = players.find(p => p.id === Number(duelP1));
            const p2 = players.find(p => p.id === Number(duelP2));
            if (!p1 || !p2) return;
            const prize = parseInt(duelPrize) || 10;
            const endDate = duelEndDate ? new Date(duelEndDate).getTime() : null;
            const startScores = {};
            startScores[p1.id] = p1.points;
            startScores[p2.id] = p2.points;
            save(prev => ({ ...prev, duels: [...(prev.duels || []), { id: Date.now(), p1id: p1.id, p2id: p2.id, label: duelLabel || "Duel", prize, endDate, startScores }] }));
            setDuelP1(""); setDuelP2(""); setDuelLabel(""); setDuelPrize("10"); setDuelEndDate("");
          }}>🥊 Start Duel</button>
        </div>
      </div>

      {/* Full Activity Log */}
      {(activity && activity.length > 0) && (
        <div style={{ ...St.adminCard, marginTop: 20 }}>
          <div style={{ fontSize: 10, color: "#444", letterSpacing: "0.12em", marginBottom: 10 }}>FULL ACTIVITY LOG</div>
          <div style={{ maxHeight: 200, overflowY: "auto" }}>
            {activity.map((a, i) => (
              <div key={i} style={St.logEntry}>
                {new Date(a.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} — {a.name}: {a.delta > 0 ? "+" : ""}{a.delta} pts ({a.reason})
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── ADMIN LOGIN ──────────────────────────────────────────────────────────────
function AdminLogin({ onAuth }) {
  const [pw, setPw] = useState(""), [err, setErr] = useState("");
  const attempt = () => pw === ADMIN_PASSWORD ? onAuth() : setErr("Incorrect password.");
  return (
    <div style={St.loginWrap}>
      <div style={{ fontSize: 26, marginBottom: 4, color: "#fff" }}>ADMIN ACCESS</div>
      <div style={{ fontSize: 12, color: "#444", marginBottom: 22 }}>Enter password to continue</div>
      {err && <div style={St.errText}>{err}</div>}
      <input type="password" placeholder="Password" value={pw} onChange={e => setPw(e.target.value)} onKeyDown={e => e.key === "Enter" && attempt()} style={St.loginInput} />
      <button style={St.loginBtn} onClick={attempt}>UNLOCK</button>
    </div>
  );
}

// ─── APP ROOT ─────────────────────────────────────────────────────────────────
// ─── RULES PAGE ───────────────────────────────────────────────────────────────
function RulesPage() {
  const sections = [
    {
      title: "🏆 Tournament Overview",
      color: "#f0c040",
      items: [
        "The Adarsh Tournament runs until June 30, 2026.",
        "16 kishores are divided into two teams: Team Satsang and Team Sadhana.",
        "The team with the most points at the end of the tournament wins.",
        "Tournament motto: \"Do the Best, Leave the Rest\" — Mahant Swami Maharaj",
      ]
    },
    {
      title: "📋 How to Earn Points",
      color: "#2ecc71",
      items: [
        "+20 pts — Coming to Sabha (counts toward attendance streak)",
        "+10 pts — Giving a Presentation at Sabha",
        "+5 pts — Wearing Jabho Lengho to Sabha",
        "+5 pts — MCing the Sabha",
        "+5 pts — Performing DPK at Sabha",
        "+5 pts — Seva (volunteer service)",
        "+2 pts — Sabha Participation (answering/asking a question, ashivard clip mention, etc.)",
        "Variable — Sabha Kahoot (1 point per correct answer)",
      ]
    },
    {
      title: "⬆️ Comeback Multiplier",
      color: "#27ae60",
      items: [
        "Any player earning points while below their team average automatically receives a 1.5x multiplier.",
        "This applies to all positive point awards — Sabha, Kahoot, Seva, etc.",
        "The multiplier is shown as '(1.5x comeback)' in the activity log.",
        "Players at or above their team average earn points at normal rate.",
        "This rule exists to prevent one player from carrying the whole team.",
      ]
    },
    {
      title: "🏅 Milestone Badges",
      color: "#9b59b6",
      items: [
        "✦ Rising Star — 50+ points",
        "💥 On Fire — 100+ points",
        "⭐ Star — 200+ points",
        "👑 Champion — 300+ points",
        "🔥 Sabha Streak — shown as 🔥N next to your name for consecutive Sabha attendance",
        "C badge — awarded to team captains only",
      ]
    },

    {
      title: "📏 General Rules",
      color: "#3498db",
      items: [
        "Only the admin can award or deduct points.",
        "Points are synced live across all devices.",
        "The admin password is required to make any changes.",
        "Point history is logged for every player and visible in the admin panel.",
        "If you believe a point award was made in error, contact the admin.",
      ]
    },
  ];

  return (
    <div style={St.page}>
      <div style={{ textAlign: "center", marginBottom: 28 }}>
        <div style={{ fontSize: 28, fontFamily: "'Bebas Neue', sans-serif", letterSpacing: "0.12em", color: "#fff", marginBottom: 6 }}>TOURNAMENT RULES</div>
        <div style={{ fontSize: 11, color: "#555", fontStyle: "italic" }}>"Do the Best, Leave the Rest" — Mahant Swami Maharaj</div>
      </div>
      {sections.map(sec => (
        <div key={sec.title} style={{ marginBottom: 20, background: sec.color + "08", border: "1px solid " + sec.color + "33", borderRadius: 14, padding: "16px 18px", borderLeft: "3px solid " + sec.color }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: sec.color, letterSpacing: "0.06em", marginBottom: 12 }}>{sec.title}</div>
          {sec.items.map((item, i) => (
            <div key={i} style={{ display: "flex", gap: 10, marginBottom: 8, alignItems: "flex-start" }}>
              <div style={{ width: 4, height: 4, borderRadius: "50%", background: sec.color, marginTop: 6, flexShrink: 0 }} />
              <div style={{ fontSize: 12, color: "#b0b0c0", lineHeight: 1.6 }}>{item}</div>
            </div>
          ))}
        </div>
      ))}
      <div style={{ textAlign: "center", marginTop: 10, padding: "14px", background: "#ffffff05", borderRadius: 12, fontSize: 11, color: "#444", letterSpacing: "0.08em" }}>
        Questions? Talk to the admin. Jai Swaminarayan 🙏
      </div>
    </div>
  );
}

// ─── PROJECTOR MODE ───────────────────────────────────────────────────────────
function useRevealNumber(target, revealed, dur = 3500) {
  const [val, setVal] = useState(0);
  const rafRef = useRef(null);
  useEffect(() => {
    if (!revealed) { setVal(0); return; }
    const t0 = performance.now();
    const step = now => {
      const p = Math.min((now - t0) / dur, 1);
      const eased = p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
      setVal(Math.round(eased * target));
      if (!(p >= 1)) rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, revealed]);
  return val;
}

function ProjectorMode({ data, onExit }) {
  const { players, activity } = data;
  const sA = teamTotal(players, "A"), sB = teamTotal(players, "B");
  const [revealed, setRevealed] = useState(false);
  const [revealStep, setRevealStep] = useState(0); // 0=hidden, 1=revealing, 2=done
  const animA = useRevealNumber(sA, revealed, 3500);
  const animB = useRevealNumber(sB, revealed, 3500);
  const { d, h, m, s } = useCountdown(TOURNAMENT_END);
  const leading = sA > sB ? "A" : sB > sA ? "B" : null;
  const diff = Math.abs(sA - sB);
  const topA = [...players.filter(p => p.team === "A")].sort((a, b) => b.points - a.points).slice(0, 4);
  const topB = [...players.filter(p => p.team === "B")].sort((a, b) => b.points - a.points).slice(0, 4);
  const recent = (activity || []).slice(0, 5);

  const handleReveal = () => {
    setRevealStep(1);
    setRevealed(true);
    setTimeout(() => setRevealStep(2), 3600);
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "#05050f", zIndex: 9999, display: "flex", flexDirection: "column", padding: "32px 48px", fontFamily: "'Bebas Neue', sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&display=swap" rel="stylesheet" />
      <style>{`@keyframes pulse2{0%,100%{opacity:1}50%{opacity:0.3}}`}</style>

      {/* Exit button */}
      <button onClick={onExit} style={{ position: "absolute", top: 16, right: 20, background: "#ffffff10", border: "1px solid #ffffff20", color: "#555", borderRadius: 8, padding: "6px 14px", fontSize: 12, cursor: "pointer", fontFamily: "inherit", letterSpacing: "0.1em" }}>✕ EXIT</button>

      {/* Title */}
      <div style={{ textAlign: "center", marginBottom: 28 }}>
        <div style={{ fontSize: 18, color: "#555", letterSpacing: "0.2em", marginBottom: 4 }}>ADARSH TOURNAMENT</div>
        <div style={{ fontSize: 11, color: "#333", letterSpacing: "0.1em", fontStyle: "italic", fontFamily: "sans-serif" }}>"Do the Best, Leave the Rest" — Mahant Swami Maharaj</div>
      </div>

      {/* Main scores */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 40, marginBottom: 24 }}>
        <div style={{ textAlign: "center", flex: 1 }}>
          <div style={{ fontSize: 22, color: TEAM.A.color, letterSpacing: "0.16em", marginBottom: 8 }}>{TEAM.A.name}</div>
          <div style={{ fontSize: 120, color: revealStep === 0 ? "#1a1a2e" : "#fff", lineHeight: 1, textShadow: revealStep > 0 ? "0 0 60px " + TEAM.A.color + "88" : "none", transition: "color 0.3s, text-shadow 0.3s", letterSpacing: revealStep === 1 ? "0.04em" : "0" }}>
            {revealStep === 0 ? "???" : animA}
          </div>
          <div style={{ fontSize: 12, color: "#333", letterSpacing: "0.12em", marginTop: 6, fontFamily: "sans-serif" }}>POINTS</div>
        </div>
        <div style={{ textAlign: "center", padding: "0 20px" }}>
          <div style={{ fontSize: 40, color: "#222" }}>VS</div>
          {revealStep === 0 && (
            <button onClick={handleReveal} style={{ marginTop: 16, background: "linear-gradient(135deg, #c0392b, #d4a017)", border: "none", color: "#fff", borderRadius: 10, padding: "12px 24px", fontSize: 14, cursor: "pointer", fontFamily: "'Bebas Neue', sans-serif", letterSpacing: "0.12em", boxShadow: "0 0 30px #d4a01766" }}>
              🎬 REVEAL SCORES
            </button>
          )}
          {revealStep === 1 && (
            <div style={{ marginTop: 16, fontSize: 13, color: "#f0c040", letterSpacing: "0.1em", fontFamily: "sans-serif", animation: "pulse2 0.5s infinite" }}>COUNTING...</div>
          )}
          {revealStep === 2 && leading && (
            <div style={{ marginTop: 12, fontSize: 13, color: TEAM[leading].color, letterSpacing: "0.08em", fontFamily: "sans-serif" }}>
              ⚡ {TEAM[leading].name} +{diff}
            </div>
          )}
          {revealStep === 2 && !leading && (
            <div style={{ marginTop: 12, fontSize: 13, color: "#888", letterSpacing: "0.08em", fontFamily: "sans-serif" }}>TIED!</div>
          )}
        </div>
        <div style={{ textAlign: "center", flex: 1 }}>
          <div style={{ fontSize: 22, color: TEAM.B.color, letterSpacing: "0.16em", marginBottom: 8 }}>{TEAM.B.name}</div>
          <div style={{ fontSize: 120, color: revealStep === 0 ? "#1a1a2e" : "#fff", lineHeight: 1, textShadow: revealStep > 0 ? "0 0 60px " + TEAM.B.color + "88" : "none", transition: "color 0.3s, text-shadow 0.3s" }}>
            {revealStep === 0 ? "???" : animB}
          </div>
          <div style={{ fontSize: 12, color: "#333", letterSpacing: "0.12em", marginTop: 6, fontFamily: "sans-serif" }}>POINTS</div>
        </div>
      </div>

      {/* Player lists + recent activity */}
      <div style={{ display: "flex", gap: 24, flex: 1 }}>
        {/* Team A top players */}
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, color: TEAM.A.color, letterSpacing: "0.14em", marginBottom: 10 }}>TOP PLAYERS</div>
          {topA.map((p, i) => (
            <div key={p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", marginBottom: 6, background: i === 0 ? TEAM.A.color + "18" : "#ffffff05", borderRadius: 8, border: "1px solid " + (i === 0 ? TEAM.A.color + "44" : "#ffffff08") }}>
              <div style={{ fontSize: 14, color: "#ccc", letterSpacing: "0.06em" }}>{i + 1}. {p.name}</div>
              <div style={{ fontSize: 18, color: i === 0 ? TEAM.A.color : "#fff" }}>{p.points}</div>
            </div>
          ))}
        </div>

        {/* Recent activity */}
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, color: "#444", letterSpacing: "0.14em", marginBottom: 10 }}>RECENT ACTIVITY</div>
          {recent.length === 0 && <div style={{ fontSize: 12, color: "#333", fontFamily: "sans-serif" }}>No activity yet</div>}
          {recent.map((a, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "8px 12px", marginBottom: 6, background: "#ffffff04", borderRadius: 8, borderLeft: "3px solid " + (TEAM[a.team] ? TEAM[a.team].color : "#555") }}>
              <div style={{ fontSize: 13, color: "#888", letterSpacing: "0.04em" }}>{a.name}</div>
              <div style={{ fontSize: 14, color: a.delta > 0 ? "#2ecc71" : "#e74c3c" }}>{a.delta > 0 ? "+" : ""}{a.delta}</div>
            </div>
          ))}
        </div>

        {/* Team B top players */}
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, color: TEAM.B.color, letterSpacing: "0.14em", marginBottom: 10 }}>TOP PLAYERS</div>
          {topB.map((p, i) => (
            <div key={p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", marginBottom: 6, background: i === 0 ? TEAM.B.color + "18" : "#ffffff05", borderRadius: 8, border: "1px solid " + (i === 0 ? TEAM.B.color + "44" : "#ffffff08") }}>
              <div style={{ fontSize: 14, color: "#ccc", letterSpacing: "0.06em" }}>{i + 1}. {p.name}</div>
              <div style={{ fontSize: 18, color: i === 0 ? TEAM.B.color : "#fff" }}>{p.points}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Countdown footer */}
      <div style={{ textAlign: "center", marginTop: 20, fontSize: 13, color: "#2a2a3a", letterSpacing: "0.14em" }}>
        {d}D {h}H {m}M {s}S REMAINING
      </div>
    </div>
  );
}

const TABS = [
  { id: "scoreboard", label: "Scoreboard" },
  { id: "leaderboard", label: "Leaderboard" },
  { id: "charts", label: "Charts" },
  { id: "rules", label: "Rules" },
  { id: "admin", label: "Admin" },
];

function App() {
  const [tab, setTab] = useState("scoreboard");
  const [authed, setAuthed] = useState(false);
  const [splash, setSplash] = useState(true);
  const [projector, setProjector] = useState(false);
  const [splashFade, setSplashFade] = useState(false);
  const { data, save, undo, canUndo, saveStatus, loading } = useSharedData();

  useEffect(() => {
    const fadeTimer = setTimeout(() => setSplashFade(true), 2200);
    const hideTimer = setTimeout(() => setSplash(false), 2900);
    return () => { clearTimeout(fadeTimer); clearTimeout(hideTimer); };
  }, []);

  if (splash) return (
    <div style={{ position: "fixed", inset: 0, background: "#09090f", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 18, opacity: splashFade ? 0 : 1, transition: "opacity 0.7s ease", zIndex: 9999 }}>
      <div style={{ fontSize: 42, fontFamily: "'Bebas Neue', sans-serif", letterSpacing: "0.12em", color: "#ffffff", textAlign: "center" }}>ADARSH TOURNAMENT</div>
      <div style={{ width: 60, height: 2, background: "linear-gradient(to right, #c0392b, #d4a017)", borderRadius: 99 }} />
      <div style={{ fontSize: 13, color: "#888", letterSpacing: "0.08em", fontStyle: "italic", textAlign: "center", maxWidth: 300 }}>"Do the Best, Leave the Rest"</div>
      <div style={{ fontSize: 11, color: "#555", letterSpacing: "0.1em" }}>— Mahant Swami Maharaj</div>
    </div>
  );


  if (projector && data) return <ProjectorMode data={data} onExit={() => setProjector(false)} />;

  if (loading) return (
    <div style={{ ...St.root, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 20, color: "#fff", letterSpacing: "0.1em", marginBottom: 6 }}>LOADING</div>
        <div style={{ fontSize: 11, color: "#444" }}>Syncing tournament data...</div>
      </div>
    </div>
  );

  return (
    <div style={St.root}>
      <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&display=swap" rel="stylesheet" />
      <nav style={St.nav}>
        <div style={St.logo}>⚡ Adarsh Tournament</div>
        <button onClick={() => setProjector(true)} style={{ background: "#ffffff08", border: "1px solid #ffffff15", color: "#555", borderRadius: 7, padding: "5px 12px", fontSize: 10, cursor: "pointer", fontFamily: "inherit", letterSpacing: "0.1em", marginRight: 8 }}>📺 PROJECTOR</button>
        <div style={St.tabs}>
          {TABS.map(t => (
            <button key={t.id} style={St.tab(tab === t.id)} onClick={() => setTab(t.id)}>{t.label}</button>
          ))}
        </div>
      </nav>
      {tab === "scoreboard"  && <ScoreboardPage  data={data} />}
      {tab === "leaderboard" && <LeaderboardPage data={data} />}
      {tab === "charts"      && <ChartsPage      data={data} />}
      {tab === "rules"       && <RulesPage />}
      {tab === "admin"       && (authed
        ? <AdminPanel data={data} save={save} undo={undo} canUndo={canUndo} saveStatus={saveStatus} />
        : <AdminLogin onAuth={() => setAuthed(true)} />
      )}
    </div>
  );
}

export default App;
