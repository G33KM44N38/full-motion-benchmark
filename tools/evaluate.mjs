#!/usr/bin/env node
/**
 * Deterministic visual/structural evaluator for the Full Motion benchmark.
 * Compares site/ against reference/ screenshots and docs/dom/ measures.
 * Exit 0 only if the exit predicate is met. tools/ and reference/ are read-only.
 */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { chromium } from "playwright";
import pixelmatch from "pixelmatch";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const THRESHOLD = Number(process.env.EVALUATE_THRESHOLD || 85);
const READY_MS = Number(process.env.EVALUATE_READY_MS || 5000);
const PIXEL_THRESHOLD = 0.1;
const GEOM_TOLERANCE = 0.05;
const FULL_PAGE_PIXEL_CAP = 3000;

const VIEWPORTS = {
  desktop: { width: 1440, height: 900, mobile: false },
  mobile: { width: 390, height: 844, mobile: true },
};

const PAGES = [
  {
    id: "home",
    path: "/",
    sections: [
      { id: "H0", priority: "P1", kind: "loader-source" },
      { id: "H1", priority: "P1", cls: ["home-brand"] },
      { id: "H2", priority: "P1", cls: ["home-entries"], childCls: "home-entry" },
      { id: "H3", priority: "P1", cls: ["home-cinema"] },
      { id: "H4", priority: "P1", cls: ["home-contacts"] },
      { id: "H5", priority: "P1", cls: ["copyright"] },
    ],
  },
  {
    id: "drone-work",
    path: "/drone.html",
    sections: [
      { id: "D1", priority: "P1", cls: ["nav"], tag: "header" },
      {
        id: "D2",
        priority: "P1",
        cls: ["cinema-hero"],
        mobileCls: ["work-search"],
        mobileReplaces: true,
      },
      { id: "D3", priority: "P1", cls: ["grid"] },
      { id: "D4", priority: "P1", tag: "footer" },
    ],
  },
  {
    id: "drone-equipment",
    path: "/drone.html?page=equipment",
    sections: [
      { id: "DE", priority: "P2", cls: ["equipment"] },
    ],
  },
  {
    id: "drone-team",
    path: "/drone.html?page=team",
    sections: [{ id: "DT", priority: "P2", cls: ["team"] }],
  },
  {
    id: "drone-contact",
    path: "/drone.html?page=contact",
    sections: [{ id: "DC", priority: "P2", cls: ["contact-grid"] }],
  },
  {
    id: "drone-film",
    path: "/drone.html?film=athena",
    sections: [
      { id: "DF", priority: "P2", cls: ["product-video", "film-title"] },
    ],
  },
  {
    id: "rental",
    path: "/rental.html",
    sections: [
      { id: "R1", priority: "P1", cls: ["nav"], tag: "header" },
      { id: "R2", priority: "P1", cls: ["rental-search"] },
      { id: "R3", priority: "P1", cls: ["rental-dropdowns"] },
      { id: "R4", priority: "P1", cls: ["rental-featured"] },
      { id: "R5", priority: "P1", tag: "footer" },
    ],
  },
  {
    id: "rental-product",
    path: "/rental.html?item=whip-pan&lang=fr",
    sections: [{ id: "RP", priority: "P2", cls: ["rental-details", "intro"] }],
  },
  {
    id: "rental-sales",
    path: "/rental.html?item=vente",
    sections: [{ id: "RS", priority: "P2", cls: ["rental-details", "intro", "rental-browse"] }],
  },
  {
    id: "rental-delivery",
    path: "/rental.html?item=livraison",
    sections: [{ id: "RD", priority: "P2", cls: ["rental-details", "intro", "rental-browse"] }],
  },
  {
    id: "rental-contact",
    path: "/rental.html?item=contact",
    sections: [{ id: "RC", priority: "P2", cls: ["contact-grid", "rental-browse"] }],
  },
];

function findRepoRoot() {
  const starts = [process.cwd(), path.resolve(__dirname, ".."), __dirname];
  for (const start of starts) {
    let dir = start;
    for (;;) {
      if (
        fs.existsSync(path.join(dir, "reference")) &&
        fs.existsSync(path.join(dir, "site")) &&
        fs.existsSync(path.join(dir, "PROMPT.md"))
      ) {
        return dir;
      }
      const parent = path.dirname(dir);
      if (parent === dir) break;
      dir = parent;
    }
  }
  throw new Error("Impossible de trouver la racine du dépôt (reference/, site/, PROMPT.md).");
}

function hasClass(el, token) {
  const cls = (el.cls || "").split(/\s+/);
  return cls.includes(token);
}

function hasAnyClass(el, tokens) {
  return (tokens || []).some((t) => hasClass(el, t));
}

function countCols(gtc) {
  if (!gtc || gtc === "none") return 0;
  return gtc.trim().split(/\s+/).filter(Boolean).length;
}

function iou(a, b) {
  const ax2 = a.x + a.w;
  const ay2 = a.y + a.h;
  const bx2 = b.x + b.w;
  const by2 = b.y + b.h;
  const ix = Math.max(0, Math.min(ax2, bx2) - Math.max(a.x, b.x));
  const iy = Math.max(0, Math.min(ay2, by2) - Math.max(a.y, b.y));
  const inter = ix * iy;
  const union = a.w * a.h + b.w * b.h - inter;
  return union > 0 ? inter / union : 0;
}

function relTol(actual, expected) {
  if (expected === 0) return Math.abs(actual) <= 2 ? 0 : 1;
  return Math.abs(actual - expected) / Math.abs(expected);
}

function findByClass(outline, tokens) {
  if (!tokens || !tokens.length) return null;
  const hits = outline.filter((el) => hasAnyClass(el, tokens));
  if (!hits.length) return null;
  hits.sort((a, b) => b.w * b.h - a.w * a.h);
  return hits[0];
}

function findByTag(outline, tag) {
  const hits = outline.filter((el) => el.tag === tag);
  if (!hits.length) return null;
  hits.sort((a, b) => a.d - b.d || b.w * b.h - a.w * a.h);
  return hits[0];
}

function matchBuildBlock(outline, refBlock, tokens, tag) {
  const byCls = findByClass(outline, tokens);
  if (byCls) return { block: byCls, how: "class" };
  if (tag) {
    const byTag = findByTag(outline, tag);
    if (byTag && refBlock) {
      const score = iou(byTag, refBlock);
      if (score >= 0.15 || relTol(byTag.w, refBlock.w) <= 0.25) {
        return { block: byTag, how: "tag" };
      }
    } else if (byTag && !refBlock) {
      return { block: byTag, how: "tag" };
    }
  }
  if (!refBlock) return { block: null, how: "missing" };
  let best = null;
  let bestScore = 0;
  for (const el of outline) {
    const score = iou(el, refBlock);
    if (score > bestScore) {
      bestScore = score;
      best = el;
    }
  }
  if (best && bestScore >= 0.25) return { block: best, how: "geometry", iou: bestScore };
  // Weaker fallback: similar width and y within 20% of page
  for (const el of outline) {
    if (relTol(el.w, refBlock.w) <= 0.2 && relTol(el.y, refBlock.y) <= 0.2 && el.h >= 20) {
      return { block: el, how: "nearby", iou: iou(el, refBlock) };
    }
  }
  return { block: null, how: "missing" };
}

function childCount(outline, parent, childCls) {
  if (!parent) return 0;
  if (childCls) {
    return outline.filter(
      (el) => hasClass(el, childCls) && el.y >= parent.y - 1 && el.y + el.h <= parent.y + parent.h + 1,
    ).length;
  }
  return outline.filter(
    (el) =>
      el.d === parent.d + 1 &&
      el.x >= parent.x - 2 &&
      el.x + el.w <= parent.x + parent.w + 2 &&
      el.y >= parent.y - 2 &&
      el.y + el.h <= parent.y + parent.h + 2,
  ).length;
}

const OUTLINE_FN = () => {
  const out = [];
  const walk = (el, d) => {
    if (d > 6) return;
    for (const c of el.children) {
      const cs = getComputedStyle(c);
      if (["SCRIPT", "STYLE", "LINK", "NOSCRIPT"].includes(c.tagName)) continue;
      const r = c.getBoundingClientRect();
      if (r.height < 4 || r.width < 4 || cs.display === "none" || cs.visibility === "hidden") continue;
      out.push({
        d,
        tag: c.tagName.toLowerCase(),
        cls: (typeof c.className === "string" ? c.className : "").slice(0, 120),
        id: c.id,
        x: Math.round(r.x),
        y: Math.round(r.y + scrollY),
        w: Math.round(r.width),
        h: Math.round(r.height),
        disp: cs.display,
        pos: cs.position,
        gtc: cs.gridTemplateColumns !== "none" ? cs.gridTemplateColumns.slice(0, 120) : "",
        fs: cs.fontSize,
        col: cs.color,
        bg: cs.backgroundColor,
      });
      walk(c, d + 1);
    }
  };
  walk(document.body, 0);
  return out;
};

const MEDIA_FN = () => {
  const boxes = [];
  const add = (el) => {
    const r = el.getBoundingClientRect();
    if (r.width < 8 || r.height < 8) return;
    boxes.push({
      x: Math.round(r.x),
      y: Math.round(r.y + scrollY),
      w: Math.round(r.width),
      h: Math.round(r.height),
    });
  };
  document.querySelectorAll("img, video, canvas, iframe, svg").forEach(add);
  for (const el of document.querySelectorAll("*")) {
    const bg = getComputedStyle(el).backgroundImage;
    if (bg && bg !== "none" && bg.includes("url(")) add(el);
  }
  return boxes;
};

function mime(file) {
  const ext = path.extname(file).toLowerCase();
  return (
    {
      ".html": "text/html; charset=utf-8",
      ".js": "text/javascript; charset=utf-8",
      ".css": "text/css; charset=utf-8",
      ".json": "application/json",
      ".svg": "image/svg+xml",
      ".png": "image/png",
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".webp": "image/webp",
      ".gif": "image/gif",
      ".ico": "image/x-icon",
      ".woff": "font/woff",
      ".woff2": "font/woff2",
      ".map": "application/json",
    }[ext] || "application/octet-stream"
  );
}

function startStaticServer(root, port) {
  const server = http.createServer((req, res) => {
    const url = new URL(req.url || "/", "http://127.0.0.1");
    let rel = decodeURIComponent(url.pathname);
    if (rel.endsWith("/")) rel += "index.html";
    if (rel === "/") rel = "/index.html";
    const file = path.normalize(path.join(root, rel));
    if (!file.startsWith(path.resolve(root))) {
      res.writeHead(403).end("forbidden");
      return;
    }
    fs.readFile(file, (err, data) => {
      if (err) {
        res.writeHead(404, { "content-type": "text/plain" }).end("not found");
        return;
      }
      res.writeHead(200, { "content-type": mime(file) }).end(data);
    });
  });
  return new Promise((resolve, reject) => {
    server.listen(port, "127.0.0.1", () => resolve(server));
    server.on("error", reject);
  });
}

function collectSiteFiles(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const name of fs.readdirSync(dir)) {
    if (name === "node_modules" || name === "dist" || name === ".git") continue;
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) collectSiteFiles(p, acc);
    else if (/\.(html|css|js|mjs|ts|jsx|tsx|svg|json)$/i.test(name)) acc.push(p);
  }
  return acc;
}

function scanSource(siteDir) {
  const files = collectSiteFiles(siteDir);
  const text = files.map((f) => {
    try {
      return fs.readFileSync(f, "utf8");
    } catch {
      return "";
    }
  }).join("\n");
  const hotlink = /https?:\/\/([a-z0-9.-]*\.)?full-motion\.fr\b/i.test(text);
  const loader =
    /\b(loader|splash|preloader|intro-overlay)\b/i.test(text) ||
    (/position:\s*fixed/i.test(text) && /100vh|inset:\s*0/i.test(text) && /overlay|loader|splash/i.test(text));
  const reduced = /prefers-reduced-motion/.test(text);
  const hoverScale = /scale\(\s*1\.0[0-9]/i.test(text) || /scale\s*\(/i.test(text);
  const coverflow = /coverflow|perspective|rotateY|translateZ/i.test(text);
  const carousel = /carousel|featured-slide|featured-stage/i.test(text);
  const tokens =
    /--bg\b|--orange\b|--ink\b|--muted\b|--surface\b/.test(text) ||
    fs.existsSync(path.join(siteDir, "src/tokens.css")) ||
    fs.existsSync(path.join(siteDir, "tokens.css"));
  const pkgPath = path.join(siteDir, "package.json");
  let pkg = {};
  try {
    pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
  } catch {
    pkg = {};
  }
  const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
  const forbiddenUi = ["tailwindcss", "react", "vue", "svelte", "@angular/core"].filter((d) => deps[d]);
  const viteCfg = ["vite.config.js", "vite.config.mjs", "vite.config.ts"]
    .map((n) => path.join(siteDir, n))
    .find((p) => fs.existsSync(p));
  let baseFromEnv = false;
  if (viteCfg) {
    const cfg = fs.readFileSync(viteCfg, "utf8");
    baseFromEnv = /VITE_BASE|BASE_PATH/.test(cfg);
  }
  return { hotlink, loader, reduced, hoverScale, coverflow, carousel, tokens, forbiddenUi, baseFromEnv, fileCount: files.length };
}

function npmBuild(siteDir) {
  const pkg = path.join(siteDir, "package.json");
  if (!fs.existsSync(pkg)) {
    throw new Error("site/package.json est introuvable. Construis le projet Vite dans site/ avant d'évaluer.");
  }
  const dist = path.join(siteDir, "dist");
  const needBuild = !fs.existsSync(path.join(dist, "index.html"));
  if (!needBuild && process.env.EVALUATE_SKIP_BUILD === "1") return dist;
  if (needBuild) {
    const lock = fs.existsSync(path.join(siteDir, "package-lock.json"));
    const install = spawnSync("npm", [lock ? "ci" : "install"], { cwd: siteDir, stdio: "inherit", env: process.env });
    if (install.status !== 0) throw new Error("npm install a échoué dans site/");
  }
  const env = { ...process.env, BASE_PATH: process.env.BASE_PATH || "/", VITE_BASE: process.env.VITE_BASE || "/" };
  const build = spawnSync("npm", ["run", "build"], { cwd: siteDir, stdio: "inherit", env });
  if (build.status !== 0) throw new Error("npm run build a échoué dans site/");
  if (!fs.existsSync(path.join(dist, "index.html"))) {
    throw new Error("site/dist/index.html est introuvable après le build.");
  }
  return dist;
}

function loadDom(repo, pageId, viewport) {
  const p = path.join(repo, "docs", "dom", `${pageId}-${viewport}.json`);
  if (!fs.existsSync(p)) return null;
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

function compareGeometry(ref, build, pageWidth) {
  if (!ref || !build) return { ok: false, reasons: ["bloc introuvable"] };
  const reasons = [];
  const checks = [
    ["x", ref.x, build.x, pageWidth || Math.max(ref.w, 1)],
    ["y", ref.y, build.y, Math.max(ref.h, 80)],
    ["w", ref.w, build.w, Math.max(ref.w, 1)],
    ["h", ref.h, build.h, Math.max(ref.h, 1)],
  ];
  for (const [key, expected, actual, scale] of checks) {
    const err = Math.abs(actual - expected) / scale;
    if (err > GEOM_TOLERANCE && Math.abs(actual - expected) > 8) {
      reasons.push(`${key} ${actual} vs ${expected} (${(err * 100).toFixed(1)}%)`);
    }
  }
  const rc = countCols(ref.gtc);
  const bc = countCols(build.gtc);
  if (rc && bc && rc !== bc) reasons.push(`colonnes ${bc} vs ${rc}`);
  else if (rc && !bc) reasons.push(`pas de grille (${rc} col. attendues)`);
  return { ok: reasons.length === 0, reasons, refCols: rc, buildCols: bc };
}

async function rawRgba(bufOrPath, { width, height } = {}) {
  let img = typeof bufOrPath === "string" ? sharp(bufOrPath) : sharp(bufOrPath);
  const meta = await img.metadata();
  let w = meta.width || width;
  let h = meta.height || height;
  if (width && w !== width) {
    h = Math.max(1, Math.round((h * width) / w));
    w = width;
    img = img.resize(w, h, { fit: "fill" });
  }
  if (height && h !== height) {
    // pad or crop to a common height later
  }
  const { data, info } = await img.ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height };
}

function maskRects(rgba, width, height, rects, yOffset = 0) {
  const out = Buffer.from(rgba);
  for (const r of rects || []) {
    const x0 = Math.max(0, Math.floor(r.x));
    const y0 = Math.max(0, Math.floor(r.y - yOffset));
    const x1 = Math.min(width, Math.ceil(r.x + r.w));
    const y1 = Math.min(height, Math.ceil(r.y - yOffset + r.h));
    for (let y = y0; y < y1; y++) {
      for (let x = x0; x < x1; x++) {
        const i = (y * width + x) * 4;
        out[i] = 128;
        out[i + 1] = 128;
        out[i + 2] = 128;
        out[i + 3] = 255;
      }
    }
  }
  return out;
}

function alignRaw(a, b) {
  const width = Math.min(a.width, b.width);
  const height = Math.min(a.height, b.height);
  const crop = (img) => {
    if (img.width === width && img.height === height) return img.data;
    const out = Buffer.alloc(width * height * 4);
    for (let y = 0; y < height; y++) {
      const src = y * img.width * 4;
      img.data.copy(out, y * width * 4, src, src + width * 4);
    }
    return out;
  };
  return { width, height, a: crop(a), b: crop(b), heightGap: Math.abs(a.height - b.height) / Math.max(a.height, b.height, 1) };
}

async function pixelDiff(refPath, buildBuf, outDiff, mediaRects, variant) {
  if (!fs.existsSync(refPath)) {
    return { mismatch: 1, masked: 1, missingRef: true, heightGap: 1 };
  }
  const refMeta = await sharp(refPath).metadata();
  const targetW = refMeta.width;
  let targetSlice = refMeta.height;
  let yOffset = 0;
  if (variant === "full" && targetSlice > FULL_PAGE_PIXEL_CAP) {
    targetSlice = FULL_PAGE_PIXEL_CAP;
  }
  const refRaw = await sharp(refPath)
    .extract({
      left: 0,
      top: 0,
      width: targetW,
      height: Math.min(targetSlice, refMeta.height),
    })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const buildRaw = await rawRgba(buildBuf, { width: targetW });
  const aligned = alignRaw(
    { data: refRaw.data, width: refRaw.info.width, height: refRaw.info.height },
    buildRaw,
  );
  const diff = Buffer.alloc(aligned.width * aligned.height * 4);
  const rawDiff = pixelmatch(aligned.a, aligned.b, diff, aligned.width, aligned.height, {
    threshold: PIXEL_THRESHOLD,
  });
  const total = aligned.width * aligned.height;
  const maskedA = maskRects(aligned.a, aligned.width, aligned.height, mediaRects, yOffset);
  const maskedB = maskRects(aligned.b, aligned.width, aligned.height, mediaRects, yOffset);
  const maskedDiff = Buffer.alloc(aligned.width * aligned.height * 4);
  const maskedCount = pixelmatch(maskedA, maskedB, maskedDiff, aligned.width, aligned.height, {
    threshold: PIXEL_THRESHOLD,
  });
  if (outDiff) {
    await sharp(maskedDiff, { raw: { width: aligned.width, height: aligned.height, channels: 4 } })
      .png()
      .toFile(outDiff);
  }
  return {
    mismatch: rawDiff / total,
    masked: maskedCount / total,
    heightGap: aligned.heightGap,
    comparedHeight: aligned.height,
    comparedWidth: aligned.width,
    missingRef: false,
  };
}

async function sideBySide(refPath, buildBuf, outPath, width) {
  if (!fs.existsSync(refPath) || !outPath) return;
  const fit = { width, withoutEnlargement: true };
  const [r, b] = await Promise.all([
    sharp(refPath).resize(fit).jpeg({ quality: 70 }).toBuffer({ resolveWithObject: true }),
    sharp(buildBuf).resize(fit).jpeg({ quality: 70 }).toBuffer({ resolveWithObject: true }),
  ]);
  const col = Math.max(r.info.width, b.info.width, 1);
  const h = Math.max(r.info.height, b.info.height, 1);
  await sharp({
    create: { width: col * 2 + 8, height: h, channels: 3, background: { r: 20, g: 20, b: 20 } },
  })
    .composite([
      { input: r.data, top: 0, left: 0 },
      { input: b.data, top: 0, left: col + 8 },
    ])
    .jpeg({ quality: 70 })
    .toFile(outPath);
}

function visualPoints(avgMasked) {
  // 0% → 25, 5% → 21, 15% → 12, 30% → 5, 50%+ → 0
  const p = avgMasked * 100;
  if (p <= 5) return 25 - (p / 5) * 4;
  if (p <= 15) return 21 - ((p - 5) / 10) * 9;
  if (p <= 30) return 12 - ((p - 15) / 15) * 7;
  if (p <= 50) return 5 - ((p - 30) / 20) * 5;
  return 0;
}

async function main() {
  const repo = findRepoRoot();
  const siteDir = path.join(repo, "site");
  const outDir = path.join(repo, "verification");
  const diffsDir = path.join(outDir, "diffs");
  const buildShotDir = path.join(outDir, "evidence", "build");
  const sideDir = path.join(outDir, "evidence", "side-by-side");
  fs.mkdirSync(diffsDir, { recursive: true });
  fs.mkdirSync(buildShotDir, { recursive: true });
  fs.mkdirSync(sideDir, { recursive: true });

  const source = scanSource(siteDir);
  const dist = npmBuild(siteDir);
  const port = Number(process.env.EVALUATE_PORT || 4173);
  const server = await startStaticServer(dist, port);
  const baseUrl = `http://127.0.0.1:${port}`;

  const sectionResults = {}; // id -> { desktop, mobile, priority }
  const pageResults = {};
  const mismatches = [];
  let browser;
  try {
    browser = await chromium.launch();
    for (const [vpName, vp] of Object.entries(VIEWPORTS)) {
      const ctx = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
        isMobile: vp.mobile,
        hasTouch: vp.mobile,
        deviceScaleFactor: 1,
        locale: "fr-FR",
      });
      for (const pageDef of PAGES) {
        const page = await ctx.newPage();
        const url = baseUrl + pageDef.path;
        let status = 0;
        let navOk = true;
        try {
          const resp = await page.goto(url, { waitUntil: "networkidle", timeout: 45000 });
          status = resp ? resp.status() : 0;
          if (status >= 400) navOk = false;
        } catch (err) {
          navOk = false;
          status = 0;
          console.log(`nav ${pageDef.id} ${vpName}: ${(err.message || err).slice(0, 120)}`);
        }
        if (navOk) {
          await page.waitForTimeout(READY_MS);
          await page.evaluate(async () => {
            const max = Math.max(document.body?.scrollHeight || 0, document.documentElement?.scrollHeight || 0);
            for (let y = 0; y < max; y += 600) {
              scrollTo(0, y);
              await new Promise((r) => setTimeout(r, 120));
            }
            scrollTo(0, 0);
          });
          await page.waitForTimeout(800);
        }

        const outline = navOk ? await page.evaluate(OUTLINE_FN) : [];
        const media = navOk ? await page.evaluate(MEDIA_FN) : [];
        const scrollH = navOk ? await page.evaluate(() => document.documentElement.scrollHeight) : 0;
        const brokenImgs = navOk
          ? await page.evaluate(() =>
              [...document.images].filter((i) => !i.complete || i.naturalWidth === 0).map((i) => i.src).slice(0, 20),
            )
          : ["page not loaded"];

        const viewportPng = path.join(buildShotDir, `${pageDef.id}-${vpName}-viewport.png`);
        const fullPng = path.join(buildShotDir, `${pageDef.id}-${vpName}-full.png`);
        if (navOk) {
          await page.screenshot({ path: viewportPng });
          await page.screenshot({ path: fullPng, fullPage: true });
        }

        const refDom = loadDom(repo, pageDef.id, vpName);
        const refOutline = refDom?.o || [];
        const refH = refDom?.H || 0;

        const sections = {};
        for (const sec of pageDef.sections) {
          if (sec.kind === "loader-source") continue;
          const tokens =
            vp.mobile && sec.mobileCls ? sec.mobileCls : sec.cls;
          const refBlock = findByClass(refOutline, tokens) || (sec.tag ? findByTag(refOutline, sec.tag) : null);
          const matched = matchBuildBlock(outline, refBlock, tokens, sec.tag);
          const geom = compareGeometry(refBlock, matched.block, vp.width);
          let ok = Boolean(navOk && matched.block && geom.ok);
          let reasons = [];
          if (!navOk) reasons.push(`page inaccessible (${status || "erreur"})`);
          if (!matched.block) reasons.push("section absente du build");
          if (matched.block && !geom.ok) reasons = reasons.concat(geom.reasons);
          if (vp.mobile && sec.mobileReplaces && findByClass(outline, sec.cls) && !findByClass(outline, sec.mobileCls)) {
            ok = false;
            reasons.push("le hero desktop est encore présent en mobile (il doit être remplacé)");
          }
          if (refBlock && matched.block && sec.childCls) {
            const rc = childCount(refOutline, refBlock, sec.childCls);
            const bc = childCount(outline, matched.block, sec.childCls);
            if (rc && bc && bc < rc * 0.5) {
              ok = false;
              reasons.push(`trop peu d'enfants .${sec.childCls} (${bc} vs ${rc})`);
            }
          }
          if (refBlock && matched.block && !sec.childCls && (sec.id === "D3" || sec.id === "DT" || sec.id === "DC")) {
            const rc = childCount(refOutline, refBlock);
            const bc = childCount(outline, matched.block);
            if (rc >= 4 && bc < Math.max(2, Math.floor(rc * 0.5))) {
              ok = false;
              reasons.push(`trop peu de cartes (${bc} vs ${rc})`);
            }
          }
          const rec = {
            ok,
            how: matched.how,
            reasons,
            ref: refBlock ? { x: refBlock.x, y: refBlock.y, w: refBlock.w, h: refBlock.h, cols: countCols(refBlock.gtc) } : null,
            build: matched.block
              ? { x: matched.block.x, y: matched.block.y, w: matched.block.w, h: matched.block.h, cols: countCols(matched.block.gtc), cls: matched.block.cls }
              : null,
          };
          sections[sec.id] = rec;
          if (!sectionResults[sec.id]) sectionResults[sec.id] = { priority: sec.priority };
          sectionResults[sec.id][vpName] = rec;
          if (!ok) mismatches.push(`${sec.id}/${vpName}: ${reasons.join("; ") || "KO"}`);
        }

        const refViewport = path.join(repo, "reference", `${pageDef.id}-${vpName}-viewport.jpg`);
        const refFull = path.join(repo, "reference", `${pageDef.id}-${vpName}-full.jpg`);
        let pixV = { mismatch: 1, masked: 1, missingRef: !fs.existsSync(refViewport) };
        let pixF = { mismatch: 1, masked: 1, missingRef: !fs.existsSync(refFull) };
        if (navOk && fs.existsSync(viewportPng)) {
          pixV = await pixelDiff(
            refViewport,
            viewportPng,
            path.join(diffsDir, `${pageDef.id}-${vpName}-viewport.png`),
            media,
            "viewport",
          );
          try {
            await sideBySide(
              refViewport,
              viewportPng,
              path.join(sideDir, `${pageDef.id}-${vpName}-viewport.jpg`),
              vp.width,
            );
          } catch (e) {
            console.log("side-by-side", pageDef.id, vpName, e.message);
          }
        }
        if (navOk && fs.existsSync(fullPng)) {
          pixF = await pixelDiff(
            refFull,
            fullPng,
            path.join(diffsDir, `${pageDef.id}-${vpName}-full.png`),
            media,
            "full",
          );
        }

        if (!pageResults[pageDef.id]) pageResults[pageDef.id] = {};
        pageResults[pageDef.id][vpName] = {
          url: pageDef.path,
          status,
          navOk,
          scrollHeight: scrollH,
          refHeight: refH,
          heightRatio: refH ? scrollH / refH : null,
          brokenImages: brokenImgs,
          pixel: { viewport: pixV, full: pixF },
          sections,
        };
        await page.close();
        const mv = pixV.masked != null ? (pixV.masked * 100).toFixed(1) : "?";
        console.log(`${vpName} ${pageDef.id}  masked=${mv}%  h=${scrollH}/${refH || "?"}  sections=${Object.values(sections).filter((s) => s.ok).length}/${Object.keys(sections).length}`);
      }
      await ctx.close();
    }
  } finally {
    if (browser) await browser.close();
    await new Promise((r) => server.close(r));
  }

  // H0: source-level loader check (screenshots are taken after the intro)
  const h0ok = Boolean(source.loader);
  sectionResults.H0 = {
    priority: "P1",
    desktop: { ok: h0ok, reasons: h0ok ? [] : ["aucun loader d'entrée détecté dans le source de site/"] },
    mobile: { ok: h0ok, reasons: h0ok ? [] : ["aucun loader d'entrée détecté dans le source de site/"] },
  };
  if (!h0ok) mismatches.push("H0: loader absent du source");

  const items = Object.entries(sectionResults);
  const p1 = items.filter(([, v]) => v.priority === "P1");
  const p2 = items.filter(([, v]) => v.priority === "P2");
  const itemOk = (v) => Boolean(v.desktop?.ok && v.mobile?.ok);
  const p1ok = p1.filter(([, v]) => itemOk(v)).length;
  const p2ok = p2.filter(([, v]) => itemOk(v)).length;
  const allSectionsOk = p1.every(([, v]) => itemOk(v)) && p2.every(([, v]) => itemOk(v));

  const missingOrReordered = [];
  for (const [id, v] of items) {
    if (id === "H0") continue;
    for (const vp of ["desktop", "mobile"]) {
      const rec = v[vp];
      if (!rec) continue;
      if (!rec.build) missingOrReordered.push(`${id}/${vp} manquante`);
      else if (!rec.ok) {
        const why = (rec.reasons || []).join(", ") || "géométrie KO";
        missingOrReordered.push(`${id}/${vp}: ${why}`);
      }
    }
  }
  const structuralMismatch = missingOrReordered.length > 0 || !allSectionsOk;

  const structurePoints = (p1.length ? 25 * (p1ok / p1.length) : 0) + (p2.length ? 10 * (p2ok / p2.length) : 0);

  const maskedVals = [];
  const mobileMasked = [];
  let brokenImagePages = 0;
  let heightFails = 0;
  for (const [pid, views] of Object.entries(pageResults)) {
    for (const [vp, rec] of Object.entries(views)) {
      const m = rec.pixel?.viewport?.masked;
      if (typeof m === "number" && !rec.pixel.viewport.missingRef) {
        maskedVals.push(m);
        if (vp === "mobile") mobileMasked.push(m);
      }
      if ((rec.brokenImages || []).length) brokenImagePages += 1;
      if (rec.refHeight && rec.scrollHeight && Math.abs(rec.scrollHeight / rec.refHeight - 1) > 0.25) {
        heightFails += 1;
      }
    }
  }
  const avgMasked = maskedVals.length ? maskedVals.reduce((a, b) => a + b, 0) / maskedVals.length : 1;
  const avgMobileMasked = mobileMasked.length ? mobileMasked.reduce((a, b) => a + b, 0) / mobileMasked.length : avgMasked;
  const visPts = visualPoints(avgMasked);

  // Responsive: mobile section OKs among items that have a mobile variant + mobile visual
  const mobileSectionOk = items.filter(([, v]) => v.mobile?.ok).length;
  const mobileSectionPts = items.length ? (mobileSectionOk / items.length) * 10 : 0;
  const mobileVisPts = (visualPoints(avgMobileMasked) / 25) * 5;
  const responsivePts = Math.max(0, Math.min(15, mobileSectionPts + mobileVisPts));

  let imagePts = 10;
  const imageNotes = [];
  if (source.hotlink) {
    imagePts -= 15;
    imageNotes.push("hotlink ou texte pointant vers full-motion.fr");
  }
  if (brokenImagePages) {
    imagePts -= Math.min(6, brokenImagePages);
    imageNotes.push(`images cassées sur ${brokenImagePages} capture(s)`);
  }
  // Presence of media in key sections of the build
  const mediaPages = ["home", "drone-work", "rental"].filter((id) => {
    const rec = pageResults[id]?.desktop;
    return rec && rec.navOk && (rec.brokenImages || []).length === 0;
  });
  if (mediaPages.length < 3) {
    imagePts -= 2;
    imageNotes.push("toutes les pages P1 ne sont pas joignables avec des images valides");
  }
  imagePts = Math.max(0, Math.min(10, imagePts));

  let animPts = 0;
  const animNotes = [];
  if (source.loader) { animPts += 1; animNotes.push("loader"); }
  if (source.coverflow) { animPts += 1.5; animNotes.push("coverflow"); }
  if (source.carousel) { animPts += 1; animNotes.push("carrousel"); }
  if (source.hoverScale) { animPts += 1; animNotes.push("scale au survol"); }
  if (source.reduced) { animPts += 0.5; animNotes.push("prefers-reduced-motion"); }
  animPts = Math.max(0, Math.min(5, animPts));

  let verPts = 0;
  if (fs.existsSync(diffsDir) && fs.readdirSync(diffsDir).length >= 4) verPts += 4;
  if (fs.existsSync(path.join(outDir, "decision-log.md"))) verPts += 3;
  verPts = Math.min(7, verPts);

  let codePts = 0;
  if (source.tokens) codePts += 1;
  if (source.baseFromEnv) codePts += 1;
  if (source.forbiddenUi.length === 0 && fs.existsSync(path.join(siteDir, "package.json"))) codePts += 1;
  if (source.forbiddenUi.length) {
    mismatches.push(`stack interdite: ${source.forbiddenUi.join(", ")}`);
  }

  const penalties = [];
  const p1Missing = p1.filter(([, v]) => !itemOk(v)).map(([id]) => id);
  // Penalty already reflected in structure points; also record official penalties for the report
  if (p1Missing.length) penalties.push({ id: "p1-missing", points: Math.min(35, p1Missing.length * 10), reason: `sections P1 KO: ${p1Missing.join(", ")}` });
  if (source.hotlink) penalties.push({ id: "hotlink", points: 15, reason: "asset ou URL full-motion.fr détecté dans site/" });

  let score =
    structurePoints + visPts + responsivePts + imagePts + animPts + verPts + codePts;
  for (const p of penalties) {
    if (p.id === "hotlink") score -= p.points;
    // p1-missing is already in the 35-point structure score; don't double-apply -10 each
  }
  score = Math.max(0, Math.min(100, Number(score.toFixed(1))));

  const scoreOk = score >= THRESHOLD;
  const noStructuralMismatch = !structuralMismatch;
  const predicatePassed = allSectionsOk && scoreOk && noStructuralMismatch;

  const report = {
    version: 1,
    generated_at: new Date().toISOString(),
    threshold: THRESHOLD,
    score,
    predicate: {
      passed: predicatePassed,
      all_sections_ok: allSectionsOk,
      score_ok: scoreOk,
      no_structural_mismatch: noStructuralMismatch,
      reasons: [
        allSectionsOk ? null : `checklist incomplète (${p1ok}/${p1.length} P1, ${p2ok}/${p2.length} P2)`,
        scoreOk ? null : `score ${score} < ${THRESHOLD}`,
        noStructuralMismatch ? null : `écarts structurels: ${missingOrReordered.slice(0, 8).join(" · ")}`,
      ].filter(Boolean),
    },
    scores: {
      structure: { points: Number(structurePoints.toFixed(2)), max: 35, p1: `${p1ok}/${p1.length}`, p2: `${p2ok}/${p2.length}` },
      visual: { points: Number(visPts.toFixed(2)), max: 25, avg_masked_mismatch: Number((avgMasked * 100).toFixed(2)) },
      responsive: { points: Number(responsivePts.toFixed(2)), max: 15, avg_mobile_masked_mismatch: Number((avgMobileMasked * 100).toFixed(2)) },
      images: { points: Number(imagePts.toFixed(2)), max: 10, notes: imageNotes },
      animations: { points: Number(animPts.toFixed(2)), max: 5, notes: animNotes, heuristic: true },
      verification: { points: verPts, max: 7, notes: ["diffs produits par evaluate", fs.existsSync(path.join(outDir, "decision-log.md")) ? "decision-log.md présent" : "decision-log.md absent"] },
      code: { points: codePts, max: 3, tokens: source.tokens, base_from_env: source.baseFromEnv, forbidden_ui: source.forbiddenUi },
    },
    penalties,
    sections: Object.fromEntries(
      items.map(([id, v]) => [
        id,
        {
          priority: v.priority,
          ok: itemOk(v),
          desktop: v.desktop || null,
          mobile: v.mobile || null,
        },
      ]),
    ),
    pages: pageResults,
  };

  const scorePath = path.join(outDir, "score.json");
  fs.writeFileSync(scorePath, JSON.stringify(report, null, 2) + "\n");

  console.log("");
  console.log(`Score ${score}/100  (seuil ${THRESHOLD})`);
  console.log(`Structure ${structurePoints.toFixed(1)}/35  Visual ${visPts.toFixed(1)}/25  Responsive ${responsivePts.toFixed(1)}/15  Images ${imagePts}/10  Anim ${animPts}/5  Verif ${verPts}/7  Code ${codePts}/3`);
  console.log(`Prédicat: ${predicatePassed ? "OUI" : "NON"}  —  ${(report.predicate.reasons.join(" | ") || "tout est bon")}`);
  console.log(`Écrit ${path.relative(repo, scorePath)} et ${path.relative(repo, diffsDir)}/`);
  process.exit(predicatePassed ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(2);
});
