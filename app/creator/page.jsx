"use client";

import React, { useState, useEffect, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
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
  LayoutGrid,
  RotateCcw,
  ExternalLink,
  Pencil,
  Rocket,
} from "lucide-react";

const PLATFORMS = {
  ig: { label: "Instagram", color: "#E1306C", Icon: Camera },
  tiktok: { label: "TikTok", color: "#25F4EE", Icon: Music2 },
  threads: { label: "Threads", color: "#C6C6D2", Icon: AtSign },
  youtube: { label: "YouTube", color: "#FF3B30", Icon: Play },
  telegram: { label: "Telegram", color: "#3FA9E0", Icon: Send },
};
const PLATFORM_KEYS = ["ig", "tiktok", "threads", "youtube", "telegram"];

const JOB_TYPES = {
  onsite: { label: "Onsite", color: "#F5A623", Icon: MapPin },
  freelance: { label: "Freelance", color: "#8B7CFF", Icon: Briefcase },
  remote: { label: "Remote", color: "#34D399", Icon: Laptop },
};
const STATUSES = {
  ongoing: { label: "Jalan", color: "#8B7CFF" },
  pending: { label: "Nunggu bayar", color: "#F5A623" },
  paid: { label: "Lunas", color: "#34D399" },
};
const CURRENCIES = ["Rp", "$", "€", "£"];

const today = () => new Date().toISOString().slice(0, 10);
const grp = (n) => (Number(n) || 0).toLocaleString("id-ID");
const compact = (n) => {
  const v = Number(n) || 0;
  if (v >= 1e6) return (v / 1e6).toFixed(v % 1e6 === 0 ? 0 : 1) + "M";
  if (v >= 1e3) return (v / 1e3).toFixed(v % 1e3 === 0 ? 0 : 1) + "K";
  return String(v);
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
  const igv = [8200, 9100, 10400, 11800, 13200, 14650];
  const ttv = [15400, 18200, 21000, 26500, 31200, 35800];
  const thv = [1200, 1900, 2600, 3400, 4500, 5300];
  const ytv = [3400, 3800, 4200, 4900, 5600, 6250];
  const tgv = [600, 850, 1050, 1400, 1750, 2100];
  const snapshots = days.map((d, i) => ({
    date: d,
    ig: igv[i],
    tiktok: ttv[i],
    threads: thv[i],
    youtube: ytv[i],
    telegram: tgv[i],
  }));
  const links = [
    { name: "Micro1", url: "https://www.micro1.ai", color: "#8B7CFF" },
    { name: "Mercor", url: "https://www.mercor.com", color: "#34D399" },
    {
      name: "Fiverr Affiliates",
      url: "https://affiliates.fiverr.com",
      color: "#F5A623",
    },
  ];
  return { jobs, snapshots, links };
}

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

  /* --- row-level handlers (Supabase) --- */
  async function addJob(form) {
    const { data: row, error } = await supabase
      .from("creator_jobs")
      .insert({
        user_id: userId,
        brand: form.brand.trim(),
        type: form.type,
        status: form.status,
        value: Number(form.value) || 0,
        platform: form.platform || null,
        deadline: form.deadline || null,
        notes: form.notes || null,
      })
      .select()
      .single();
    if (error) return alert("Gagal: " + error.message);
    setJobs((j) => [...j, row]);
  }
  async function updateJobStatus(id, status) {
    setJobs((j) => j.map((x) => (x.id === id ? { ...x, status } : x)));
    await supabase.from("creator_jobs").update({ status }).eq("id", id);
  }
  async function removeJob(id) {
    setJobs((j) => j.filter((x) => x.id !== id));
    await supabase.from("creator_jobs").delete().eq("id", id);
  }

  async function addSnapshot(snap) {
    const payload = { user_id: userId, date: snap.date };
    PLATFORM_KEYS.forEach((k) => {
      payload[k] = Number(snap[k]) || 0;
    });
    const { data: row, error } = await supabase
      .from("creator_snapshots")
      .upsert(payload, { onConflict: "user_id,date" })
      .select()
      .single();
    if (error) return alert("Gagal: " + error.message);
    setSnapshots((s) => {
      const others = s.filter((x) => x.date !== row.date);
      return [...others, row].sort((a, b) => a.date.localeCompare(b.date));
    });
  }
  async function removeSnapshot(id) {
    setSnapshots((s) => s.filter((x) => x.id !== id));
    await supabase.from("creator_snapshots").delete().eq("id", id);
  }

  async function addLink(data) {
    const { data: row, error } = await supabase
      .from("creator_links")
      .insert({
        user_id: userId,
        name: data.name,
        url: data.url,
        color: data.color,
      })
      .select()
      .single();
    if (error) return alert("Gagal: " + error.message);
    setLinks((l) => [...l, row]);
  }
  async function updateLink(id, data) {
    setLinks((l) => l.map((x) => (x.id === id ? { ...x, ...data } : x)));
    await supabase.from("creator_links").update(data).eq("id", id);
  }
  async function removeLink(id) {
    setLinks((l) => l.filter((x) => x.id !== id));
    await supabase.from("creator_links").delete().eq("id", id);
  }

  async function addFreelanceLink(data) {
    const { data: row, error } = await supabase
      .from("creator_freelance_links")
      .insert({
        user_id: userId,
        name: data.name,
        url: data.url,
        color: data.color,
      })
      .select()
      .single();
    if (error) return alert("Gagal: " + error.message);
    setFreelanceLinks((l) => [...l, row]);
  }
  async function updateFreelanceLink(id, data) {
    setFreelanceLinks((l) =>
      l.map((x) => (x.id === id ? { ...x, ...data } : x)),
    );
    await supabase.from("creator_freelance_links").update(data).eq("id", id);
  }
  async function removeFreelanceLink(id) {
    setFreelanceLinks((l) => l.filter((x) => x.id !== id));
    await supabase.from("creator_freelance_links").delete().eq("id", id);
  }

  async function setCurrencyValue(c) {
    setCurrency(c);
    await supabase
      .from("creator_settings")
      .upsert({ user_id: userId, currency: c });
  }

  async function seed() {
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
  }

  async function resetAll() {
    if (
      !confirm(
        "Hapus semua data job, followers & link? Tindakan ini tidak bisa dibatalkan.",
      )
    )
      return;
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
  }

  const money = (n) => `${currency} ${grp(n)}`;

  const latest = snapshots[snapshots.length - 1] || null;
  const prev = snapshots[snapshots.length - 2] || null;
  const totalReach = latest
    ? PLATFORM_KEYS.reduce((s, k) => s + (Number(latest[k]) || 0), 0)
    : 0;
  const prevReach = prev
    ? PLATFORM_KEYS.reduce((s, k) => s + (Number(prev[k]) || 0), 0)
    : 0;
  const reachDelta = latest && prev ? totalReach - prevReach : 0;

  const earned = jobs
    .filter((j) => j.status === "paid")
    .reduce((s, j) => s + (Number(j.value) || 0), 0);
  const pipeline = jobs
    .filter((j) => j.status !== "paid")
    .reduce((s, j) => s + (Number(j.value) || 0), 0);
  const activeJobs = jobs.filter((j) => j.status !== "paid").length;

  if (loading) {
    return (
      <div
        style={{
          ...styleVars,
          minHeight: 480,
          display: "grid",
          placeItems: "center",
          background: "var(--bg)",
          color: "var(--dim)",
          fontFamily: "var(--body)",
        }}
      >
        <span>Memuat dashboard…</span>
        <StyleTag />
      </div>
    );
  }

  return (
    <div
      style={{
        ...styleVars,
        background: "var(--bg)",
        color: "var(--text)",
        fontFamily: "var(--body)",
        minHeight: "100vh",
      }}
    >
      <StyleTag />
      <div className="cd-shell">
        <header className="cd-head">
          <div className="cd-brandrow">
            <div className="cd-logo">
              <LayoutGrid size={18} />
            </div>
            <div>
              <h1 className="cd-title">Creator Desk</h1>
              <p className="cd-sub">
                Semua job affiliate & pertumbuhan sosial dalam satu tempat
              </p>
            </div>
          </div>
          <div className="cd-headtools">
            <select
              className="cd-cur"
              value={currency}
              onChange={(e) => setCurrencyValue(e.target.value)}
              aria-label="Mata uang"
            >
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </header>

        <nav className="cd-tabs" role="tablist">
          {[
            ["overview", "Ringkasan"],
            ["links", "Link Affiliate"],
            ["freelance", "Profil Freelance"],
            ["jobs", "Job Affiliate"],
            ["social", "Sosial Media"],
          ].map(([id, label]) => (
            <button
              key={id}
              role="tab"
              aria-selected={tab === id}
              className={"cd-tab" + (tab === id ? " is-active" : "")}
              onClick={() => setTab(id)}
            >
              {label}
            </button>
          ))}
        </nav>

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
        {tab === "links" && (
          <LinksTab
            links={links}
            onAdd={addLink}
            onUpdate={updateLink}
            onRemove={removeLink}
            title="Tambah link affiliate"
            listTitle="Program affiliate kamu"
            namePlaceholder="misal: Micro1"
            emptyText="Belum ada link. Tambahkan program affiliate yang kamu jalanin (Micro1, Mercor, dll) di atas — nanti muncul jadi kotak yang tinggal klik langsung ke dashboard-nya."
          />
        )}
        {tab === "freelance" && (
          <LinksTab
            links={freelanceLinks}
            onAdd={addFreelanceLink}
            onUpdate={updateFreelanceLink}
            onRemove={removeFreelanceLink}
            title="Tambah profil freelance"
            listTitle="Profil freelance kamu"
            namePlaceholder="misal: Upwork"
            emptyText="Belum ada link. Tambahkan profil freelance-mu (Upwork, Fiverr, portfolio, LinkedIn, dll) di atas — nanti muncul jadi kotak yang tinggal klik langsung ke profilnya."
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

        <footer className="cd-foot">
          <span>Data tersimpan di akunmu (sinkron di semua device).</span>
          {(jobs.length > 0 || snapshots.length > 0 || links.length > 0) && (
            <button className="cd-reset" onClick={resetAll}>
              <RotateCcw size={13} /> Reset semua
            </button>
          )}
        </footer>
      </div>
    </div>
  );
}

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
        const row = { date: String(s.date).slice(5) };
        PLATFORM_KEYS.forEach((k) => {
          row[PLATFORMS[k].label] = Number(s[k]) || 0;
        });
        return row;
      }),
    [snapshots],
  );

  const byType = useMemo(
    () =>
      Object.keys(JOB_TYPES).map((t) => ({
        type: JOB_TYPES[t].label,
        color: JOB_TYPES[t].color,
        count: jobs.filter((j) => j.type === t).length,
      })),
    [jobs],
  );

  const empty =
    jobs.length === 0 && snapshots.length === 0 && links.length === 0;

  if (empty) {
    return (
      <div className="cd-empty cd-empty--big">
        <div className="cd-glow" />
        <h2>Belum ada data — ayo mulai</h2>
        <p>
          Tambahkan job affiliate pertamamu, atau catat jumlah followers hari
          ini. Semua analisis muncul otomatis di sini.
        </p>
        <div className="cd-emptybtns">
          <button
            className="cd-btn cd-btn--primary"
            onClick={() => goTo("jobs")}
          >
            <Plus size={16} /> Tambah job
          </button>
          <button className="cd-btn" onClick={() => goTo("social")}>
            <Users size={16} /> Catat followers
          </button>
        </div>
        <button className="cd-seed" onClick={onSeed}>
          atau muat data contoh untuk lihat tampilannya →
        </button>
      </div>
    );
  }

  return (
    <div className="cd-grid">
      <section className="cd-card cd-hero" style={{ gridColumn: "1 / -1" }}>
        <div className="cd-glow" />
        <div className="cd-hero-inner">
          <div>
            <span className="cd-eyebrow">Total reach (gabungan)</span>
            <div className="cd-hero-num metric">{grp(totalReach)}</div>
            <div className="cd-hero-meta">
              <Delta value={reachDelta} suffix="sejak update terakhir" />
            </div>
          </div>
          <div className="cd-hero-platforms">
            {PLATFORM_KEYS.map((k) => {
              const P = PLATFORMS[k];
              return (
                <div key={k} className="cd-hp">
                  <span className="cd-hp-dot" style={{ background: P.color }} />
                  <span className="cd-hp-label">{P.label}</span>
                  <span className="cd-hp-val metric">
                    {latest ? grp(latest[k]) : "—"}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <Kpi
        icon={<Briefcase size={16} />}
        label="Job aktif"
        value={String(activeJobs)}
        accent="#8B7CFF"
      />
      <Kpi
        icon={<Wallet size={16} />}
        label="Sudah cair"
        value={money(earned)}
        accent="#34D399"
      />
      <Kpi
        icon={<TrendingUp size={16} />}
        label="Dalam pipeline"
        value={money(pipeline)}
        accent="#F5A623"
      />

      {links.length > 0 && (
        <section className="cd-card" style={{ gridColumn: "1 / -1" }}>
          <div className="cd-cardhead">
            <h3>Program affiliate</h3>
            <button className="cd-hintbtn" onClick={() => goTo("links")}>
              Kelola →
            </button>
          </div>
          <div className="cd-tiles">
            {links.map((l) => (
              <LinkTile key={l.id} link={l} />
            ))}
          </div>
        </section>
      )}

      <section className="cd-card" style={{ gridColumn: "1 / -1" }}>
        <div className="cd-cardhead">
          <h3>Pertumbuhan followers</h3>
          <span className="cd-hint">{snapshots.length} catatan</span>
        </div>
        {snapshots.length < 2 ? (
          <p className="cd-note">
            Catat minimal 2 kali di tab Sosial Media untuk melihat grafik
            pertumbuhan.
          </p>
        ) : (
          <>
            <Legend />
            <div style={{ width: "100%", height: 260 }}>
              <ResponsiveContainer>
                <LineChart
                  data={chartData}
                  margin={{ top: 8, right: 8, left: -12, bottom: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#26263180"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="date"
                    stroke="#6B6B7A"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="#6B6B7A"
                    fontSize={11}
                    tickFormatter={compact}
                    tickLine={false}
                    axisLine={false}
                    width={44}
                  />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(v) => grp(v)}
                  />
                  {PLATFORM_KEYS.map((k) => (
                    <Line
                      key={k}
                      type="monotone"
                      dataKey={PLATFORMS[k].label}
                      stroke={PLATFORMS[k].color}
                      strokeWidth={2.5}
                      dot={false}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
      </section>

      <section className="cd-card">
        <div className="cd-cardhead">
          <h3>Job per tipe</h3>
        </div>
        {jobs.length === 0 ? (
          <p className="cd-note">Belum ada job.</p>
        ) : (
          <div style={{ width: "100%", height: 200 }}>
            <ResponsiveContainer>
              <BarChart
                data={byType}
                margin={{ top: 8, right: 8, left: -18, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#26263180"
                  vertical={false}
                />
                <XAxis
                  dataKey="type"
                  stroke="#6B6B7A"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="#6B6B7A"
                  fontSize={11}
                  allowDecimals={false}
                  tickLine={false}
                  axisLine={false}
                  width={28}
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  cursor={{ fill: "#ffffff08" }}
                />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {byType.map((d, i) => (
                    <Cell key={i} fill={d.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      <section className="cd-card">
        <div className="cd-cardhead">
          <h3>Job terbaru</h3>
        </div>
        {jobs.length === 0 ? (
          <p className="cd-note">Belum ada job.</p>
        ) : (
          <ul className="cd-recent">
            {[...jobs]
              .slice(-5)
              .reverse()
              .map((j) => (
                <li key={j.id}>
                  <span
                    className="cd-tdot"
                    style={{ background: JOB_TYPES[j.type].color }}
                  />
                  <span className="cd-recent-name">{j.brand}</span>
                  <span
                    className="cd-badge"
                    style={{
                      color: STATUSES[j.status].color,
                      borderColor: STATUSES[j.status].color + "55",
                    }}
                  >
                    {STATUSES[j.status].label}
                  </span>
                </li>
              ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function JobsTab({
  jobs,
  onAdd,
  onUpdateStatus,
  onRemove,
  money,
  earned,
  pipeline,
}) {
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const blankJob = () => ({
    brand: "",
    type: "remote",
    status: "ongoing",
    value: "",
    platform: "",
    deadline: "",
    notes: "",
  });
  const [form, setForm] = useState(blankJob());

  async function addJob() {
    if (!form.brand.trim()) return;
    await onAdd(form);
    setForm(blankJob());
  }

  const filtered = jobs.filter(
    (j) =>
      (typeFilter === "all" || j.type === typeFilter) &&
      (statusFilter === "all" || j.status === statusFilter),
  );

  return (
    <div className="cd-grid">
      <section className="cd-card" style={{ gridColumn: "1 / -1" }}>
        <div className="cd-cardhead">
          <h3>Tambah job baru</h3>
        </div>
        <div className="cd-form">
          <label className="cd-field cd-field--wide">
            <span>Brand / klien</span>
            <input
              value={form.brand}
              onChange={(e) => setForm({ ...form, brand: e.target.value })}
              placeholder="misal: Skintella Serum"
            />
          </label>
          <label className="cd-field">
            <span>Tipe</span>
            <select
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
            >
              {Object.entries(JOB_TYPES).map(([k, v]) => (
                <option key={k} value={k}>
                  {v.label}
                </option>
              ))}
            </select>
          </label>
          <label className="cd-field">
            <span>Status</span>
            <select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
            >
              {Object.entries(STATUSES).map(([k, v]) => (
                <option key={k} value={k}>
                  {v.label}
                </option>
              ))}
            </select>
          </label>
          <label className="cd-field">
            <span>Nilai / fee</span>
            <input
              type="number"
              value={form.value}
              onChange={(e) => setForm({ ...form, value: e.target.value })}
              placeholder="0"
            />
          </label>
          <label className="cd-field">
            <span>Platform</span>
            <select
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
          </label>
          <label className="cd-field">
            <span>Deadline</span>
            <input
              type="date"
              value={form.deadline}
              onChange={(e) => setForm({ ...form, deadline: e.target.value })}
            />
          </label>
          <label className="cd-field cd-field--wide">
            <span>Catatan</span>
            <input
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="deliverable, komisi %, dll"
            />
          </label>
          <div className="cd-field cd-field--btn">
            <button className="cd-btn cd-btn--primary" onClick={addJob}>
              <Plus size={16} /> Simpan job
            </button>
          </div>
        </div>
      </section>

      <section className="cd-card" style={{ gridColumn: "1 / -1" }}>
        <div className="cd-cardhead cd-cardhead--wrap">
          <div className="cd-summ">
            <div>
              <span className="cd-summ-l">Total job</span>
              <span className="cd-summ-v metric">{jobs.length}</span>
            </div>
            <div>
              <span className="cd-summ-l">Cair</span>
              <span className="cd-summ-v metric" style={{ color: "#34D399" }}>
                {money(earned)}
              </span>
            </div>
            <div>
              <span className="cd-summ-l">Pipeline</span>
              <span className="cd-summ-v metric" style={{ color: "#F5A623" }}>
                {money(pipeline)}
              </span>
            </div>
          </div>
          <div className="cd-filters">
            <div className="cd-chipset">
              <button
                className={"cd-chip" + (typeFilter === "all" ? " on" : "")}
                onClick={() => setTypeFilter("all")}
              >
                Semua
              </button>
              {Object.entries(JOB_TYPES).map(([k, v]) => (
                <button
                  key={k}
                  className={"cd-chip" + (typeFilter === k ? " on" : "")}
                  style={
                    typeFilter === k
                      ? { borderColor: v.color, color: v.color }
                      : undefined
                  }
                  onClick={() => setTypeFilter(k)}
                >
                  {v.label}
                </button>
              ))}
            </div>
            <select
              className="cd-cur"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">Semua status</option>
              {Object.entries(STATUSES).map(([k, v]) => (
                <option key={k} value={k}>
                  {v.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {filtered.length === 0 ? (
          <p className="cd-note">
            {jobs.length === 0
              ? "Belum ada job. Tambahkan di atas."
              : "Tidak ada job yang cocok dengan filter."}
          </p>
        ) : (
          <div className="cd-joblist">
            {filtered.map((j) => {
              const T = JOB_TYPES[j.type];
              return (
                <div key={j.id} className="cd-job">
                  <span
                    className="cd-job-bar"
                    style={{ background: T.color }}
                  />
                  <div className="cd-job-main">
                    <div className="cd-job-top">
                      <span className="cd-job-brand">{j.brand}</span>
                      <span
                        className="cd-badge"
                        style={{ color: T.color, borderColor: T.color + "55" }}
                      >
                        {T.label}
                      </span>
                      {j.platform && PLATFORMS[j.platform] && (
                        <span
                          className="cd-badge"
                          style={{
                            color: PLATFORMS[j.platform].color,
                            borderColor: PLATFORMS[j.platform].color + "55",
                          }}
                        >
                          {PLATFORMS[j.platform].label}
                        </span>
                      )}
                    </div>
                    {(j.notes || j.deadline) && (
                      <div className="cd-job-meta">
                        {j.deadline && <span>⏱ {j.deadline}</span>}
                        {j.notes && <span>{j.notes}</span>}
                      </div>
                    )}
                  </div>
                  <div className="cd-job-right">
                    <span className="cd-job-val metric">{money(j.value)}</span>
                    <select
                      className="cd-statussel"
                      value={j.status}
                      onChange={(e) => onUpdateStatus(j.id, e.target.value)}
                      style={{ color: STATUSES[j.status].color }}
                    >
                      {Object.entries(STATUSES).map(([k, v]) => (
                        <option key={k} value={k}>
                          {v.label}
                        </option>
                      ))}
                    </select>
                    <button
                      className="cd-icbtn"
                      onClick={() => onRemove(j.id)}
                      aria-label="Hapus"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

function SocialTab({ snapshots, onAdd, onRemove, latest, prev }) {
  const blankSnap = () => {
    const o = { date: today() };
    PLATFORM_KEYS.forEach((k) => {
      o[k] = "";
    });
    return o;
  };
  const [form, setForm] = useState(blankSnap);

  async function addSnap() {
    if (PLATFORM_KEYS.every((k) => !form[k])) return;
    const snap = { date: form.date || today() };
    PLATFORM_KEYS.forEach((k) => {
      snap[k] = Number(form[k]) || 0;
    });
    await onAdd(snap);
    setForm(blankSnap());
  }

  const chartData = snapshots.map((s) => {
    const row = { date: String(s.date).slice(5) };
    PLATFORM_KEYS.forEach((k) => {
      row[PLATFORMS[k].label] = Number(s[k]) || 0;
    });
    return row;
  });
  const histCols = {
    display: "grid",
    gridTemplateColumns: `1.1fr repeat(${PLATFORM_KEYS.length}, minmax(0,1fr)) 34px`,
    gap: 8,
    alignItems: "center",
    minWidth: 560,
  };

  return (
    <div className="cd-grid">
      <section className="cd-card" style={{ gridColumn: "1 / -1" }}>
        <div className="cd-cardhead">
          <h3>Catat followers hari ini</h3>
          {latest && <span className="cd-hint">terakhir: {latest.date}</span>}
        </div>
        <div className="cd-form cd-form--snap">
          <label className="cd-field">
            <span>Tanggal</span>
            <input
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
            />
          </label>
          {PLATFORM_KEYS.map((k) => {
            const P = PLATFORMS[k];
            return (
              <label key={k} className="cd-field">
                <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <P.Icon size={13} color={P.color} /> {P.label}
                </span>
                <input
                  type="number"
                  value={form[k]}
                  placeholder={latest ? grp(latest[k]) : "0"}
                  onChange={(e) => setForm({ ...form, [k]: e.target.value })}
                />
              </label>
            );
          })}
          <div className="cd-field cd-field--btn">
            <button className="cd-btn cd-btn--primary" onClick={addSnap}>
              <Plus size={16} /> Simpan catatan
            </button>
          </div>
        </div>
        <p className="cd-note" style={{ marginTop: 4 }}>
          Angka followers dimasukkan manual (nggak bisa auto-sync dari
          platform). Isi rutin biar grafiknya kebentuk.
        </p>
      </section>

      {PLATFORM_KEYS.map((k) => {
        const P = PLATFORMS[k];
        const cur = latest ? Number(latest[k]) || 0 : 0;
        const pre = prev ? Number(prev[k]) || 0 : 0;
        const d = latest && prev ? cur - pre : 0;
        return (
          <section key={k} className="cd-card cd-platcard">
            <div className="cd-plat-top">
              <span
                className="cd-plat-ic"
                style={{ background: P.color + "1A", color: P.color }}
              >
                <P.Icon size={18} />
              </span>
              <span className="cd-plat-name">{P.label}</span>
            </div>
            <div className="cd-plat-num metric">{latest ? grp(cur) : "—"}</div>
            <Delta value={d} suffix="terakhir" />
          </section>
        );
      })}

      <section className="cd-card" style={{ gridColumn: "1 / -1" }}>
        <div className="cd-cardhead">
          <h3>Grafik pertumbuhan</h3>
          <span className="cd-hint">{snapshots.length} catatan</span>
        </div>
        {snapshots.length < 2 ? (
          <p className="cd-note">
            Butuh minimal 2 catatan untuk menggambar grafik.
          </p>
        ) : (
          <>
            <Legend />
            <div style={{ width: "100%", height: 280 }}>
              <ResponsiveContainer>
                <LineChart
                  data={chartData}
                  margin={{ top: 8, right: 8, left: -12, bottom: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#26263180"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="date"
                    stroke="#6B6B7A"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="#6B6B7A"
                    fontSize={11}
                    tickFormatter={compact}
                    tickLine={false}
                    axisLine={false}
                    width={44}
                  />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(v) => grp(v)}
                  />
                  {PLATFORM_KEYS.map((k) => (
                    <Line
                      key={k}
                      type="monotone"
                      dataKey={PLATFORMS[k].label}
                      stroke={PLATFORMS[k].color}
                      strokeWidth={2.5}
                      dot={{ r: 2 }}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
      </section>

      {snapshots.length > 0 && (
        <section className="cd-card" style={{ gridColumn: "1 / -1" }}>
          <div className="cd-cardhead">
            <h3>Riwayat catatan</h3>
          </div>
          <div className="cd-histwrap">
            <div className="cd-histhead" style={histCols}>
              <span>Tanggal</span>
              {PLATFORM_KEYS.map((k) => (
                <span key={k}>{PLATFORMS[k].label}</span>
              ))}
              <span></span>
            </div>
            {[...snapshots].reverse().map((s) => (
              <div key={s.id} className="cd-histrow" style={histCols}>
                <span>{s.date}</span>
                {PLATFORM_KEYS.map((k) => (
                  <span key={k} className="metric">
                    {grp(s[k])}
                  </span>
                ))}
                <button
                  className="cd-icbtn"
                  onClick={() => onRemove(s.id)}
                  aria-label="Hapus"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function Kpi({ icon, label, value, accent }) {
  return (
    <section className="cd-card cd-kpi">
      <span
        className="cd-kpi-ic"
        style={{ background: accent + "1A", color: accent }}
      >
        {icon}
      </span>
      <span className="cd-kpi-l">{label}</span>
      <span className="cd-kpi-v metric">{value}</span>
    </section>
  );
}

function Delta({ value, suffix }) {
  const up = value > 0,
    down = value < 0;
  const color = up ? "#34D399" : down ? "#F87171" : "#6B6B7A";
  const Icon = up ? TrendingUp : down ? TrendingDown : Minus;
  return (
    <span className="cd-delta" style={{ color }}>
      <Icon size={14} />
      {value === 0 ? "—" : (up ? "+" : "") + grp(value)}
      {suffix && <span className="cd-delta-sfx"> {suffix}</span>}
    </span>
  );
}

function Legend() {
  return (
    <div className="cd-legend">
      {PLATFORM_KEYS.map((k) => (
        <span key={k} className="cd-leg">
          <span
            className="cd-leg-dot"
            style={{ background: PLATFORMS[k].color }}
          />
          {PLATFORMS[k].label}
        </span>
      ))}
    </div>
  );
}

function LinkTile({ link, onEdit, onDelete }) {
  let host = link.url;
  try {
    host = new URL(link.url).hostname.replace(/^www\./, "");
  } catch (e) {
    /* keep raw */
  }
  return (
    <div className="cd-tile" style={{ "--tc": link.color }}>
      <a
        className="cd-tile-link"
        href={link.url}
        target="_blank"
        rel="noopener noreferrer"
      >
        <span className="cd-tile-avatar" style={{ background: link.color }}>
          {(link.name.trim()[0] || "?").toUpperCase()}
        </span>
        <span className="cd-tile-name">{link.name}</span>
        <span className="cd-tile-host">{host}</span>
        <ExternalLink className="cd-tile-ext" size={15} />
      </a>
      {(onEdit || onDelete) && (
        <div className="cd-tile-actions">
          {onEdit && (
            <button
              className="cd-tile-act"
              onClick={() => onEdit(link)}
              aria-label="Edit"
            >
              <Pencil size={13} />
            </button>
          )}
          {onDelete && (
            <button
              className="cd-tile-act cd-tile-act--del"
              onClick={() => onDelete(link.id)}
              aria-label="Hapus"
            >
              <Trash2 size={13} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

const LINK_COLORS = [
  "#8B7CFF",
  "#34D399",
  "#F5A623",
  "#E1306C",
  "#25F4EE",
  "#FF6B6B",
  "#4ECDC4",
  "#F78FB3",
  "#3FA9E0",
  "#FFD166",
];

function LinksTab({
  links,
  onAdd,
  onUpdate,
  onRemove,
  title,
  listTitle,
  namePlaceholder,
  emptyText,
}) {
  const blank = () => ({ name: "", url: "", color: LINK_COLORS[0] });
  const [form, setForm] = useState(blank);
  const [editingId, setEditingId] = useState(null);

  function normalizeUrl(u) {
    u = u.trim();
    if (!u) return "";
    if (!/^https?:\/\//i.test(u)) u = "https://" + u;
    return u;
  }
  async function submit() {
    if (!form.name.trim() || !form.url.trim()) return;
    const url = normalizeUrl(form.url);
    if (editingId)
      await onUpdate(editingId, {
        name: form.name.trim(),
        url,
        color: form.color,
      });
    else await onAdd({ name: form.name.trim(), url, color: form.color });
    setForm(blank());
    setEditingId(null);
  }
  function edit(l) {
    setEditingId(l.id);
    setForm({ name: l.name, url: l.url, color: l.color });
  }
  function del(id) {
    if (editingId === id) {
      setEditingId(null);
      setForm(blank());
    }
    onRemove(id);
  }

  return (
    <div className="cd-grid">
      <section className="cd-card" style={{ gridColumn: "1 / -1" }}>
        <div className="cd-cardhead">
          <h3>{editingId ? "Edit link" : title}</h3>
        </div>
        <div className="cd-form cd-form--link">
          <label className="cd-field">
            <span>Nama</span>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder={namePlaceholder}
            />
          </label>
          <label className="cd-field cd-field--wide">
            <span>Link</span>
            <input
              value={form.url}
              onChange={(e) => setForm({ ...form, url: e.target.value })}
              placeholder="https://..."
            />
          </label>
          <div className="cd-field">
            <span>Warna kotak</span>
            <div className="cd-swatches">
              {LINK_COLORS.map((c) => (
                <button
                  key={c}
                  className={"cd-sw" + (form.color === c ? " on" : "")}
                  style={{ background: c }}
                  onClick={() => setForm({ ...form, color: c })}
                  aria-label={"Warna " + c}
                />
              ))}
            </div>
          </div>
          <div className="cd-field cd-field--linkbtn">
            <button className="cd-btn cd-btn--primary" onClick={submit}>
              <Plus size={16} />{" "}
              {editingId ? "Simpan perubahan" : "Tambah kotak"}
            </button>
            {editingId && (
              <button
                className="cd-btn cd-btn--ghost"
                onClick={() => {
                  setEditingId(null);
                  setForm(blank());
                }}
              >
                Batal
              </button>
            )}
          </div>
        </div>
      </section>

      <section className="cd-card" style={{ gridColumn: "1 / -1" }}>
        <div className="cd-cardhead">
          <h3>{listTitle}</h3>
          <span className="cd-hint">{links.length} link</span>
        </div>
        {links.length === 0 ? (
          <div className="cd-empty">
            <span className="cd-empty-ic">
              <Rocket size={22} />
            </span>
            <p className="cd-note" style={{ maxWidth: 400 }}>
              {emptyText}
            </p>
          </div>
        ) : (
          <div className="cd-tiles">
            {links.map((l) => (
              <LinkTile key={l.id} link={l} onEdit={edit} onDelete={del} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

const styleVars = {
  "--bg": "#0E0E13",
  "--surface": "#17171F",
  "--surface2": "#1F1F2A",
  "--border": "#2A2A38",
  "--text": "#ECECF1",
  "--dim": "#9A9AA8",
  "--accent": "#8B7CFF",
  "--display": "'Space Grotesk', system-ui, sans-serif",
  "--body": "'Inter', system-ui, sans-serif",
};
const tooltipStyle = {
  background: "#1F1F2A",
  border: "1px solid #2A2A38",
  borderRadius: 10,
  color: "#ECECF1",
  fontSize: 12,
  fontFamily: "'Inter', sans-serif",
};

function StyleTag() {
  return (
    <style>{`
@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Inter:wght@400;500;600&display=swap');
*{box-sizing:border-box}
.metric{font-family:var(--display);font-feature-settings:"tnum";letter-spacing:-.01em}
.cd-shell{max-width:1080px;margin:0 auto;padding:26px 20px 40px}
.cd-head{display:flex;justify-content:space-between;align-items:flex-start;gap:16px;margin-bottom:22px}
.cd-brandrow{display:flex;gap:13px;align-items:center}
.cd-logo{width:38px;height:38px;border-radius:11px;display:grid;place-items:center;color:#fff;background:linear-gradient(135deg,#8B7CFF,#5B4BDB);box-shadow:0 6px 20px -8px #8B7CFF}
.cd-title{font-family:var(--display);font-weight:600;font-size:22px;margin:0;letter-spacing:-.02em}
.cd-sub{margin:2px 0 0;color:var(--dim);font-size:12.5px}
.cd-cur{background:var(--surface2);border:1px solid var(--border);color:var(--text);border-radius:9px;padding:8px 10px;font-family:var(--body);font-size:13px;cursor:pointer}
.cd-tabs{display:flex;gap:4px;background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:4px;margin-bottom:20px;width:fit-content;max-width:100%;overflow-x:auto}
.cd-tab{flex:0 0 auto;border:0;background:transparent;color:var(--dim);font-family:var(--body);font-size:13.5px;font-weight:500;padding:8px 15px;border-radius:9px;cursor:pointer;transition:.15s;white-space:nowrap}
.cd-tab:hover{color:var(--text)}
.cd-tab.is-active{background:var(--surface2);color:var(--text);box-shadow:inset 0 0 0 1px var(--border)}
.cd-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}
.cd-card{background:var(--surface);border:1px solid var(--border);border-radius:16px;padding:18px;position:relative;overflow:hidden}
.cd-cardhead{display:flex;justify-content:space-between;align-items:center;margin-bottom:14px}
.cd-cardhead--wrap{flex-wrap:wrap;gap:14px}
.cd-cardhead h3{margin:0;font-family:var(--display);font-size:15px;font-weight:600;letter-spacing:-.01em}
.cd-hint{color:var(--dim);font-size:12px}
.cd-note{color:var(--dim);font-size:13px;margin:6px 0;line-height:1.5}
.cd-eyebrow{color:var(--dim);font-size:12px;text-transform:uppercase;letter-spacing:.08em;font-weight:500}
.cd-hero{padding:24px}
.cd-glow{position:absolute;top:-60px;left:-40px;width:280px;height:280px;background:radial-gradient(circle,#8B7CFF55,transparent 68%);filter:blur(20px);pointer-events:none}
.cd-hero-inner{position:relative;display:flex;justify-content:space-between;gap:24px;flex-wrap:wrap}
.cd-hero-num{font-size:52px;font-weight:600;line-height:1.05;margin:6px 0 8px}
.cd-hero-meta{display:flex;gap:14px;align-items:center}
.cd-hero-platforms{display:flex;flex-direction:column;gap:10px;justify-content:center;min-width:190px}
.cd-hp{display:flex;align-items:center;gap:9px}
.cd-hp-dot{width:9px;height:9px;border-radius:50%;flex:0 0 auto}
.cd-hp-label{color:var(--dim);font-size:13px;flex:1}
.cd-hp-val{font-size:15px;font-weight:600}
.cd-kpi{display:flex;flex-direction:column;gap:8px}
.cd-kpi-ic{width:32px;height:32px;border-radius:9px;display:grid;place-items:center}
.cd-kpi-l{color:var(--dim);font-size:12.5px}
.cd-kpi-v{font-size:24px;font-weight:600}
.cd-delta{display:inline-flex;align-items:center;gap:5px;font-size:13px;font-weight:600;font-family:var(--display)}
.cd-delta-sfx{color:var(--dim);font-weight:400;font-family:var(--body);font-size:12px}
.cd-recent{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:10px}
.cd-recent li{display:flex;align-items:center;gap:9px}
.cd-tdot{width:8px;height:8px;border-radius:50%;flex:0 0 auto}
.cd-recent-name{flex:1;font-size:13.5px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.cd-badge{font-size:11px;font-weight:600;padding:2px 8px;border-radius:20px;border:1px solid;white-space:nowrap}
.cd-form{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}
.cd-form--snap{grid-template-columns:repeat(4,1fr)}
.cd-field{display:flex;flex-direction:column;gap:6px}
.cd-field--wide{grid-column:span 2}
.cd-field--btn{justify-content:flex-end}
.cd-field>span{color:var(--dim);font-size:12px;font-weight:500}
.cd-field input,.cd-field select{background:var(--surface2);border:1px solid var(--border);color:var(--text);border-radius:9px;padding:9px 11px;font-family:var(--body);font-size:13.5px;width:100%}
.cd-field input:focus,.cd-field select:focus{outline:2px solid var(--accent);outline-offset:0;border-color:transparent}
.cd-btn{display:inline-flex;align-items:center;justify-content:center;gap:7px;border:1px solid var(--border);background:var(--surface2);color:var(--text);font-family:var(--body);font-weight:600;font-size:13.5px;padding:10px 16px;border-radius:10px;cursor:pointer;transition:.15s;width:100%}
.cd-btn:hover{border-color:var(--accent)}
.cd-btn--primary{background:var(--accent);border-color:var(--accent);color:#0E0E13}
.cd-btn--primary:hover{filter:brightness(1.08)}
.cd-summ{display:flex;gap:26px}
.cd-summ>div{display:flex;flex-direction:column;gap:3px}
.cd-summ-l{color:var(--dim);font-size:11.5px}
.cd-summ-v{font-size:18px;font-weight:600}
.cd-filters{display:flex;gap:10px;align-items:center;flex-wrap:wrap}
.cd-chipset{display:flex;gap:6px;flex-wrap:wrap}
.cd-chip{border:1px solid var(--border);background:transparent;color:var(--dim);font-family:var(--body);font-size:12.5px;padding:6px 12px;border-radius:20px;cursor:pointer;transition:.15s}
.cd-chip:hover{color:var(--text)}
.cd-chip.on{background:var(--surface2);color:var(--text);border-color:var(--text)}
.cd-joblist{display:flex;flex-direction:column;gap:10px}
.cd-job{display:flex;gap:0;background:var(--surface2);border:1px solid var(--border);border-radius:12px;overflow:hidden}
.cd-job-bar{width:4px;flex:0 0 auto}
.cd-job-main{flex:1;padding:12px 14px;min-width:0}
.cd-job-top{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.cd-job-brand{font-weight:600;font-size:14px}
.cd-job-meta{display:flex;gap:14px;flex-wrap:wrap;margin-top:5px;color:var(--dim);font-size:12px}
.cd-job-right{display:flex;align-items:center;gap:10px;padding:12px 14px;flex-wrap:wrap;justify-content:flex-end}
.cd-job-val{font-size:14px;font-weight:600;white-space:nowrap}
.cd-statussel{background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:6px 8px;font-family:var(--display);font-size:12px;font-weight:600;cursor:pointer}
.cd-icbtn{background:transparent;border:1px solid var(--border);color:var(--dim);width:32px;height:32px;border-radius:8px;display:grid;place-items:center;cursor:pointer;transition:.15s;flex:0 0 auto}
.cd-icbtn:hover{color:#F87171;border-color:#F8717155}
.cd-platcard{display:flex;flex-direction:column;gap:10px}
.cd-plat-top{display:flex;align-items:center;gap:10px}
.cd-plat-ic{width:34px;height:34px;border-radius:10px;display:grid;place-items:center}
.cd-plat-name{font-weight:600;font-size:14px}
.cd-plat-num{font-size:30px;font-weight:600}
.cd-histhead,.cd-histrow{display:grid;grid-template-columns:1.4fr 1fr 1fr 1fr 40px;gap:10px;align-items:center}
.cd-histhead{color:var(--dim);font-size:11.5px;text-transform:uppercase;letter-spacing:.05em;padding:0 0 10px;border-bottom:1px solid var(--border)}
.cd-histrow{padding:11px 0;border-bottom:1px solid var(--border);font-size:13.5px}
.cd-histrow:last-child{border-bottom:0}
.cd-histrow .metric{font-size:14px}
.cd-empty--big{text-align:center;padding:56px 24px;background:var(--surface);border:1px solid var(--border);border-radius:18px;position:relative;overflow:hidden}
.cd-empty--big h2{font-family:var(--display);font-size:22px;margin:0 0 8px;letter-spacing:-.01em}
.cd-empty--big p{color:var(--dim);font-size:14px;max-width:440px;margin:0 auto 22px;line-height:1.55}
.cd-emptybtns{display:flex;gap:10px;justify-content:center;flex-wrap:wrap}
.cd-emptybtns .cd-btn{width:auto}
.cd-seed{display:block;margin:20px auto 0;background:none;border:0;color:var(--accent);font-family:var(--body);font-size:13px;cursor:pointer;text-decoration:underline;text-underline-offset:3px}
.cd-foot{display:flex;justify-content:space-between;align-items:center;margin-top:22px;color:var(--dim);font-size:12px;flex-wrap:wrap;gap:10px}
.cd-reset{display:inline-flex;align-items:center;gap:6px;background:none;border:1px solid var(--border);color:var(--dim);border-radius:8px;padding:6px 11px;font-family:var(--body);font-size:12px;cursor:pointer;transition:.15s}
.cd-reset:hover{color:#F87171;border-color:#F8717155}
.cd-legend{display:flex;gap:16px;flex-wrap:wrap;margin-bottom:12px}
.cd-leg{display:inline-flex;align-items:center;gap:6px;font-size:12px;color:var(--dim)}
.cd-leg-dot{width:9px;height:9px;border-radius:50%;flex:0 0 auto}
.cd-histwrap{overflow-x:auto}
.cd-tiles{display:grid;grid-template-columns:repeat(auto-fill,minmax(158px,1fr));gap:12px}
.cd-tile{position:relative;border-radius:14px}
.cd-tile-link{display:flex;flex-direction:column;gap:3px;background:var(--surface2);border:1px solid var(--border);border-radius:14px;padding:15px 14px;text-decoration:none;color:var(--text);transition:.16s;position:relative;overflow:hidden}
.cd-tile-link:hover{border-color:var(--tc);transform:translateY(-2px);box-shadow:0 12px 28px -16px var(--tc)}
.cd-tile-link:focus-visible{outline:2px solid var(--tc);outline-offset:2px}
.cd-tile-avatar{width:36px;height:36px;border-radius:10px;display:grid;place-items:center;font-family:var(--display);font-weight:700;font-size:17px;color:#0E0E13;margin-bottom:8px}
.cd-tile-name{font-family:var(--display);font-weight:600;font-size:15px;letter-spacing:-.01em;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.cd-tile-host{color:var(--dim);font-size:11.5px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.cd-tile-ext{position:absolute;bottom:14px;right:13px;color:var(--dim);transition:.16s}
.cd-tile-link:hover .cd-tile-ext{color:var(--tc)}
.cd-tile-actions{position:absolute;top:10px;right:10px;display:none;gap:5px;z-index:2}
.cd-tile:hover .cd-tile-actions,.cd-tile:focus-within .cd-tile-actions{display:flex}
.cd-tile-act{width:26px;height:26px;border-radius:7px;border:1px solid var(--border);background:var(--surface);color:var(--dim);display:grid;place-items:center;cursor:pointer;transition:.15s}
.cd-tile-act:hover{color:var(--text)}
.cd-tile-act--del:hover{color:#F87171;border-color:#F8717155}
.cd-swatches{display:flex;gap:6px;flex-wrap:wrap;align-items:center;padding-top:4px}
.cd-sw{width:24px;height:24px;border-radius:7px;border:2px solid transparent;cursor:pointer;transition:.12s;padding:0}
.cd-sw.on{border-color:var(--text);transform:scale(1.1)}
.cd-form--link{grid-template-columns:1fr 2fr 1.3fr;align-items:end}
.cd-field--linkbtn{grid-column:1 / -1;flex-direction:row;gap:8px;justify-content:flex-start}
.cd-field--linkbtn .cd-btn{width:auto}
.cd-btn--ghost{background:transparent}
.cd-hintbtn{background:none;border:0;color:var(--accent);font-family:var(--body);font-size:12.5px;cursor:pointer;padding:0}
.cd-hintbtn:hover{text-decoration:underline}
.cd-empty{display:flex;flex-direction:column;align-items:center;gap:12px;text-align:center;padding:24px 10px}
.cd-empty-ic{width:48px;height:48px;border-radius:14px;display:grid;place-items:center;background:#8B7CFF1A;color:var(--accent)}
@media(max-width:820px){
  .cd-grid{grid-template-columns:repeat(2,1fr)}
  .cd-form{grid-template-columns:repeat(2,1fr)}
  .cd-form--snap{grid-template-columns:repeat(2,1fr)}
  .cd-form--link{grid-template-columns:1fr 1fr}
  .cd-field--wide{grid-column:span 2}
  .cd-hero-num{font-size:42px}
}
@media(max-width:520px){
  .cd-grid{grid-template-columns:1fr}
  .cd-form,.cd-form--snap,.cd-form--link{grid-template-columns:1fr}
  .cd-field--wide{grid-column:span 1}
  .cd-tiles{grid-template-columns:repeat(2,minmax(0,1fr))}
  .cd-summ{gap:18px}
  .cd-job-right{width:100%;justify-content:space-between;border-top:1px solid var(--border)}
  .cd-histhead,.cd-histrow{grid-template-columns:1.3fr 1fr 1fr 1fr 32px;gap:6px;font-size:12px}
}
`}</style>
  );
}
