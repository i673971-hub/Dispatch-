import React, { useState, useEffect, useRef } from "react";
import { Package, UtensilsCrossed, ShoppingBasket, Boxes, MapPin, Clock, ChevronRight, Plus, Check, Truck, User, Loader2, RefreshCw } from "lucide-react";

const CATS = [
  { id: "food", label: "Food", icon: UtensilsCrossed },
  { id: "package", label: "Package", icon: Package },
  { id: "grocery", label: "Grocery", icon: ShoppingBasket },
  { id: "everything", label: "Everything else", icon: Boxes },
];

const STAGES = ["Placed", "Picked up", "In transit", "Delivered"];
const ORDERS_KEY = "dispatch:orders";
const SEED_KEY = "dispatch:seeded";

function code(n) {
  return "DX-" + String(n).padStart(4, "0");
}
function timeNow() {
  return new Date().toTimeString().slice(0, 5);
}

const SEED_ORDERS = [
  {
    id: 1001,
    category: "package",
    item: "Signed contract envelope",
    from: "412 Alder St",
    to: "9 Harbor Way",
    stage: 3,
    eta: 0,
    log: [
      { s: "Placed", t: "08:12" },
      { s: "Picked up", t: "08:24" },
      { s: "In transit", t: "08:31" },
      { s: "Delivered", t: "08:47" },
    ],
  },
  {
    id: 1002,
    category: "food",
    item: "Two banh mi, one lemongrass tea",
    from: "Nine Bowls Kitchen",
    to: "220 Cedar Ave, Apt 4",
    stage: 1,
    eta: 18,
    log: [
      { s: "Placed", t: "12:02" },
      { s: "Picked up", t: "12:14" },
    ],
  },
];

export default function Dispatch() {
  const [role, setRole] = useState("customer"); // customer | driver
  const [view, setView] = useState("home"); // home | new | track
  const [category, setCategory] = useState("food");
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [storageError, setStorageError] = useState(false);
  const [activeId, setActiveId] = useState(null);
  const [form, setForm] = useState({ from: "", to: "", item: "", note: "" });
  const nextIdRef = useRef(2000);

  const active = orders.find((o) => o.id === activeId);

  // load from persistent storage on mount, seeding demo data once
  useEffect(() => {
    (async () => {
      try {
        let result;
        try {
          result = await window.storage.get(ORDERS_KEY, true);
        } catch {
          result = null;
        }
        if (result && result.value) {
          const parsed = JSON.parse(result.value);
          setOrders(parsed);
          nextIdRef.current = Math.max(2000, ...parsed.map((o) => o.id + 1));
        } else {
          setOrders(SEED_ORDERS);
          nextIdRef.current = 1003;
          await window.storage.set(ORDERS_KEY, JSON.stringify(SEED_ORDERS), true);
        }
      } catch (err) {
        console.error("Storage error, falling back to in-memory demo data:", err);
        setOrders(SEED_ORDERS);
        nextIdRef.current = 1003;
        setStorageError(true);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function persist(nextOrders) {
    setOrders(nextOrders);
    if (storageError) return;
    setSyncing(true);
    try {
      const result = await window.storage.set(ORDERS_KEY, JSON.stringify(nextOrders), true);
      if (!result) setStorageError(true);
    } catch (err) {
      console.error("Storage save failed:", err);
      setStorageError(true);
    } finally {
      setSyncing(false);
    }
  }

  async function refresh() {
    setSyncing(true);
    try {
      const result = await window.storage.get(ORDERS_KEY, true);
      if (result && result.value) setOrders(JSON.parse(result.value));
    } catch (err) {
      console.error("Refresh failed:", err);
    } finally {
      setSyncing(false);
    }
  }

  function submitOrder(e) {
    e.preventDefault();
    if (!form.from || !form.to || !form.item) return;
    const id = nextIdRef.current++;
    const newOrder = {
      id,
      category,
      item: form.item,
      from: form.from,
      to: form.to,
      note: form.note,
      stage: 0,
      eta: 24,
      log: [{ s: "Placed", t: timeNow() }],
    };
    persist([newOrder, ...orders]);
    setForm({ from: "", to: "", item: "", note: "" });
    setActiveId(id);
    setView("track");
  }

  function advanceStage(id) {
    const next = orders.map((o) => {
      if (o.id !== id || o.stage >= 3) return o;
      const stage = o.stage + 1;
      return {
        ...o,
        stage,
        eta: stage >= 3 ? 0 : Math.max(2, o.eta - 8),
        log: [...o.log, { s: STAGES[stage], t: timeNow() }],
      };
    });
    persist(next);
  }

  return (
    <div
      style={{
        fontFamily: "'Inter', system-ui, sans-serif",
        background: "#FAFAF7",
        color: "#16181D",
        minHeight: "100%",
        width: "100%",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700&family=Inter:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap');
        .mono { font-family: 'IBM Plex Mono', monospace; }
        .disp { font-family: 'Barlow Condensed', sans-serif; }
        * { box-sizing: border-box; }
        button { font-family: inherit; cursor: pointer; }
        input, textarea { font-family: inherit; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .spin { animation: spin 1s linear infinite; }
      `}</style>

      <div style={{ maxWidth: 480, margin: "0 auto", padding: "20px 18px 40px" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
          <div className="disp" style={{ fontSize: 30, fontWeight: 700, letterSpacing: "-0.01em", lineHeight: 1 }}>
            Dispatch
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {syncing ? (
              <Loader2 size={13} className="spin" color="#8A867E" />
            ) : (
              <button onClick={refresh} style={{ background: "none", border: "none", padding: 0, display: "flex" }} title="Refresh">
                <RefreshCw size={13} color="#8A867E" />
              </button>
            )}
            <div className="mono" style={{ fontSize: 11, color: "#8A867E" }}>{timeNow()}</div>
          </div>
        </div>

        {/* role switch */}
        <div style={{ display: "flex", border: "1px solid #DDD9D2", borderRadius: 4, marginBottom: 20, overflow: "hidden" }}>
          {[
            { id: "customer", label: "Customer", icon: User },
            { id: "driver", label: "Driver", icon: Truck },
          ].map((r) => {
            const Icon = r.icon;
            const isActive = role === r.id;
            return (
              <button
                key={r.id}
                onClick={() => {
                  setRole(r.id);
                  setView("home");
                }}
                style={{
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  padding: "9px 0",
                  border: "none",
                  background: isActive ? "#16181D" : "transparent",
                  color: isActive ? "#FAFAF7" : "#8A867E",
                  fontSize: 13,
                  fontWeight: 500,
                }}
              >
                <Icon size={14} />
                {r.label}
              </button>
            );
          })}
        </div>

        {storageError && (
          <div style={{ fontSize: 11.5, color: "#B8503A", background: "#FFF0E9", border: "1px solid #F3C6B4", borderRadius: 4, padding: "7px 10px", marginBottom: 16 }}>
            Running in local-only mode — changes won't sync across sessions.
          </div>
        )}

        {loading ? (
          <div style={{ padding: "60px 0", textAlign: "center", color: "#8A867E", fontSize: 13.5 }}>
            Loading manifest…
          </div>
        ) : role === "driver" ? (
          <DriverView orders={orders} onAdvance={advanceStage} />
        ) : view === "home" ? (
          <HomeView
            orders={orders}
            category={category}
            setCategory={setCategory}
            onNew={() => setView("new")}
            onOpen={(id) => {
              setActiveId(id);
              setView("track");
            }}
          />
        ) : view === "new" ? (
          <NewOrderView
            category={category}
            setCategory={setCategory}
            form={form}
            setForm={setForm}
            onSubmit={submitOrder}
            onBack={() => setView("home")}
          />
        ) : (
          active && <TrackView order={active} onBack={() => setView("home")} />
        )}
      </div>
    </div>
  );
}

function StatusPill({ stage }) {
  const done = stage >= 3;
  const colors = done ? { bg: "#E9F5EE", fg: "#1C8A56" } : { bg: "#FFF0E9", fg: "#FF4B1F" };
  return (
    <span className="mono" style={{ fontSize: 11, padding: "3px 8px", borderRadius: 3, background: colors.bg, color: colors.fg, whiteSpace: "nowrap" }}>
      {STAGES[stage]}
    </span>
  );
}

function HomeView({ orders, category, setCategory, onNew, onOpen }) {
  return (
    <div>
      <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4, marginBottom: 20 }}>
        {CATS.map((c) => {
          const Icon = c.icon;
          const isActive = c.id === category;
          return (
            <button
              key={c.id}
              onClick={() => setCategory(c.id)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                flexShrink: 0,
                padding: "8px 12px",
                borderRadius: 4,
                border: "1px solid " + (isActive ? "#FF4B1F" : "#DDD9D2"),
                background: isActive ? "#FF4B1F" : "transparent",
                color: isActive ? "#FAFAF7" : "#16181D",
                fontSize: 13.5,
                fontWeight: 500,
              }}
            >
              <Icon size={15} />
              {c.label}
            </button>
          );
        })}
      </div>

      <button
        onClick={onNew}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "16px 16px",
          background: "#16181D",
          color: "#FAFAF7",
          border: "none",
          borderRadius: 5,
          marginBottom: 28,
        }}
      >
        <span style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 15, fontWeight: 500 }}>
          <Plus size={17} />
          Send a {CATS.find((c) => c.id === category)?.label.toLowerCase()} delivery
        </span>
        <ChevronRight size={17} />
      </button>

      <div className="disp" style={{ fontSize: 13, letterSpacing: "0.02em", color: "#8A867E", marginBottom: 10 }}>
        Manifest — {orders.length} order{orders.length === 1 ? "" : "s"}
      </div>

      <div>
        {orders.map((o, i) => (
          <button
            key={o.id}
            onClick={() => onOpen(o.id)}
            style={{
              width: "100%",
              textAlign: "left",
              display: "block",
              padding: "14px 0",
              background: "none",
              border: "none",
              borderTop: i === 0 ? "1px solid #DDD9D2" : "none",
              borderBottom: "1px solid #DDD9D2",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", gap: 10 }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 14.5, fontWeight: 500, marginBottom: 3 }}>{o.item}</div>
                <div className="mono" style={{ fontSize: 11.5, color: "#8A867E" }}>
                  {code(o.id)} &nbsp;·&nbsp; {o.from} → {o.to}
                </div>
              </div>
              <StatusPill stage={o.stage} />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function NewOrderView({ category, setCategory, form, setForm, onSubmit, onBack }) {
  return (
    <div>
      <button onClick={onBack} style={{ background: "none", border: "none", fontSize: 13.5, color: "#8A867E", marginBottom: 18, padding: 0 }}>
        ← Back to manifest
      </button>

      <div className="disp" style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>New delivery</div>
      <div style={{ fontSize: 13.5, color: "#8A867E", marginBottom: 22 }}>
        Fill in the route. A courier is assigned once it's placed.
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 22, flexWrap: "wrap" }}>
        {CATS.map((c) => {
          const isActive = c.id === category;
          return (
            <button
              key={c.id}
              onClick={() => setCategory(c.id)}
              style={{
                padding: "6px 11px",
                borderRadius: 4,
                border: "1px solid " + (isActive ? "#FF4B1F" : "#DDD9D2"),
                background: isActive ? "#FFF0E9" : "transparent",
                color: isActive ? "#FF4B1F" : "#16181D",
                fontSize: 13,
              }}
            >
              {c.label}
            </button>
          );
        })}
      </div>

      <form onSubmit={onSubmit}>
        <Field label="Pickup address">
          <input value={form.from} onChange={(e) => setForm({ ...form, from: e.target.value })} placeholder="Where does the courier collect it?" style={inputStyle} />
        </Field>
        <Field label="Drop-off address">
          <input value={form.to} onChange={(e) => setForm({ ...form, to: e.target.value })} placeholder="Where is it going?" style={inputStyle} />
        </Field>
        <Field label="What's being sent">
          <input value={form.item} onChange={(e) => setForm({ ...form, item: e.target.value })} placeholder="e.g. Two bowls of pho, or a 3kg box" style={inputStyle} />
        </Field>
        <Field label="Note for courier (optional)">
          <textarea value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} rows={2} placeholder="Gate code, fragile, leave at door…" style={{ ...inputStyle, resize: "none" }} />
        </Field>

        <button type="submit" style={{ width: "100%", padding: "14px", background: "#FF4B1F", color: "#FAFAF7", border: "none", borderRadius: 5, fontSize: 15, fontWeight: 600, marginTop: 8 }}>
          Place delivery
        </button>
      </form>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 12.5, color: "#8A867E", marginBottom: 6 }}>{label}</div>
      {children}
    </div>
  );
}

const inputStyle = {
  width: "100%",
  padding: "11px 12px",
  border: "1px solid #DDD9D2",
  borderRadius: 4,
  fontSize: 14.5,
  background: "#fff",
  color: "#16181D",
  outline: "none",
};

function TrackView({ order, onBack }) {
  const stage = order.stage;
  return (
    <div>
      <button onClick={onBack} style={{ background: "none", border: "none", fontSize: 13.5, color: "#8A867E", marginBottom: 18, padding: 0 }}>
        ← Back to manifest
      </button>

      <div className="disp" style={{ fontSize: 24, fontWeight: 700 }}>{order.item}</div>
      <div className="mono" style={{ fontSize: 12, color: "#8A867E", marginBottom: 26 }}>{code(order.id)}</div>

      <div style={{ display: "flex", alignItems: "center", marginBottom: 10 }}>
        {STAGES.map((s, i) => (
          <React.Fragment key={s}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: i === 0 || i === STAGES.length - 1 ? "0 0 auto" : 1 }}>
              {i <= stage ? (
                <div style={{ width: 20, height: 20, borderRadius: "50%", background: "#FF4B1F", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Check size={12} color="#FAFAF7" strokeWidth={3} />
                </div>
              ) : (
                <div style={{ width: 20, height: 20, borderRadius: "50%", border: "1.5px solid #DDD9D2", background: "#FAFAF7" }} />
              )}
            </div>
            {i < STAGES.length - 1 && (
              <div style={{ flex: 1, height: 2, background: i < stage ? "#FF4B1F" : "#DDD9D2" }} />
            )}
          </React.Fragment>
        ))}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 26 }}>
        {STAGES.map((s, i) => (
          <div key={s} className="mono" style={{ fontSize: 10.5, color: i <= stage ? "#16181D" : "#B8B4AC", width: 60, textAlign: i === 0 ? "left" : i === STAGES.length - 1 ? "right" : "center" }}>
            {s}
          </div>
        ))}
      </div>

      <div style={{ border: "1px solid #DDD9D2", borderRadius: 5, padding: 14, marginBottom: 20 }}>
        <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
          <MapPin size={16} color="#8A867E" style={{ marginTop: 2, flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: 11, color: "#8A867E" }}>Pickup</div>
            <div style={{ fontSize: 14 }}>{order.from}</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <MapPin size={16} color="#FF4B1F" style={{ marginTop: 2, flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: 11, color: "#8A867E" }}>Drop-off</div>
            <div style={{ fontSize: 14 }}>{order.to}</div>
          </div>
        </div>
      </div>

      {stage < 3 ? (
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 26, fontSize: 14 }}>
          <Clock size={15} color="#8A867E" />
          <span>Arriving in about <span className="mono">{order.eta} min</span></span>
        </div>
      ) : (
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 26, fontSize: 14, color: "#1C8A56" }}>
          <Check size={15} />
          <span>Delivered</span>
        </div>
      )}

      <div className="disp" style={{ fontSize: 13, letterSpacing: "0.02em", color: "#8A867E", marginBottom: 10 }}>
        Activity
      </div>
      <div>
        {order.log.slice().reverse().map((l, i) => (
          <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "9px 0", borderBottom: "1px solid #DDD9D2" }}>
            <div style={{ fontSize: 13.5 }}>{l.s}</div>
            <div className="mono" style={{ fontSize: 12, color: "#8A867E" }}>{l.t}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function DriverView({ orders, onAdvance }) {
  const active = orders.filter((o) => o.stage < 3);
  const done = orders.filter((o) => o.stage >= 3);

  return (
    <div>
      <div className="disp" style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>Route queue</div>
      <div style={{ fontSize: 13.5, color: "#8A867E", marginBottom: 22 }}>
        {active.length} to run today. Advance each stop as you go — customers see it update live.
      </div>

      {active.length === 0 && (
        <div style={{ padding: "30px 0", textAlign: "center", color: "#8A867E", fontSize: 13.5 }}>
          Queue's clear. Nothing waiting on you right now.
        </div>
      )}

      {active.map((o) => {
        const nextLabel = ["Confirm pickup", "Start transit", "Mark delivered"][o.stage];
        const cat = CATS.find((c) => c.id === o.category);
        const Icon = cat ? cat.icon : Boxes;
        return (
          <div key={o.id} style={{ border: "1px solid #DDD9D2", borderRadius: 5, padding: 14, marginBottom: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: 10 }}>
              <div style={{ display: "flex", gap: 8, minWidth: 0 }}>
                <Icon size={16} color="#8A867E" style={{ marginTop: 2, flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: 14.5, fontWeight: 500 }}>{o.item}</div>
                  <div className="mono" style={{ fontSize: 11, color: "#8A867E" }}>{code(o.id)}</div>
                </div>
              </div>
              <StatusPill stage={o.stage} />
            </div>

            <div style={{ fontSize: 12.5, color: "#54514B", marginBottom: 4 }}>
              <span style={{ color: "#8A867E" }}>From</span> {o.from}
            </div>
            <div style={{ fontSize: 12.5, color: "#54514B", marginBottom: 12 }}>
              <span style={{ color: "#8A867E" }}>To</span> {o.to}
            </div>
            {o.note && (
              <div style={{ fontSize: 12, color: "#8A867E", marginBottom: 12, fontStyle: "italic" }}>
                Note: {o.note}
              </div>
            )}

            <button
              onClick={() => onAdvance(o.id)}
              style={{ width: "100%", padding: "10px", background: "#16181D", color: "#FAFAF7", border: "none", borderRadius: 4, fontSize: 13.5, fontWeight: 500 }}
            >
              {nextLabel}
            </button>
          </div>
        );
      })}

      {done.length > 0 && (
        <>
          <div className="disp" style={{ fontSize: 13, letterSpacing: "0.02em", color: "#8A867E", margin: "22px 0 10px" }}>
            Completed today — {done.length}
          </div>
          {done.map((o, i) => (
            <div key={o.id} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderTop: i === 0 ? "1px solid #DDD9D2" : "none", borderBottom: "1px solid #DDD9D2" }}>
              <div style={{ fontSize: 13.5, color: "#54514B" }}>{o.item}</div>
              <div className="mono" style={{ fontSize: 11.5, color: "#8A867E" }}>{code(o.id)}</div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
