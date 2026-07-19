// Cadangan: bikin TypeScript nerima `import "./globals.css"` walau
// next-env.d.ts belum ke-generate. Aman dibiarkan walau nanti dev server
// udah bikin next-env.d.ts — nggak bentrok.
// Taruh file ini di root project (sejajar package.json).
declare module "*.css";
