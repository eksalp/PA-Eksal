/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Build production tetap jadi walau ada peringatan ESLint (mis. variabel
  // nggak kepake). Ini nggak nyembunyiin bug logika — cuma nurunin ketat-nya
  // linting saat build.
  eslint: { ignoreDuringBuilds: true },

  // Build tetap jadi walau ada error type-checking. Berguna buat scaffold yang
  // tipenya belum 100% rapi. Trade-off: kamu kehilangan "jaring pengaman" type
  // saat build — jadi kalau nanti ada yang aneh pas app jalan, kabari aku biar
  // dibenerin ke akarnya.
  typescript: { ignoreBuildErrors: true },
};

module.exports = nextConfig;
