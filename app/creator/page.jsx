"use client";

import React, { useState, useEffect, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { ContentCalendar } from "./content-calendar";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
} from "recharts";
import {
  Camera,
  Music2,
  AtSign,
  Play,
  Send,
  Plus,
  Trash2,
  TrendingUp,
  TrendingDown,
  Minus,
  Briefcase,
  Wallet,
  Users,
  MapPin,
  Laptop,
  X,
  RotateCcw,
  ExternalLink,
  Pencil,
  Rocket,
} from "lucide-react";

/* ── Config ── */
const PLATFORMS = {
  ig: { label: "Instagram", color: "#E1306C", Icon: Camera },
  tiktok: { label: "TikTok", color: "#25F4EE", Icon: Music2 },
  threads: { label: "Threads", color: "#9CA3AF", Icon: AtSign },
  youtube: { label: "YouTube", color: "#FF3B30", Icon: Play },
  telegram: { label: "Telegram", color: "#3FA9E0", Icon: Send },
};
const PLATFORM_KEYS = ["ig", "tiktok", "threads", "youtube", "telegram"];

const JOB_TYPES = {
  onsite: { label: "Onsite", color: "#F59E0B", Icon: MapPin },
  freelance: { label: "Freelance", color: "#4F78FF", Icon: Briefcase },
  remote: { label: "Remote", color: "#22C55E", Icon: Laptop },
};
const STATUSES = {
  ongoing: { label: "Jalan", color: "#4F78FF", bg: "rgba(79,120,255,.1)" },
  pending: {
    label: "Nunggu bayar",
    color: "#F59E0B",
    bg: "rgba(245,158,11,.1)",
  },
  paid: { label: "Lunas", color: "#22C55E", bg: "rgba(34,197,94,.1)" },
};
const CURRENCIES = ["Rp", "$", "€", "£"];
const LINK_COLORS = [
  "#4F78FF",
  "#7C5CFC",
  "#22C55E",
  "#F59E0B",
  "#EF4444",
  "#EC4899",
  "#06B6D4",
  "#8B5CF6",
  "#3FA9E0",
  "#F97316",
];

const todayStr = () => new Date().toISOString().slice(0, 10);
const grp = (n) => (Number(n) || 0).toLocaleString("id-ID");
const compact = (n) => {
  const v = Number(n) || 0;
  if (v >= 1e6) return (v / 1e6).toFixed(1) + "M";
  if (v >= 1e3) return (v / 1e3).toFixed(1) + "K";
  return String(v);
};

/* ── Shared styles ── */
const S = {
  card: {
    background: "var(--surface)",
    border: "1px solid var(--border)",
    borderRadius: 20,
    boxShadow: "var(--shadow-sm)",
  },
  card2: {
    background: "var(--surface-2)",
    border: "1px solid var(--border)",
    borderRadius: 14,
  },
  input: {
    width: "100%",
    padding: "10px 14px",
    borderRadius: 12,
    border: "1.5px solid var(--border)",
    background: "var(--surface-2)",
    color: "var(--text)",
    fontSize: 14,
    outline: "none",
  },
  label: {
    display: "block",
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: ".06em",
    textTransform: "uppercase",
    color: "var(--text-3)",
    marginBottom: 6,
  },
  btnPrimary: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "10px 18px",
    borderRadius: 12,
    background: "linear-gradient(135deg,#4F78FF,#7C5CFC)",
    color: "#fff",
    fontSize: 14,
    fontWeight: 600,
    border: "none",
    cursor: "pointer",
    boxShadow: "0 4px 14px rgba(79,120,255,.3)",
  },
  btnGhost: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "9px 16px",
    borderRadius: 12,
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
    padding: "3px 10px",
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
    width: 32,
    height: 32,
    borderRadius: 8,
    border: "1px solid var(--border)",
    background: "var(--surface-2)",
    color: "var(--text-3)",
    cursor: "pointer",
  },
};

function sampleData() {
  const jobs = [
    {
      brand: "Skintella Serum",
      type: "remote",
      status: "paid",
      value: 2500000,
      platform: "ig",
      deadline: "2026-07-10",
      notes: "1 reels + 3 story",
    },
    {
      brand: "Kopi Nusa",
      type: "onsite",
      status: "ongoing",
      value: 1800000,
      platform: "tiktok",
      deadline: "2026-08-05",
      notes: "Event launch Jakarta",
    },
    {
      brand: "FitBand ID",
      type: "freelance",
      status: "pending",
      value: 3200000,
      platform: "ig",
      deadline: "2026-07-20",
      notes: "Affiliate 12% + flat fee",
    },
    {
      brand: "GlowLamp",
      type: "freelance",
      status: "paid",
      value: 900000,
      platform: "tiktok",
      deadline: "2026-06-28",
      notes: "",
    },
  ];
  const days = [
    "2026-05-15",
    "2026-06-01",
    "2026-06-15",
    "2026-07-01",
    "2026-07-15",
    "2026-07-29",
  ];
  const snapshots = days.map((d, i) => ({
    date: d,
    ig: [8200, 9100, 10400, 11800, 13200, 14650][i],
    tiktok: [15400, 18200, 21000, 26500, 31200, 35800][i],
    threads: [1200, 1900, 2600, 3400, 4500, 5300][i],
    youtube: [3400, 3800, 4200, 4900, 5600, 6250][i],
    telegram: [600, 850, 1050, 1400, 1750, 2100][i],
  }));
  const links = [
    { name: "Micro1", url: "https://www.micro1.ai", color: "#4F78FF" },
    { name: "Mercor", url: "https://www.mercor.com", color: "#22C55E" },
  ];
  return { jobs, snapshots, links };
}

/* ══════════════════════════════════════════════════════════════
   MAIN
══════════════════════════════════════════════════════════════ */
export default function CreatorDashboard() {
  const supabase = createClient();
  const [tab, setTab] = useState("overview");
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [snapshots, setSnapshots] = useState([]);
  const [links, setLinks] = useState([]);
  const [freelanceLinks, setFreelanceLinks] = useState([]);
  const [currency, setCurrency] = useState("Rp");

  async function loadAll(uid) {
    const [jr, sr, lr, flr, cr] = await Promise.all([
      supabase
        .from("creator_jobs")
        .select("*")
        .eq("user_id", uid)
        .order("created_at"),
      supabase
        .from("creator_snapshots")
        .select("*")
        .eq("user_id", uid)
        .order("date"),
      supabase
        .from("creator_links")
        .select("*")
        .eq("user_id", uid)
        .order("created_at"),
      supabase
        .from("creator_freelance_links")
        .select("*")
        .eq("user_id", uid)
        .order("created_at"),
      supabase
        .from("creator_settings")
        .select("currency")
        .eq("user_id", uid)
        .maybeSingle(),
    ]);
    setJobs(jr.data ?? []);
    setSnapshots(sr.data ?? []);
    setLinks(lr.data ?? []);
    setFreelanceLinks(flr.data ?? []);
    setCurrency(cr.data?.currency ?? "Rp");
  }

  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }
      setUserId(user.id);
      await loadAll(user.id);
      setLoading(false);
    })();
  }, []);

  /* CRUD */
  const addJob = async (form) => {
    const { data: row, error } = await supabase
      .from("creator_jobs")
      .insert({
        user_id: userId,
        ...form,
        value: Number(form.value) || 0,
        platform: form.platform || null,
        deadline: form.deadline || null,
        notes: form.notes || null,
      })
      .select()
      .single();
    if (error) return alert(error.message);
    setJobs((j) => [...j, row]);
  };
  const updateJobStatus = async (id, status) => {
    setJobs((j) => j.map((x) => (x.id === id ? { ...x, status } : x)));
    await supabase.from("creator_jobs").update({ status }).eq("id", id);
  };
  const removeJob = async (id) => {
    setJobs((j) => j.filter((x) => x.id !== id));
    await supabase.from("creator_jobs").delete().eq("id", id);
  };
  const addSnapshot = async (snap) => {
    const payload = { user_id: userId, date: snap.date };
    PLATFORM_KEYS.forEach((k) => {
      payload[k] = Number(snap[k]) || 0;
    });
    const { data: row, error } = await supabase
      .from("creator_snapshots")
      .upsert(payload, { onConflict: "user_id,date" })
      .select()
      .single();
    if (error) return alert(error.message);
    setSnapshots((s) =>
      [...s.filter((x) => x.date !== row.date), row].sort((a, b) =>
        a.date.localeCompare(b.date),
      ),
    );
  };
  const removeSnapshot = async (id) => {
    setSnapshots((s) => s.filter((x) => x.id !== id));
    await supabase.from("creator_snapshots").delete().eq("id", id);
  };
  const addLink = async (d) => {
    const { data: row, error } = await supabase
      .from("creator_links")
      .insert({ user_id: userId, ...d })
      .select()
      .single();
    if (error) return alert(error.message);
    setLinks((l) => [...l, row]);
  };
  const updateLink = async (id, d) => {
    setLinks((l) => l.map((x) => (x.id === id ? { ...x, ...d } : x)));
    await supabase.from("creator_links").update(d).eq("id", id);
  };
  const removeLink = async (id) => {
    setLinks((l) => l.filter((x) => x.id !== id));
    await supabase.from("creator_links").delete().eq("id", id);
  };
  const addFLink = async (d) => {
    const { data: row, error } = await supabase
      .from("creator_freelance_links")
      .insert({ user_id: userId, ...d })
      .select()
      .single();
    if (error) return alert(error.message);
    setFreelanceLinks((l) => [...l, row]);
  };
  const updateFLink = async (id, d) => {
    setFreelanceLinks((l) => l.map((x) => (x.id === id ? { ...x, ...d } : x)));
    await supabase.from("creator_freelance_links").update(d).eq("id", id);
  };
  const removeFLink = async (id) => {
    setFreelanceLinks((l) => l.filter((x) => x.id !== id));
    await supabase.from("creator_freelance_links").delete().eq("id", id);
  };
  const saveCurrency = async (c) => {
    setCurrency(c);
    await supabase
      .from("creator_settings")
      .upsert({ user_id: userId, currency: c });
  };
  const seed = async () => {
    const s = sampleData();
    await Promise.all([
      supabase
        .from("creator_jobs")
        .insert(s.jobs.map((j) => ({ ...j, user_id: userId }))),
      supabase
        .from("creator_snapshots")
        .insert(s.snapshots.map((x) => ({ ...x, user_id: userId }))),
      supabase
        .from("creator_links")
        .insert(s.links.map((x) => ({ ...x, user_id: userId }))),
    ]);
    await loadAll(userId);
  };
  const resetAll = async () => {
    if (!confirm("Hapus semua data?")) return;
    await Promise.all([
      supabase.from("creator_jobs").delete().eq("user_id", userId),
      supabase.from("creator_snapshots").delete().eq("user_id", userId),
      supabase.from("creator_links").delete().eq("user_id", userId),
      supabase.from("creator_freelance_links").delete().eq("user_id", userId),
    ]);
    setJobs([]);
    setSnapshots([]);
    setLinks([]);
    setFreelanceLinks([]);
  };

  const money = (n) => `${currency} ${grp(n)}`;
  const latest = snapshots[snapshots.length - 1] || null;
  const prev = snapshots[snapshots.length - 2] || null;
  const totalReach = latest
    ? PLATFORM_KEYS.reduce((s, k) => s + (Number(latest[k]) || 0), 0)
    : 0;
  const reachDelta =
    latest && prev
      ? totalReach -
        PLATFORM_KEYS.reduce((s, k) => s + (Number(prev[k]) || 0), 0)
      : 0;
  const earned = jobs
    .filter((j) => j.status === "paid")
    .reduce((s, j) => s + Number(j.value), 0);
  const pipeline = jobs
    .filter((j) => j.status !== "paid")
    .reduce((s, j) => s + Number(j.value), 0);
  const activeJobs = jobs.filter((j) => j.status !== "paid").length;

  const TABS = [
    ["overview", "Ringkasan"],
    ["calendar", "Kalender Konten"],
    ["links", "Link Affiliate"],
    ["freelance", "Profil Freelance"],
    ["jobs", "Job Affiliate"],
    ["social", "Sosial Media"],
  ];

  if (loading)
    return (
      <div style={{ padding: 40, textAlign: "center", color: "var(--text-3)" }}>
        Memuat…
      </div>
    );

  return (
    <div style={{ color: "var(--text)" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 20,
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div>
          <h1
            style={{
              fontSize: 22,
              fontWeight: 700,
              margin: 0,
              letterSpacing: "-.02em",
            }}
          >
            Creator Desk
          </h1>
          <p style={{ fontSize: 13, color: "var(--text-3)", marginTop: 4 }}>
            Job affiliate & pertumbuhan sosial
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <select
            value={currency}
            onChange={(e) => saveCurrency(e.target.value)}
            style={{ ...S.input, width: "auto", padding: "8px 12px" }}
          >
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Tabs */}
      <div
        style={{
          display: "flex",
          gap: 4,
          background: "var(--surface-2)",
          border: "1px solid var(--border)",
          borderRadius: 14,
          padding: 4,
          marginBottom: 20,
          overflowX: "auto",
          width: "fit-content",
          maxWidth: "100%",
        }}
      >
        {TABS.map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            style={{
              flex: "0 0 auto",
              border: "none",
              padding: "8px 16px",
              borderRadius: 10,
              fontSize: 13,
              fontWeight: 500,
              cursor: "pointer",
              whiteSpace: "nowrap",
              transition: ".15s",
              background: tab === id ? "var(--surface)" : "transparent",
              color: tab === id ? "var(--text)" : "var(--text-3)",
              boxShadow: tab === id ? "var(--shadow-sm)" : "none",
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <Overview
          latest={latest}
          totalReach={totalReach}
          reachDelta={reachDelta}
          snapshots={snapshots}
          jobs={jobs}
          links={links}
          money={money}
          earned={earned}
          pipeline={pipeline}
          activeJobs={activeJobs}
          onSeed={seed}
          goTo={setTab}
        />
      )}
      {tab === "calendar" && <ContentCalendar userId={userId} />}
      {tab === "links" && (
        <LinksTab
          links={links}
          onAdd={addLink}
          onUpdate={updateLink}
          onRemove={removeLink}
          title="Tambah link affiliate"
          listTitle="Program affiliate kamu"
          placeholder="misal: Micro1"
          emptyText="Tambahkan link affiliate (Micro1, Mercor, dll) — nanti jadi kotak klik langsung."
        />
      )}
      {tab === "freelance" && (
        <LinksTab
          links={freelanceLinks}
          onAdd={addFLink}
          onUpdate={updateFLink}
          onRemove={removeFLink}
          title="Tambah profil freelance"
          listTitle="Profil freelance kamu"
          placeholder="misal: Upwork"
          emptyText="Tambahkan profil freelance-mu (Upwork, Fiverr, portfolio, LinkedIn, dll)."
        />
      )}
      {tab === "jobs" && (
        <JobsTab
          jobs={jobs}
          onAdd={addJob}
          onUpdateStatus={updateJobStatus}
          onRemove={removeJob}
          money={money}
          earned={earned}
          pipeline={pipeline}
        />
      )}
      {tab === "social" && (
        <SocialTab
          snapshots={snapshots}
          onAdd={addSnapshot}
          onRemove={removeSnapshot}
          latest={latest}
          prev={prev}
        />
      )}

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginTop: 24,
          paddingTop: 16,
          borderTop: "1px solid var(--border)",
          fontSize: 12,
          color: "var(--text-3)",
          flexWrap: "wrap",
          gap: 8,
        }}
      >
        <span>Data tersimpan di akunmu (sinkron semua device).</span>
        {(jobs.length > 0 || snapshots.length > 0 || links.length > 0) && (
          <button
            onClick={resetAll}
            style={{
              ...S.btnGhost,
              fontSize: 12,
              padding: "6px 12px",
              color: "var(--red)",
            }}
          >
            <RotateCcw size={13} /> Reset semua
          </button>
        )}
      </div>
    </div>
  );
}

/* ══ OVERVIEW ══ */
function Overview({
  latest,
  totalReach,
  reachDelta,
  snapshots,
  jobs,
  links,
  money,
  earned,
  pipeline,
  activeJobs,
  onSeed,
  goTo,
}) {
  const chartData = useMemo(
    () =>
      snapshots.map((s) => {
        const r = { date: String(s.date).slice(5) };
        PLATFORM_KEYS.forEach((k) => {
          r[PLATFORMS[k].label] = Number(s[k]) || 0;
        });
        return r;
      }),
    [snapshots],
  );
  const byType = useMemo(
    () =>
      Object.entries(JOB_TYPES).map(([t, v]) => ({
        type: v.label,
        color: v.color,
        count: jobs.filter((j) => j.type === t).length,
      })),
    [jobs],
  );
  const empty =
    jobs.length === 0 && snapshots.length === 0 && links.length === 0;

  if (empty)
    return (
      <div style={{ ...S.card, padding: 40, textAlign: "center" }}>
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: 16,
            background: "rgba(79,120,255,.1)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 16px",
          }}
        >
          <Users size={24} color="#4F78FF" />
        </div>
        <h3 style={{ margin: "0 0 8px", fontSize: 18, fontWeight: 700 }}>
          Belum ada data
        </h3>
        <p
          style={{
            color: "var(--text-3)",
            fontSize: 14,
            marginBottom: 20,
            maxWidth: 360,
            marginLeft: "auto",
            marginRight: "auto",
          }}
        >
          Tambahkan job affiliate pertamamu atau catat followers hari ini.
        </p>
        <div
          style={{
            display: "flex",
            gap: 8,
            justifyContent: "center",
            flexWrap: "wrap",
          }}
        >
          <button onClick={() => goTo("jobs")} style={S.btnPrimary}>
            <Plus size={15} /> Tambah job
          </button>
          <button onClick={() => goTo("social")} style={S.btnGhost}>
            <Users size={15} /> Catat followers
          </button>
        </div>
        <button
          onClick={onSeed}
          style={{
            marginTop: 16,
            background: "none",
            border: "none",
            color: "var(--brand-from)",
            fontSize: 13,
            cursor: "pointer",
            textDecoration: "underline",
          }}
        >
          atau muat data contoh →
        </button>
      </div>
    );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Hero reach */}
      <div
        style={{
          ...S.card,
          background: "linear-gradient(135deg,#4F78FF,#7C5CFC)",
          padding: 24,
          color: "#fff",
        }}
      >
        <p
          style={{
            fontSize: 11,
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: ".08em",
            opacity: 0.7,
          }}
        >
          Total Reach
        </p>
        <p
          style={{
            fontSize: 42,
            fontWeight: 700,
            margin: "4px 0 8px",
            letterSpacing: "-.02em",
          }}
        >
          {grp(totalReach)}
        </p>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontSize: 13,
          }}
        >
          {reachDelta > 0 ? (
            <TrendingUp size={14} />
          ) : reachDelta < 0 ? (
            <TrendingDown size={14} />
          ) : (
            <Minus size={14} />
          )}
          <span style={{ opacity: 0.8 }}>
            {reachDelta === 0
              ? "—"
              : (reachDelta > 0 ? "+" : "") + grp(reachDelta)}{" "}
            sejak update terakhir
          </span>
        </div>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "6px 16px",
            marginTop: 16,
          }}
        >
          {PLATFORM_KEYS.map((k) => (
            <div
              key={k}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                fontSize: 13,
              }}
            >
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: PLATFORMS[k].color,
                  flexShrink: 0,
                }}
              />
              <span style={{ opacity: 0.7 }}>{PLATFORMS[k].label}</span>
              <span style={{ fontWeight: 600 }}>
                {latest ? grp(latest[k]) : "—"}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* KPIs */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3,1fr)",
          gap: 12,
        }}
      >
        <KpiCard
          icon={<Briefcase size={16} />}
          label="Job aktif"
          value={String(activeJobs)}
          color="#4F78FF"
        />
        <KpiCard
          icon={<Wallet size={16} />}
          label="Sudah cair"
          value={money(earned)}
          color="#22C55E"
        />
        <KpiCard
          icon={<TrendingUp size={16} />}
          label="Pipeline"
          value={money(pipeline)}
          color="#F59E0B"
        />
      </div>

      {/* Affiliate links */}
      {links.length > 0 && (
        <div style={{ ...S.card, padding: 20 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 14,
            }}
          >
            <p style={{ fontWeight: 600, fontSize: 15, margin: 0 }}>
              Program Affiliate
            </p>
            <button
              onClick={() => goTo("links")}
              style={{
                background: "none",
                border: "none",
                color: "var(--brand-from)",
                fontSize: 12,
                cursor: "pointer",
                fontWeight: 500,
              }}
            >
              Kelola →
            </button>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill,minmax(140px,1fr))",
              gap: 10,
            }}
          >
            {links.map((l) => (
              <LinkTile key={l.id} link={l} />
            ))}
          </div>
        </div>
      )}

      {/* Growth chart */}
      <div style={{ ...S.card, padding: 20 }}>
        <p style={{ fontWeight: 600, fontSize: 15, margin: "0 0 4px" }}>
          Pertumbuhan Followers
        </p>
        <p style={{ fontSize: 12, color: "var(--text-3)", marginBottom: 14 }}>
          {snapshots.length} catatan
        </p>
        {snapshots.length < 2 ? (
          <p style={{ color: "var(--text-3)", fontSize: 13 }}>
            Catat minimal 2 kali di tab Sosial Media untuk melihat grafik.
          </p>
        ) : (
          <>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "6px 14px",
                marginBottom: 12,
              }}
            >
              {PLATFORM_KEYS.map((k) => (
                <span
                  key={k}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                    fontSize: 12,
                    color: "var(--text-2)",
                  }}
                >
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: PLATFORMS[k].color,
                    }}
                  />
                  {PLATFORMS[k].label}
                </span>
              ))}
            </div>
            <div style={{ width: "100%", height: 220 }}>
              <ResponsiveContainer>
                <LineChart
                  data={chartData}
                  margin={{ top: 8, right: 8, left: -12, bottom: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="var(--border)"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="date"
                    stroke="var(--text-3)"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="var(--text-3)"
                    fontSize={11}
                    tickFormatter={compact}
                    tickLine={false}
                    axisLine={false}
                    width={40}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "var(--surface)",
                      border: "1px solid var(--border)",
                      borderRadius: 12,
                      fontSize: 12,
                      color: "var(--text)",
                    }}
                    formatter={(v) => grp(v)}
                  />
                  {PLATFORM_KEYS.map((k) => (
                    <Line
                      key={k}
                      type="monotone"
                      dataKey={PLATFORMS[k].label}
                      stroke={PLATFORMS[k].color}
                      strokeWidth={2}
                      dot={false}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
      </div>

      {/* Bottom row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div style={{ ...S.card, padding: 20 }}>
          <p style={{ fontWeight: 600, fontSize: 15, margin: "0 0 14px" }}>
            Job per Tipe
          </p>
          {jobs.length === 0 ? (
            <p style={{ color: "var(--text-3)", fontSize: 13 }}>
              Belum ada job.
            </p>
          ) : (
            <div style={{ width: "100%", height: 160 }}>
              <ResponsiveContainer>
                <BarChart
                  data={byType}
                  margin={{ top: 8, right: 8, left: -18, bottom: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="var(--border)"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="type"
                    stroke="var(--text-3)"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="var(--text-3)"
                    fontSize={11}
                    allowDecimals={false}
                    tickLine={false}
                    axisLine={false}
                    width={24}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "var(--surface)",
                      border: "1px solid var(--border)",
                      borderRadius: 12,
                      fontSize: 12,
                    }}
                    cursor={{ fill: "rgba(79,120,255,.04)" }}
                  />
                  <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                    {byType.map((d, i) => (
                      <Cell key={i} fill={d.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div style={{ ...S.card, padding: 20 }}>
          <p style={{ fontWeight: 600, fontSize: 15, margin: "0 0 14px" }}>
            Job Terbaru
          </p>
          {jobs.length === 0 ? (
            <p style={{ color: "var(--text-3)", fontSize: 13 }}>
              Belum ada job.
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[...jobs]
                .slice(-4)
                .reverse()
                .map((j) => (
                  <div
                    key={j.id}
                    style={{ display: "flex", alignItems: "center", gap: 8 }}
                  >
                    <span
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        background: JOB_TYPES[j.type]?.color,
                        flexShrink: 0,
                      }}
                    />
                    <span
                      style={{
                        flex: 1,
                        fontSize: 13,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {j.brand}
                    </span>
                    <span
                      style={S.badge(
                        STATUSES[j.status].color,
                        STATUSES[j.status].bg,
                      )}
                    >
                      {STATUSES[j.status].label}
                    </span>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function KpiCard({ icon, label, value, color }) {
  return (
    <div style={{ ...S.card, padding: 16 }}>
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 10,
          background: `${color}18`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color,
          marginBottom: 10,
        }}
      >
        {icon}
      </div>
      <p
        style={{
          fontSize: 11,
          color: "var(--text-3)",
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: ".06em",
          margin: "0 0 4px",
        }}
      >
        {label}
      </p>
      <p
        style={{
          fontSize: 16,
          fontWeight: 700,
          margin: 0,
          letterSpacing: "-.01em",
        }}
      >
        {value}
      </p>
    </div>
  );
}

/* ══ JOBS TAB ══ */
function JobsTab({
  jobs,
  onAdd,
  onUpdateStatus,
  onRemove,
  money,
  earned,
  pipeline,
}) {
  const [tf, setTf] = useState("all");
  const [sf, setSf] = useState("all");
  const blank = () => ({
    brand: "",
    type: "remote",
    status: "ongoing",
    value: "",
    platform: "",
    deadline: "",
    notes: "",
  });
  const [form, setForm] = useState(blank());
  const filtered = jobs.filter(
    (j) => (tf === "all" || j.type === tf) && (sf === "all" || j.status === sf),
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Form */}
      <div style={{ ...S.card, padding: 20 }}>
        <p style={{ fontWeight: 600, fontSize: 15, margin: "0 0 16px" }}>
          Tambah Job Baru
        </p>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2,1fr)",
            gap: 10,
          }}
        >
          <div style={{ gridColumn: "1/-1" }}>
            <label style={S.label}>Brand / Klien</label>
            <input
              style={S.input}
              value={form.brand}
              onChange={(e) => setForm({ ...form, brand: e.target.value })}
              placeholder="misal: Skintella Serum"
            />
          </div>
          <div>
            <label style={S.label}>Tipe</label>
            <select
              style={S.input}
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
            >
              {Object.entries(JOB_TYPES).map(([k, v]) => (
                <option key={k} value={k}>
                  {v.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label style={S.label}>Status</label>
            <select
              style={S.input}
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
            >
              {Object.entries(STATUSES).map(([k, v]) => (
                <option key={k} value={k}>
                  {v.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label style={S.label}>Nilai / Fee</label>
            <input
              type="number"
              style={S.input}
              value={form.value}
              onChange={(e) => setForm({ ...form, value: e.target.value })}
              placeholder="0"
            />
          </div>
          <div>
            <label style={S.label}>Platform</label>
            <select
              style={S.input}
              value={form.platform}
              onChange={(e) => setForm({ ...form, platform: e.target.value })}
            >
              <option value="">—</option>
              {Object.entries(PLATFORMS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v.label}
                </option>
              ))}
              <option value="other">Lainnya</option>
            </select>
          </div>
          <div>
            <label style={S.label}>Deadline</label>
            <input
              type="date"
              style={S.input}
              value={form.deadline}
              onChange={(e) => setForm({ ...form, deadline: e.target.value })}
            />
          </div>
          <div style={{ gridColumn: "1/-1" }}>
            <label style={S.label}>Catatan</label>
            <input
              style={S.input}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="deliverable, komisi %, dll"
            />
          </div>
        </div>
        <button
          onClick={async () => {
            if (!form.brand.trim()) return;
            await onAdd(form);
            setForm(blank());
          }}
          style={{ ...S.btnPrimary, marginTop: 12 }}
        >
          <Plus size={15} /> Simpan Job
        </button>
      </div>

      {/* Summary */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3,1fr)",
          gap: 12,
        }}
      >
        <KpiCard
          icon={<Briefcase size={16} />}
          label="Total job"
          value={String(jobs.length)}
          color="#4F78FF"
        />
        <KpiCard
          icon={<Wallet size={16} />}
          label="Sudah cair"
          value={money(earned)}
          color="#22C55E"
        />
        <KpiCard
          icon={<TrendingUp size={16} />}
          label="Pipeline"
          value={money(pipeline)}
          color="#F59E0B"
        />
      </div>

      {/* Filters + list */}
      <div style={{ ...S.card, padding: 20 }}>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 8,
            marginBottom: 16,
            alignItems: "center",
          }}
        >
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
            {[
              ["all", "Semua"],
              ...Object.entries(JOB_TYPES).map(([k, v]) => [k, v.label]),
            ].map(([k, label]) => (
              <button
                key={k}
                onClick={() => setTf(k)}
                style={{
                  ...S.btnGhost,
                  padding: "5px 12px",
                  fontSize: 12,
                  background:
                    tf === k
                      ? "linear-gradient(135deg,#4F78FF,#7C5CFC)"
                      : "var(--surface-2)",
                  color: tf === k ? "#fff" : "var(--text-2)",
                  border: tf === k ? "none" : "1.5px solid var(--border)",
                }}
              >
                {label}
              </button>
            ))}
          </div>
          <select
            value={sf}
            onChange={(e) => setSf(e.target.value)}
            style={{
              ...S.input,
              width: "auto",
              padding: "6px 10px",
              fontSize: 12,
            }}
          >
            <option value="all">Semua status</option>
            {Object.entries(STATUSES).map(([k, v]) => (
              <option key={k} value={k}>
                {v.label}
              </option>
            ))}
          </select>
        </div>

        {filtered.length === 0 ? (
          <p style={{ color: "var(--text-3)", fontSize: 13 }}>
            {jobs.length === 0
              ? "Belum ada job."
              : "Tidak ada yang cocok dengan filter."}
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {filtered.map((j) => {
              const T = JOB_TYPES[j.type];
              return (
                <div
                  key={j.id}
                  style={{
                    ...S.card2,
                    padding: "12px 14px",
                    display: "flex",
                    gap: 12,
                    alignItems: "center",
                  }}
                >
                  <div
                    style={{
                      width: 4,
                      alignSelf: "stretch",
                      borderRadius: 4,
                      background: T.color,
                      flexShrink: 0,
                    }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        flexWrap: "wrap",
                      }}
                    >
                      <span style={{ fontWeight: 600, fontSize: 14 }}>
                        {j.brand}
                      </span>
                      <span style={S.badge(T.color, `${T.color}18`)}>
                        {T.label}
                      </span>
                      {j.platform && PLATFORMS[j.platform] && (
                        <span
                          style={S.badge(
                            PLATFORMS[j.platform].color,
                            `${PLATFORMS[j.platform].color}18`,
                          )}
                        >
                          {PLATFORMS[j.platform].label}
                        </span>
                      )}
                    </div>
                    {(j.deadline || j.notes) && (
                      <div
                        style={{
                          fontSize: 12,
                          color: "var(--text-3)",
                          marginTop: 4,
                          display: "flex",
                          gap: 12,
                        }}
                      >
                        {j.deadline && <span>⏱ {j.deadline}</span>}
                        {j.notes && <span>{j.notes}</span>}
                      </div>
                    )}
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      flexShrink: 0,
                    }}
                  >
                    <span style={{ fontWeight: 700, fontSize: 13 }}>
                      {money(j.value)}
                    </span>
                    <select
                      value={j.status}
                      onChange={(e) => onUpdateStatus(j.id, e.target.value)}
                      style={{
                        ...S.input,
                        width: "auto",
                        padding: "4px 8px",
                        fontSize: 11,
                        fontWeight: 600,
                        color: STATUSES[j.status].color,
                      }}
                    >
                      {Object.entries(STATUSES).map(([k, v]) => (
                        <option key={k} value={k}>
                          {v.label}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={() => onRemove(j.id)}
                      style={{ ...S.iconBtn, color: "var(--red)" }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

/* ══ SOCIAL TAB ══ */
function SocialTab({ snapshots, onAdd, onRemove, latest, prev }) {
  const blank = () => {
    const o = { date: todayStr() };
    PLATFORM_KEYS.forEach((k) => {
      o[k] = "";
    });
    return o;
  };
  const [form, setForm] = useState(blank);
  const chartData = snapshots.map((s) => {
    const r = { date: String(s.date).slice(5) };
    PLATFORM_KEYS.forEach((k) => {
      r[PLATFORMS[k].label] = Number(s[k]) || 0;
    });
    return r;
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Form */}
      <div style={{ ...S.card, padding: 20 }}>
        <p style={{ fontWeight: 600, fontSize: 15, margin: "0 0 16px" }}>
          Catat Followers Hari Ini
        </p>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2,1fr)",
            gap: 10,
          }}
        >
          <div style={{ gridColumn: "1/-1" }}>
            <label style={S.label}>Tanggal</label>
            <input
              type="date"
              style={S.input}
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
            />
          </div>
          {PLATFORM_KEYS.map((k) => {
            const P = PLATFORMS[k];
            return (
              <div key={k}>
                <label
                  style={{
                    ...S.label,
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                  }}
                >
                  <P.Icon size={12} color={P.color} />
                  {P.label}
                </label>
                <input
                  type="number"
                  style={S.input}
                  value={form[k]}
                  placeholder={latest ? grp(latest[k]) : "0"}
                  onChange={(e) => setForm({ ...form, [k]: e.target.value })}
                />
              </div>
            );
          })}
        </div>
        <button
          onClick={async () => {
            if (PLATFORM_KEYS.every((k) => !form[k])) return;
            const s = { date: form.date || todayStr() };
            PLATFORM_KEYS.forEach((k) => {
              s[k] = Number(form[k]) || 0;
            });
            await onAdd(s);
            setForm(blank());
          }}
          style={{ ...S.btnPrimary, marginTop: 12 }}
        >
          <Plus size={15} /> Simpan Catatan
        </button>
        <p style={{ fontSize: 12, color: "var(--text-3)", marginTop: 10 }}>
          Angka followers dimasukkan manual. Isi rutin biar grafik terbentuk.
        </p>
      </div>

      {/* Platform cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2,1fr)",
          gap: 12,
        }}
      >
        {PLATFORM_KEYS.map((k) => {
          const P = PLATFORMS[k];
          const cur = latest ? Number(latest[k]) || 0 : 0;
          const pre = prev ? Number(prev[k]) || 0 : 0;
          const d = latest && prev ? cur - pre : 0;
          return (
            <div key={k} style={{ ...S.card, padding: 16 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 8,
                }}
              >
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 10,
                    background: `${P.color}18`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: P.color,
                  }}
                >
                  <P.Icon size={16} />
                </div>
                <span style={{ fontWeight: 600, fontSize: 13 }}>{P.label}</span>
              </div>
              <p
                style={{
                  fontSize: 22,
                  fontWeight: 700,
                  margin: "0 0 4px",
                  letterSpacing: "-.01em",
                }}
              >
                {latest ? grp(cur) : "—"}
              </p>
              <span
                style={{
                  fontSize: 12,
                  color:
                    d > 0
                      ? "var(--green)"
                      : d < 0
                        ? "var(--red)"
                        : "var(--text-3)",
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                {d > 0 ? (
                  <TrendingUp size={12} />
                ) : d < 0 ? (
                  <TrendingDown size={12} />
                ) : (
                  <Minus size={12} />
                )}
                {d === 0 ? "—" : (d > 0 ? "+" : "") + grp(d)} terakhir
              </span>
            </div>
          );
        })}
      </div>

      {/* Chart */}
      <div style={{ ...S.card, padding: 20 }}>
        <p style={{ fontWeight: 600, fontSize: 15, margin: "0 0 14px" }}>
          Grafik Pertumbuhan
        </p>
        {snapshots.length < 2 ? (
          <p style={{ color: "var(--text-3)", fontSize: 13 }}>
            Butuh minimal 2 catatan untuk grafik.
          </p>
        ) : (
          <div style={{ width: "100%", height: 240 }}>
            <ResponsiveContainer>
              <LineChart
                data={chartData}
                margin={{ top: 8, right: 8, left: -12, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--border)"
                  vertical={false}
                />
                <XAxis
                  dataKey="date"
                  stroke="var(--text-3)"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="var(--text-3)"
                  fontSize={11}
                  tickFormatter={compact}
                  tickLine={false}
                  axisLine={false}
                  width={40}
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    borderRadius: 12,
                    fontSize: 12,
                    color: "var(--text)",
                  }}
                  formatter={(v) => grp(v)}
                />
                {PLATFORM_KEYS.map((k) => (
                  <Line
                    key={k}
                    type="monotone"
                    dataKey={PLATFORMS[k].label}
                    stroke={PLATFORMS[k].color}
                    strokeWidth={2}
                    dot={{ r: 2 }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* History */}
      {snapshots.length > 0 && (
        <div style={{ ...S.card, padding: 20 }}>
          <p style={{ fontWeight: 600, fontSize: 15, margin: "0 0 14px" }}>
            Riwayat Catatan
          </p>
          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: 13,
              }}
            >
              <thead>
                <tr
                  style={{
                    color: "var(--text-3)",
                    fontSize: 11,
                    textTransform: "uppercase",
                    letterSpacing: ".05em",
                  }}
                >
                  <th
                    style={{
                      textAlign: "left",
                      paddingBottom: 10,
                      fontWeight: 600,
                    }}
                  >
                    Tanggal
                  </th>
                  {PLATFORM_KEYS.map((k) => (
                    <th
                      key={k}
                      style={{
                        textAlign: "right",
                        paddingBottom: 10,
                        fontWeight: 600,
                      }}
                    >
                      {PLATFORMS[k].label}
                    </th>
                  ))}
                  <th />
                </tr>
              </thead>
              <tbody>
                {[...snapshots].reverse().map((s) => (
                  <tr
                    key={s.id}
                    style={{ borderTop: "1px solid var(--border)" }}
                  >
                    <td style={{ padding: "10px 0", color: "var(--text-2)" }}>
                      {s.date}
                    </td>
                    {PLATFORM_KEYS.map((k) => (
                      <td
                        key={k}
                        style={{
                          textAlign: "right",
                          padding: "10px 0 10px 8px",
                          fontWeight: 500,
                        }}
                      >
                        {grp(s[k])}
                      </td>
                    ))}
                    <td style={{ textAlign: "right", paddingLeft: 8 }}>
                      <button
                        onClick={() => onRemove(s.id)}
                        style={{ ...S.iconBtn, color: "var(--red)" }}
                      >
                        <X size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

/* ══ LINKS TAB (reusable) ══ */
function LinksTab({
  links,
  onAdd,
  onUpdate,
  onRemove,
  title,
  listTitle,
  placeholder,
  emptyText,
}) {
  const blank = () => ({ name: "", url: "", color: LINK_COLORS[0] });
  const [form, setForm] = useState(blank);
  const [editId, setEditId] = useState(null);

  function normUrl(u) {
    u = u.trim();
    if (!u) return "";
    if (!/^https?:\/\//i.test(u)) u = "https://" + u;
    return u;
  }
  async function submit() {
    if (!form.name.trim() || !form.url.trim()) return;
    const url = normUrl(form.url);
    if (editId) {
      await onUpdate(editId, {
        name: form.name.trim(),
        url,
        color: form.color,
      });
    } else {
      await onAdd({ name: form.name.trim(), url, color: form.color });
    }
    setForm(blank());
    setEditId(null);
  }
  function edit(l) {
    setEditId(l.id);
    setForm({ name: l.name, url: l.url, color: l.color });
  }
  function del(id) {
    if (editId === id) {
      setEditId(null);
      setForm(blank());
    }
    onRemove(id);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ ...S.card, padding: 20 }}>
        <p style={{ fontWeight: 600, fontSize: 15, margin: "0 0 16px" }}>
          {editId ? "Edit Link" : title}
        </p>
        <div
          style={{ display: "grid", gridTemplateColumns: "1fr 1.5fr", gap: 10 }}
        >
          <div>
            <label style={S.label}>Nama</label>
            <input
              style={S.input}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder={placeholder}
            />
          </div>
          <div>
            <label style={S.label}>Link / URL</label>
            <input
              style={S.input}
              value={form.url}
              onChange={(e) => setForm({ ...form, url: e.target.value })}
              placeholder="https://..."
            />
          </div>
        </div>
        <div style={{ marginTop: 10 }}>
          <label style={S.label}>Warna</label>
          <div
            style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 4 }}
          >
            {LINK_COLORS.map((c) => (
              <button
                key={c}
                onClick={() => setForm({ ...form, color: c })}
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 8,
                  background: c,
                  border:
                    form.color === c
                      ? "2.5px solid var(--text)"
                      : "2px solid transparent",
                  cursor: "pointer",
                  padding: 0,
                  transition: ".12s",
                  transform: form.color === c ? "scale(1.15)" : "scale(1)",
                }}
              />
            ))}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
          <button onClick={submit} style={S.btnPrimary}>
            <Plus size={15} /> {editId ? "Simpan" : "Tambah"}
          </button>
          {editId && (
            <button
              onClick={() => {
                setEditId(null);
                setForm(blank());
              }}
              style={S.btnGhost}
            >
              Batal
            </button>
          )}
        </div>
      </div>

      <div style={{ ...S.card, padding: 20 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 16,
          }}
        >
          <p style={{ fontWeight: 600, fontSize: 15, margin: 0 }}>
            {listTitle}
          </p>
          <span style={{ fontSize: 12, color: "var(--text-3)" }}>
            {links.length} link
          </span>
        </div>
        {links.length === 0 ? (
          <div style={{ textAlign: "center", padding: "24px 0" }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 14,
                background: "rgba(79,120,255,.1)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 12px",
              }}
            >
              <Rocket size={20} color="#4F78FF" />
            </div>
            <p
              style={{
                color: "var(--text-3)",
                fontSize: 13,
                maxWidth: 340,
                margin: "0 auto",
              }}
            >
              {emptyText}
            </p>
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill,minmax(140px,1fr))",
              gap: 10,
            }}
          >
            {links.map((l) => (
              <LinkTile key={l.id} link={l} onEdit={edit} onDelete={del} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ══ LINK TILE ══ */
function LinkTile({ link, onEdit, onDelete }) {
  let host = link.url;
  try {
    host = new URL(link.url).hostname.replace(/^www\./, "");
  } catch (e) {}
  return (
    <div style={{ position: "relative", borderRadius: 14 }}>
      <a
        href={link.url}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 4,
          background: "var(--surface-2)",
          border: "1px solid var(--border)",
          borderRadius: 14,
          padding: "14px 12px",
          textDecoration: "none",
          color: "var(--text)",
          transition: ".16s",
        }}
      >
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: 10,
            background: link.color,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 700,
            fontSize: 16,
            color: "#fff",
            marginBottom: 6,
          }}
        >
          {(link.name[0] || "?").toUpperCase()}
        </div>
        <span
          style={{
            fontWeight: 600,
            fontSize: 13,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {link.name}
        </span>
        <span
          style={{
            fontSize: 11,
            color: "var(--text-3)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {host}
        </span>
        <ExternalLink
          size={13}
          style={{
            position: "absolute",
            bottom: 12,
            right: 12,
            color: "var(--text-3)",
          }}
        />
      </a>
      {(onEdit || onDelete) && (
        <div
          style={{
            position: "absolute",
            top: 8,
            right: 8,
            display: "flex",
            gap: 4,
          }}
        >
          {onEdit && (
            <button onClick={() => onEdit(link)} style={S.iconBtn}>
              <Pencil size={12} />
            </button>
          )}
          {onDelete && (
            <button
              onClick={() => onDelete(link.id)}
              style={{ ...S.iconBtn, color: "var(--red)" }}
            >
              <Trash2 size={12} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
