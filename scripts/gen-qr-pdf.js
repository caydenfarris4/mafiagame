// Build-time generator: bakes every clue's QR code (using the production tokens
// from cf-seed.sql) into public/clue-qr-codes.pdf. Served as a static file so the
// Worker never has to render QR codes at request time (that tripped error 1102).
//
//   node --experimental-sqlite scripts/gen-qr-pdf.js
//
// Re-run whenever clue tokens change (they don't, normally).

const fs = require("fs");
const path = require("path");
const { DatabaseSync } = require("node:sqlite");
const QRCode = require("qrcode");
const { PDFDocument, StandardFonts, rgb } = require("pdf-lib");

const BASE_URL = "https://deadinthewater.caydenfarris.net";
const ROOT = path.resolve(__dirname, "..");

// Mirror of src/lib/clueCode.ts so the printed manual-entry code matches what the
// app derives from the same token. Keep the alphabet/length in sync with that file.
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const CODE_LEN = 6;
function hash(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}
function clueEntryCode(token) {
  let out = "";
  for (let i = 0; i < CODE_LEN; i++) {
    out += ALPHABET[hash(`${token}:${i}`) % ALPHABET.length];
  }
  return out;
}

function loadClues() {
  const dbFile = path.join("/tmp", `qrpdf-${Date.now()}.db`);
  const db = new DatabaseSync(dbFile);
  db.exec(fs.readFileSync(path.join(ROOT, "cf-migrations/0001_init.sql"), "utf8"));
  db.exec(fs.readFileSync(path.join(ROOT, "cf-migrations/0002_player_session.sql"), "utf8"));
  db.exec(fs.readFileSync(path.join(ROOT, "cf-seed.sql"), "utf8"));
  const rows = db
    .prepare("SELECT code, title, location, phase, tag, token FROM Clue ORDER BY phase, code")
    .all();
  db.close();
  fs.rmSync(dbFile, { force: true });
  return rows;
}

async function main() {
  const clues = loadClues();
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  // US Letter, 3-column grid.
  const PW = 612, PH = 792, M = 36;
  const COLS = 3, COL_W = (PW - M * 2) / COLS;
  const QR = 132, CELL_H = 210, ROWS = 3, PER_PAGE = COLS * ROWS;

  const dim = rgb(0.4, 0.4, 0.4);
  let page = null;

  for (let i = 0; i < clues.length; i++) {
    const c = clues[i];
    if (i % PER_PAGE === 0) {
      page = pdf.addPage([PW, PH]);
      page.drawText("Dead in the Water — clue tags", { x: M, y: PH - 24, size: 10, font: bold, color: dim });
    }
    const pos = i % PER_PAGE;
    const col = pos % COLS;
    const row = Math.floor(pos / COLS);
    const cellX = M + col * COL_W;
    const cellTop = PH - M - 14 - row * CELL_H; // leave room for the page title

    const qrBuf = await QRCode.toBuffer(`${BASE_URL}/clue/${c.token}`, { margin: 1, width: 600, type: "png" });
    const png = await pdf.embedPng(qrBuf);
    const qrX = cellX + (COL_W - QR) / 2;
    const qrY = cellTop - QR;
    page.drawImage(png, { x: qrX, y: qrY, width: QR, height: QR });

    let ty = qrY - 14;
    const center = (text, f, size, color) => {
      const w = f.widthOfTextAtSize(text, size);
      page.drawText(text, { x: cellX + (COL_W - w) / 2, y: ty, size, font: f, color });
    };
    center(`Phase ${c.phase} · ${c.code} · ${c.tag}`, font, 8, dim);
    ty -= 12;
    // Manual-entry code (camera blocked? type this into the app).
    center(`Code: ${clueEntryCode(c.token)}`, bold, 11, rgb(0, 0, 0));
    ty -= 14;
    // Title (truncate if too wide for the column).
    let title = c.title;
    while (bold.widthOfTextAtSize(title, 10) > COL_W - 8 && title.length > 4) title = title.slice(0, -2);
    if (title !== c.title) title = title.replace(/…?$/, "…");
    center(title, bold, 10, rgb(0, 0, 0));
    ty -= 12;
    // Location, wrapped to up to 2 lines.
    const words = c.location.split(/\s+/);
    let line = "";
    const lines = [];
    for (const w of words) {
      const test = line ? `${line} ${w}` : w;
      if (font.widthOfTextAtSize(test, 7.5) > COL_W - 8 && line) {
        lines.push(line);
        line = w;
      } else line = test;
    }
    if (line) lines.push(line);
    for (const l of lines.slice(0, 2)) {
      center(l, font, 7.5, dim);
      ty -= 10;
    }
  }

  const bytes = await pdf.save();
  const out = path.join(ROOT, "public/clue-qr-codes.pdf");
  fs.writeFileSync(out, bytes);
  console.log(`Wrote ${out} — ${clues.length} clues, ${(bytes.length / 1024).toFixed(0)} KB`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
