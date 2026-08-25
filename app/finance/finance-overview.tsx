"use client";

import { useState, useEffect } from "react";

const idr = (n: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(n);

type Account = { id: string; name: string; current_balance: number };

export function FinanceOverview({
  netWorth,
  totalCash,
  totalAssets,
  totalPiutang,
  totalUtang,
  totalPiutangAllTime,
  totalUtangAllTime,
  accounts,
}: {
  netWorth: number;
  totalCash: number;
  totalAssets: number;
  totalPiutang: number;
  totalUtang: number;
  totalPiutangAllTime: number;
  totalUtangAllTime: number;
  accounts: Account[];
}) {
  const [hidden, setHidden] = useState(true); // default true = tertutup
  const mask = "••••••";
  const show = (n: number) => (hidden ? mask : idr(n));

  // Sync dengan localStorage supaya persistent saat refresh
  useEffect(() => {
    const saved = localStorage.getItem("finance-balance-hidden");
    // Kalau belum pernah disimpan (null), default tetap true (tertutup)
    if (saved !== null) setHidden(saved === "true");
  }, []);

  function toggleHidden() {
    setHidden((h) => {
      const next = !h;
      localStorage.setItem("finance-balance-hidden", String(next));
      return next;
    });
  }

  return (
    <>
      {/* Net worth hero */}
      <div className="card-gradient p-6">
        <div className="flex items-start justify-between">
          <div className="min-w-0 flex-1">
            <p
              className="text-xs font-semibold uppercase tracking-widest"
              style={{ color: "rgba(255,255,255,.7)" }}
            >
              Net Worth
            </p>
            <p className="mt-1 text-4xl font-bold tracking-tight text-white">
              {show(netWorth)}
            </p>
          </div>
          <button
            onClick={toggleHidden}
            aria-label={hidden ? "Tampilkan nominal" : "Sembunyikan nominal"}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 34,
              height: 34,
              borderRadius: 10,
              flexShrink: 0,
              marginLeft: 12,
              background: "rgba(255,255,255,.15)",
              border: "1px solid rgba(255,255,255,.25)",
              cursor: "pointer",
              color: "#fff",
            }}
          >
            {hidden ? (
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                <line x1="1" y1="1" x2="23" y2="23" />
              </svg>
            ) : (
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            )}
          </button>
        </div>

        {/* Summary grid */}
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            {
              label: "Kas & Rekening",
              val: totalCash,
              color: "rgba(255,255,255,.9)",
            },
            { label: "Aset", val: totalAssets, color: "rgba(255,255,255,.9)" },
            { label: "Piutang Aktif", val: totalPiutang, color: "#86EFAC" },
            { label: "Utang Aktif", val: -totalUtang, color: "#FCA5A5" },
          ].map((item) => (
            <div key={item.label}>
              <p className="text-xs" style={{ color: "rgba(255,255,255,.6)" }}>
                {item.label}
              </p>
              <p
                className="mt-0.5 text-sm font-bold"
                style={{ color: item.color }}
              >
                {hidden ? mask : idr(item.val)}
              </p>
            </div>
          ))}
        </div>

        {/* Akumulasi all-time (hanya tampil jika ada yang lunas) */}
        {(totalUtangAllTime > totalUtang ||
          totalPiutangAllTime > totalPiutang) && (
          <div className="mt-3 border-t border-white/10 pt-3 grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs" style={{ color: "rgba(255,255,255,.5)" }}>
                Total Piutang (all-time)
              </p>
              <p
                className="mt-0.5 text-xs font-medium"
                style={{ color: "rgba(134,239,172,.7)" }}
              >
                {hidden ? mask : idr(totalPiutangAllTime)}
              </p>
            </div>
            <div>
              <p className="text-xs" style={{ color: "rgba(255,255,255,.5)" }}>
                Total Utang (all-time)
              </p>
              <p
                className="mt-0.5 text-xs font-medium"
                style={{ color: "rgba(252,165,165,.7)" }}
              >
                {hidden ? mask : idr(totalUtangAllTime)}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Account cards */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <p className="section-label">Rekening Aktif</p>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-1">
          {accounts.map((a, i) => (
            <div
              key={a.id}
              className="flex-shrink-0 rounded-2xl p-4 text-white"
              style={{
                minWidth: 160,
                background:
                  i % 2 === 0
                    ? "linear-gradient(135deg,#4F78FF,#7C5CFC)"
                    : "linear-gradient(135deg,#7C5CFC,#EC4899)",
                boxShadow: "var(--shadow-md)",
              }}
            >
              <p
                className="text-xs font-medium"
                style={{ color: "rgba(255,255,255,.75)" }}
              >
                {a.name}
              </p>
              <p className="mt-1 text-lg font-bold tracking-tight">
                {hidden ? mask : idr(Number(a.current_balance))}
              </p>
            </div>
          ))}
          {accounts.length === 0 && (
            <p className="text-sm" style={{ color: "var(--text-3)" }}>
              Belum ada rekening.
            </p>
          )}
        </div>
      </div>
    </>
  );
}
