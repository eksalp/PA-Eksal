"use client";

import { useState, useEffect, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Plus,
  X,
  ChevronLeft,
  ChevronRight,
  Edit2,
  Trash2,
  Save,
} from "lucide-react";

/* ── Config ── */
const STATUSES = {
  idea: { label: "Ide", color: "#8B5CF6", bg: "rgba(139,92,246,.1)" },
  draft: { label: "Draft", color: "#F59E0B", bg: "rgba(245,158,11,.1)" },
  review: { label: "Review", color: "#3FA9E0", bg: "rgba(63,169,224,.1)" },
  publish: { label: "Publish", color: "#22C55E", bg: "rgba(34,197,94,.1)" },
};
const STATUS_KEYS = ["idea", "draft", "review", "publish"];

const PLATFORMS = {
  ig: "Instagram",
  tiktok: "TikTok",
  youtube: "YouTube",
  threads: "Threads",
  telegram: "Telegram",
  other: "Lainnya",
};
const CONTENT_TYPES = {
  reels: "Reels",
  video: "Video",
  carousel: "Carousel",
  story: "Story",
  thread: "Thread",
  live: "Live",
  shorts: "Shorts",
  other: "Lainnya",
};
const PRIORITIES = {
  high: { label: "High", color: "#EF4444", bg: "rgba(239,68,68,.1)" },
  med: { label: "Med", color: "#F59E0B", bg: "rgba(245,158,11,.1)" },
  low: { label: "Low", color: "#22C55E", bg: "rgba(34,197,94,.1)" },
};

const S = {
  card: {
    background: "var(--surface)",
    border: "1px solid var(--border)",
    borderRadius: 16,
    boxShadow: "var(--shadow-sm)",
  },
  card2: {
    background: "var(--surface-2)",
    border: "1px solid var(--border)",
    borderRadius: 12,
  },
  input: {
    width: "100%",
    padding: "9px 12px",
    borderRadius: 10,
    border: "1.5px solid var(--border)",
    background: "var(--surface-2)",
    color: "var(--text)",
    fontSize: 13,
    outline: "none",
  },
  label: {
    display: "block",
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: ".06em",
    textTransform: "uppercase",
    color: "var(--text-3)",
    marginBottom: 5,
  },
  btnPrimary: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "9px 16px",
    borderRadius: 10,
    background: "linear-gradient(135deg,#4F78FF,#7C5CFC)",
    color: "#fff",
    fontSize: 13,
    fontWeight: 600,
    border: "none",
    cursor: "pointer",
  },
  btnGhost: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "8px 14px",
    borderRadius: 10,
    background: "var(--surface-2)",
    color: "var(--text-2)",
    fontSize: 13,
    fontWeight: 500,
    border: "1.5px solid var(--border)",
    cursor: "pointer",
  },
  badge: (color, bg) => ({
    display: "inline-flex",
    alignItems: "center",
    padding: "2px 8px",
    borderRadius: 99,
    fontSize: 11,
    fontWeight: 600,
    color,
    background: bg,
  }),
  iconBtn: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: 28,
    height: 28,
    borderRadius: 8,
    border: "1px solid var(--border)",
    background: "var(--surface-2)",
    color: "var(--text-3)",
    cursor: "pointer",
  },
};

const BLANK = {
  title: "",
  status: "idea",
  platform: "",
  content_type: "",
  priority: "med",
  publish_date: "",
  script: "",
  notes: "",
  tags: "",
};

/* ══════════════════════════════════════════════════════════════
   MAIN
══════════════════════════════════════════════════════════════ */
export function ContentCalendar({ userId }) {
  const supabase = createClient();
  const [view, setView] = useState("kanban");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null); // item being edited
  const [form, setForm] = useState(BLANK);
  const [detailId, setDetailId] = useState(null); // detail modal

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function load() {
    const { data } = await supabase
      .from("content_items")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    setItems(data ?? []);
    setLoading(false);
  }

  async function save() {
    if (!form.title.trim()) return alert("Isi judul dulu.");
    const payload = {
      user_id: userId,
      title: form.title.trim(),
      status: form.status,
      platform: form.platform || null,
      content_type: form.content_type || null,
      priority: form.priority,
      publish_date: form.publish_date || null,
      script: form.script || null,
      notes: form.notes || null,
      tags: form.tags
        ? form.tags
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean)
        : [],
    };
    if (editing) {
      const { data: row } = await supabase
        .from("content_items")
        .update(payload)
        .eq("id", editing.id)
        .select()
        .single();
      setItems((it) => it.map((x) => (x.id === editing.id ? row : x)));
    } else {
      const { data: row } = await supabase
        .from("content_items")
        .insert(payload)
        .select()
        .single();
      setItems((it) => [row, ...it]);
    }
    closeForm();
  }

  async function updateStatus(id, status) {
    setItems((it) => it.map((x) => (x.id === id ? { ...x, status } : x)));
    await supabase.from("content_items").update({ status }).eq("id", id);
  }

  async function remove(id) {
    if (!confirm("Hapus konten ini?")) return;
    setItems((it) => it.filter((x) => x.id !== id));
    setDetailId(null);
    await supabase.from("content_items").delete().eq("id", id);
  }

  function openNew(status = "idea") {
    setEditing(null);
    setForm({ ...BLANK, status });
    setShowForm(true);
  }
  function openEdit(item) {
    setEditing(item);
    setForm({
      ...item,
      tags: (item.tags || []).join(", "),
      publish_date: item.publish_date || "",
    });
    setShowForm(true);
    setDetailId(null);
  }
  function closeForm() {
    setShowForm(false);
    setEditing(null);
    setForm(BLANK);
  }

  const detail = detailId ? items.find((x) => x.id === detailId) : null;

  if (loading)
    return (
      <div
        style={{
          padding: 32,
          textAlign: "center",
          color: "var(--text-3)",
          fontSize: 13,
        }}
      >
        Memuat kalender…
      </div>
    );

  return (
    <div>
      {/* Sub-header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 16,
          flexWrap: "wrap",
          gap: 10,
        }}
      >
        <div
          style={{
            display: "flex",
            gap: 4,
            background: "var(--surface-2)",
            border: "1px solid var(--border)",
            borderRadius: 12,
            padding: 4,
          }}
        >
          {[
            ["kanban", "Kanban"],
            ["calendar", "Kalender"],
          ].map(([v, l]) => (
            <button
              key={v}
              onClick={() => setView(v)}
              style={{
                border: "none",
                padding: "7px 16px",
                borderRadius: 9,
                fontSize: 13,
                fontWeight: 500,
                cursor: "pointer",
                background: view === v ? "var(--surface)" : "transparent",
                color: view === v ? "var(--text)" : "var(--text-3)",
                boxShadow: view === v ? "var(--shadow-sm)" : "none",
              }}
            >
              {l}
            </button>
          ))}
        </div>
        <button onClick={() => openNew()} style={S.btnPrimary}>
          <Plus size={14} /> Konten Baru
        </button>
      </div>

      {view === "kanban" && (
        <KanbanView
          items={items}
          onAdd={openNew}
          onCard={setDetailId}
          onStatusChange={updateStatus}
        />
      )}
      {view === "calendar" && (
        <CalendarView items={items} onCard={setDetailId} />
      )}

      {/* Form modal */}
      {showForm && (
        <Modal
          onClose={closeForm}
          title={editing ? "Edit Konten" : "Konten Baru"}
        >
          <FormBody
            form={form}
            setForm={setForm}
            onSave={save}
            onCancel={closeForm}
          />
        </Modal>
      )}

      {/* Detail modal */}
      {detail && (
        <Modal onClose={() => setDetailId(null)} title="Detail Konten">
          <DetailBody
            item={detail}
            onEdit={() => openEdit(detail)}
            onDelete={() => remove(detail.id)}
            onStatusChange={updateStatus}
          />
        </Modal>
      )}
    </div>
  );
}

/* ══ KANBAN ══ */
function KanbanView({ items, onAdd, onCard, onStatusChange }) {
  return (
    <div
      style={{
        overflowX: "auto",
        marginLeft: -4,
        marginRight: -4,
        paddingLeft: 4,
        paddingRight: 4,
        paddingBottom: 8,
      }}
    >
      <div
        style={{ display: "flex", gap: 12, minWidth: 640, alignItems: "start" }}
      >
        {STATUS_KEYS.map((s) => {
          const col = items.filter((x) => x.status === s);
          const ST = STATUSES[s];
          return (
            <div key={s} style={{ flex: "0 0 220px", minWidth: 0 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 10,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: ST.color,
                    }}
                  />
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: "var(--text-2)",
                      textTransform: "uppercase",
                      letterSpacing: ".06em",
                    }}
                  >
                    {ST.label}
                  </span>
                  <span
                    style={{
                      fontSize: 11,
                      color: "var(--text-3)",
                      background: "var(--surface-2)",
                      borderRadius: 99,
                      padding: "1px 6px",
                    }}
                  >
                    {col.length}
                  </span>
                </div>
                <button
                  onClick={() => onAdd(s)}
                  style={{
                    ...S.iconBtn,
                    width: 24,
                    height: 24,
                    borderRadius: 6,
                    fontSize: 16,
                    color: ST.color,
                    borderColor: ST.color + "40",
                  }}
                >
                  +
                </button>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {col.map((item) => (
                  <KanbanCard
                    key={item.id}
                    item={item}
                    onClick={() => onCard(item.id)}
                    onStatusChange={onStatusChange}
                  />
                ))}
                {col.length === 0 && (
                  <div
                    style={{
                      border: "1.5px dashed var(--border)",
                      borderRadius: 12,
                      padding: "20px 12px",
                      textAlign: "center",
                      cursor: "pointer",
                    }}
                    onClick={() => onAdd(s)}
                  >
                    <p
                      style={{
                        fontSize: 12,
                        color: "var(--text-3)",
                        margin: 0,
                      }}
                    >
                      + Tambah
                    </p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function KanbanCard({ item, onClick, onStatusChange }) {
  const ST = STATUSES[item.status];
  const PR = PRIORITIES[item.priority];
  const [dragging, setDragging] = useState(false);

  return (
    <div
      draggable
      onDragStart={() => setDragging(true)}
      onDragEnd={() => setDragging(false)}
      onClick={onClick}
      style={{
        ...S.card,
        padding: 14,
        cursor: "pointer",
        opacity: dragging ? 0.5 : 1,
        transition: "transform .1s, opacity .15s",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 8,
          marginBottom: 8,
        }}
      >
        <p
          style={{ fontSize: 13, fontWeight: 600, margin: 0, lineHeight: 1.4 }}
        >
          {item.title}
        </p>
        <span style={S.badge(PR.color, PR.bg)}>{PR.label}</span>
      </div>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 4,
          marginBottom: item.publish_date ? 8 : 0,
        }}
      >
        {item.platform && (
          <span style={S.badge("#4F78FF", "rgba(79,120,255,.1)")}>
            {PLATFORMS[item.platform] || item.platform}
          </span>
        )}
        {item.content_type && (
          <span style={S.badge("var(--text-2)", "var(--surface-2)")}>
            {CONTENT_TYPES[item.content_type] || item.content_type}
          </span>
        )}
      </div>
      {item.tags?.length > 0 && (
        <div
          style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 8 }}
        >
          {item.tags.map((t) => (
            <span
              key={t}
              style={{
                fontSize: 10,
                padding: "1px 6px",
                borderRadius: 99,
                background: "var(--surface-2)",
                color: "var(--text-3)",
                border: "1px solid var(--border)",
              }}
            >
              #{t}
            </span>
          ))}
        </div>
      )}
      {item.publish_date && (
        <p style={{ fontSize: 11, color: "var(--text-3)", margin: 0 }}>
          📅 {item.publish_date}
        </p>
      )}
      {/* Status changer */}
      <div
        style={{
          display: "flex",
          gap: 4,
          marginTop: 10,
          paddingTop: 10,
          borderTop: "1px solid var(--border)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {STATUS_KEYS.filter((s) => s !== item.status).map((s) => (
          <button
            key={s}
            onClick={() => onStatusChange(item.id, s)}
            style={{
              fontSize: 10,
              padding: "2px 7px",
              borderRadius: 99,
              background: STATUSES[s].bg,
              color: STATUSES[s].color,
              border: "none",
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            → {STATUSES[s].label}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ══ CALENDAR ══ */
function CalendarView({ items, onCard }) {
  const [cur, setCur] = useState(() => {
    const d = new Date();
    return { y: d.getFullYear(), m: d.getMonth() };
  });
  const { y, m } = cur;
  const DAYS = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
  const MONTHS = [
    "Januari",
    "Februari",
    "Maret",
    "April",
    "Mei",
    "Juni",
    "Juli",
    "Agustus",
    "September",
    "Oktober",
    "November",
    "Desember",
  ];

  const firstDay = new Date(y, m, 1).getDay();
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const todayStr = new Date().toISOString().slice(0, 10);

  const byDate = useMemo(() => {
    const map = {};
    items.forEach((it) => {
      if (it.publish_date) {
        if (!map[it.publish_date]) map[it.publish_date] = [];
        map[it.publish_date].push(it);
      }
    });
    return map;
  }, [items]);

  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div style={S.card}>
      {/* Nav */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "16px 20px",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <button
          onClick={() =>
            setCur((c) => {
              const d = new Date(c.y, c.m - 1);
              return { y: d.getFullYear(), m: d.getMonth() };
            })
          }
          style={S.iconBtn}
        >
          <ChevronLeft size={16} />
        </button>
        <span style={{ fontWeight: 700, fontSize: 15 }}>
          {MONTHS[m]} {y}
        </span>
        <button
          onClick={() =>
            setCur((c) => {
              const d = new Date(c.y, c.m + 1);
              return { y: d.getFullYear(), m: d.getMonth() };
            })
          }
          style={S.iconBtn}
        >
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Day headers */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7,1fr)",
          padding: "10px 12px 4px",
        }}
      >
        {DAYS.map((d) => (
          <div
            key={d}
            style={{
              textAlign: "center",
              fontSize: 11,
              fontWeight: 600,
              color: "var(--text-3)",
              textTransform: "uppercase",
              letterSpacing: ".06em",
            }}
          >
            {d}
          </div>
        ))}
      </div>

      {/* Cells */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7,1fr)",
          gap: 2,
          padding: "0 12px 12px",
        }}
      >
        {cells.map((day, i) => {
          if (!day) return <div key={`e-${i}`} />;
          const dateStr = `${y}-${String(m + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const dayItems = byDate[dateStr] || [];
          const isToday = dateStr === todayStr;
          return (
            <div
              key={dateStr}
              style={{
                minHeight: 72,
                padding: 6,
                borderRadius: 10,
                background: isToday ? "rgba(79,120,255,.06)" : "transparent",
                border: isToday
                  ? "1.5px solid rgba(79,120,255,.25)"
                  : "1.5px solid transparent",
              }}
            >
              <p
                style={{
                  fontSize: 12,
                  fontWeight: isToday ? 700 : 400,
                  color: isToday ? "#4F78FF" : "var(--text-2)",
                  margin: "0 0 4px",
                  textAlign: "center",
                }}
              >
                {day}
              </p>
              {dayItems.slice(0, 2).map((it) => (
                <div
                  key={it.id}
                  onClick={() => onCard(it.id)}
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    padding: "2px 5px",
                    borderRadius: 5,
                    marginBottom: 2,
                    cursor: "pointer",
                    background: STATUSES[it.status].bg,
                    color: STATUSES[it.status].color,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {it.title}
                </div>
              ))}
              {dayItems.length > 2 && (
                <p
                  style={{
                    fontSize: 10,
                    color: "var(--text-3)",
                    margin: 0,
                    textAlign: "center",
                  }}
                >
                  +{dayItems.length - 2}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* No-date items */}
      {items.filter((it) => !it.publish_date).length > 0 && (
        <div
          style={{ borderTop: "1px solid var(--border)", padding: "12px 20px" }}
        >
          <p
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: "var(--text-3)",
              textTransform: "uppercase",
              letterSpacing: ".06em",
              marginBottom: 8,
            }}
          >
            Belum dijadwalkan
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {items
              .filter((it) => !it.publish_date)
              .map((it) => (
                <div
                  key={it.id}
                  onClick={() => onCard(it.id)}
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    padding: "4px 10px",
                    borderRadius: 8,
                    cursor: "pointer",
                    background: STATUSES[it.status].bg,
                    color: STATUSES[it.status].color,
                  }}
                >
                  {it.title}
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ══ FORM ══ */
function FormBody({ form, setForm, onSave, onCancel }) {
  const f = (k) => ({
    value: form[k],
    onChange: (e) => setForm((p) => ({ ...p, [k]: e.target.value })),
  });
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div>
        <label style={S.label}>Judul *</label>
        <input
          style={S.input}
          placeholder="Judul konten"
          autoFocus
          {...f("title")}
        />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <div>
          <label style={S.label}>Status</label>
          <select style={S.input} {...f("status")}>
            {Object.entries(STATUSES).map(([k, v]) => (
              <option key={k} value={k}>
                {v.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label style={S.label}>Prioritas</label>
          <select style={S.input} {...f("priority")}>
            {Object.entries(PRIORITIES).map(([k, v]) => (
              <option key={k} value={k}>
                {v.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label style={S.label}>Platform</label>
          <select style={S.input} {...f("platform")}>
            <option value="">—</option>
            {Object.entries(PLATFORMS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label style={S.label}>Tipe Konten</label>
          <select style={S.input} {...f("content_type")}>
            <option value="">—</option>
            {Object.entries(CONTENT_TYPES).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </div>
        <div style={{ gridColumn: "1/-1" }}>
          <label style={S.label}>Tanggal Publish</label>
          <input type="date" style={S.input} {...f("publish_date")} />
        </div>
      </div>
      <div>
        <label style={S.label}>Script / Outline</label>
        <textarea
          style={{
            ...S.input,
            minHeight: 120,
            resize: "vertical",
            fontFamily: "inherit",
          }}
          placeholder="Tulis script atau outline konten di sini…"
          value={form.script}
          onChange={(e) => setForm((p) => ({ ...p, script: e.target.value }))}
        />
      </div>
      <div>
        <label style={S.label}>Catatan</label>
        <textarea
          style={{
            ...S.input,
            minHeight: 60,
            resize: "vertical",
            fontFamily: "inherit",
          }}
          placeholder="Catatan singkat, referensi, dll"
          value={form.notes}
          onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
        />
      </div>
      <div>
        <label style={S.label}>Tag (pisah dengan koma)</label>
        <input
          style={S.input}
          placeholder="viral, edukatif, collab"
          {...f("tags")}
        />
      </div>
      <div style={{ display: "flex", gap: 8, paddingTop: 4 }}>
        <button
          onClick={onSave}
          style={{ ...S.btnPrimary, flex: 1, justifyContent: "center" }}
        >
          <Save size={14} /> Simpan
        </button>
        <button
          onClick={onCancel}
          style={{ ...S.btnGhost, flex: 1, justifyContent: "center" }}
        >
          Batal
        </button>
      </div>
    </div>
  );
}

/* ══ DETAIL ══ */
function DetailBody({ item, onEdit, onDelete, onStatusChange }) {
  const ST = STATUSES[item.status];
  const PR = PRIORITIES[item.priority];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 10,
        }}
      >
        <h3 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>
          {item.title}
        </h3>
        <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
          <button onClick={onEdit} style={S.iconBtn}>
            <Edit2 size={13} />
          </button>
          <button
            onClick={onDelete}
            style={{ ...S.iconBtn, color: "var(--red)" }}
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        <span style={S.badge(ST.color, ST.bg)}>{ST.label}</span>
        <span style={S.badge(PR.color, PR.bg)}>{PR.label}</span>
        {item.platform && (
          <span style={S.badge("#4F78FF", "rgba(79,120,255,.1)")}>
            {PLATFORMS[item.platform] || item.platform}
          </span>
        )}
        {item.content_type && (
          <span style={S.badge("var(--text-2)", "var(--surface-2)")}>
            {CONTENT_TYPES[item.content_type] || item.content_type}
          </span>
        )}
        {item.publish_date && (
          <span style={{ fontSize: 12, color: "var(--text-3)" }}>
            📅 {item.publish_date}
          </span>
        )}
      </div>

      {item.tags?.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
          {item.tags.map((t) => (
            <span
              key={t}
              style={{
                fontSize: 11,
                padding: "2px 8px",
                borderRadius: 99,
                background: "var(--surface-2)",
                color: "var(--text-3)",
                border: "1px solid var(--border)",
              }}
            >
              #{t}
            </span>
          ))}
        </div>
      )}

      {item.notes && (
        <div
          style={{
            background: "var(--surface-2)",
            borderRadius: 10,
            padding: "10px 12px",
            border: "1px solid var(--border)",
          }}
        >
          <p
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: "var(--text-3)",
              textTransform: "uppercase",
              letterSpacing: ".06em",
              margin: "0 0 6px",
            }}
          >
            Catatan
          </p>
          <p
            style={{
              fontSize: 13,
              color: "var(--text-2)",
              margin: 0,
              whiteSpace: "pre-wrap",
            }}
          >
            {item.notes}
          </p>
        </div>
      )}

      {item.script && (
        <div
          style={{
            background: "var(--surface-2)",
            borderRadius: 10,
            padding: "12px 14px",
            border: "1px solid var(--border)",
          }}
        >
          <p
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: "var(--text-3)",
              textTransform: "uppercase",
              letterSpacing: ".06em",
              margin: "0 0 8px",
            }}
          >
            Script / Outline
          </p>
          <p
            style={{
              fontSize: 13,
              color: "var(--text)",
              margin: 0,
              whiteSpace: "pre-wrap",
              lineHeight: 1.6,
            }}
          >
            {item.script}
          </p>
        </div>
      )}

      <div>
        <p
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: "var(--text-3)",
            textTransform: "uppercase",
            letterSpacing: ".06em",
            marginBottom: 8,
          }}
        >
          Pindah Status
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {Object.entries(STATUSES).map(([k, v]) => (
            <button
              key={k}
              onClick={() => onStatusChange(item.id, k)}
              style={{
                ...S.badge(v.color, item.status === k ? v.color : v.bg),
                padding: "5px 12px",
                cursor: "pointer",
                border:
                  item.status === k
                    ? `1.5px solid ${v.color}`
                    : "1.5px solid transparent",
                fontWeight: 600,
                fontSize: 12,
              }}
            >
              {item.status === k ? "✓ " : ""}
              {v.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ══ MODAL ══ */
function Modal({ onClose, title, children }) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        background: "rgba(0,0,0,.45)",
      }}
      onClick={onClose}
    >
      <div
        style={{
          ...S.card,
          width: "100%",
          maxWidth: 540,
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "16px 20px",
            borderBottom: "1px solid var(--border)",
          }}
        >
          <span style={{ fontWeight: 700, fontSize: 16 }}>{title}</span>
          <button onClick={onClose} style={S.iconBtn}>
            <X size={16} />
          </button>
        </div>
        <div style={{ overflow: "auto", padding: 20, flex: 1 }}>{children}</div>
      </div>
    </div>
  );
}
