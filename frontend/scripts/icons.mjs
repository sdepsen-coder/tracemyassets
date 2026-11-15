// Keeps src/lib/iconNames.json and the self-hosted icon font in step with the
// Material Symbols icons the code uses.
//
// The site serves a font with only these icons (about 50 KB) from its own
// domain: public/fonts/material-symbols-subset.woff2. Nothing is loaded from
// Google in the visitor's browser. An icon missing from the font would show
// as an empty box, so the build runs this check first.
//
//   node scripts/icons.mjs          check: fail if the code uses an icon that
//                                   is not in the list or not in the font
//   node scripts/icons.mjs --write  add the icons the code uses to the list
//   node scripts/icons.mjs --fetch  --write, then download the font subset
//                                   for the list (needs internet; run it
//                                   after adding an icon and commit the
//                                   two files in public/fonts)
//
// It reads the code for icon names written as string literals: name="x" on an
// <Icon>, icon="x" / icon: "x" props and data, names inside a name={...}
// expression, and text written inside a material-symbols-outlined span.
// Extra names (valid or not) in the list are harmless: the font service
// ignores names it does not know. Add an icon that is only built at run time
// to "extra" in the JSON file by hand.

import {
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const srcDir = join(root, "src");
const listPath = join(srcDir, "lib", "iconNames.json");
const fontDir = join(root, "public", "fonts");
const fontPath = join(fontDir, "material-symbols-subset.woff2");
// Which icons the downloaded font holds, so the check needs no internet.
const fontListPath = join(fontDir, "material-symbols-subset.json");

const NAME = "[a-z][a-z0-9_]*";

function walk(dir) {
  const files = [];

  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);

    if (statSync(path).isDirectory()) {
      files.push(...walk(path));
    } else if (/\.(ts|tsx)$/.test(entry)) {
      files.push(path);
    }
  }

  return files;
}

function literalsIn(text) {
  return [...text.matchAll(new RegExp(`"(${NAME})"`, "g"))].map((m) => m[1]);
}

function collect() {
  const found = new Set();

  for (const file of walk(srcDir)) {
    const code = readFileSync(file, "utf8");

    // name="x" (an <Icon>, but any attribute called name is a harmless extra)
    for (const m of code.matchAll(new RegExp(`\\bname="(${NAME})"`, "g"))) {
      found.add(m[1]);
    }

    // icon="x" and iconName="x"
    for (const m of code.matchAll(
      new RegExp(`\\bicon(?:Name)?="(${NAME})"`, "g"),
    )) {
      found.add(m[1]);
    }

    // name={...}, icon={...}, iconName={...}: every literal inside the braces,
    // so `cond ? "a" : "b"` is covered
    for (const m of code.matchAll(/\b(?:name|icon|iconName)=\{([^}]*)\}/g)) {
      literalsIn(m[1]).forEach((name) => found.add(name));
    }

    // icon: ... and iconName: ... in data: every literal on the rest of the line
    for (const m of code.matchAll(/\bicon(?:Name)?:\s*([^\n]*)/g)) {
      literalsIn(m[1]).forEach((name) => found.add(name));
    }

    // Text written inside a material-symbols-outlined span, plain or as an
    // expression with literals.
    for (const m of code.matchAll(
      /material-symbols-outlined[^>]*>\s*([^<]*)</g,
    )) {
      const inner = m[1].trim();

      if (new RegExp(`^${NAME}$`).test(inner)) {
        found.add(inner);
      } else {
        literalsIn(inner).forEach((name) => found.add(name));
      }
    }

    // The glass art motifs map to icon names.
    if (code.includes("MOTIF_ICON")) {
      const block = code.match(/MOTIF_ICON[^{]*\{([^}]*)\}/);

      if (block) {
        literalsIn(block[1]).forEach((name) => found.add(name));
      }
    }
  }

  return found;
}

function readFontNames() {
  try {
    return new Set(JSON.parse(readFileSync(fontListPath, "utf8")).names);
  } catch {
    return new Set();
  }
}

async function fetchFont(names) {
  // The font service wants the names in alphabetical order, and only sends
  // woff2 to a browser-like client.
  const sorted = [...names].sort();
  const cssUrl =
    "https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:" +
    "opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200" +
    `&icon_names=${sorted.join(",")}&display=block`;
  const css = await (
    await fetch(cssUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36",
      },
    })
  ).text();
  const fontUrl = css.match(/url\((https:[^)]+)\)\s*format\(['"]woff2['"]\)/)?.[1];

  if (!fontUrl) {
    throw new Error("icons: no woff2 address in the font stylesheet.");
  }

  const bytes = Buffer.from(await (await fetch(fontUrl)).arrayBuffer());

  if (bytes.subarray(0, 4).toString("latin1") !== "wOF2") {
    throw new Error("icons: the downloaded file is not a woff2 font.");
  }

  mkdirSync(fontDir, { recursive: true });
  writeFileSync(fontPath, bytes);
  writeFileSync(fontListPath, JSON.stringify({ names: sorted }, null, 2) + "\n");
  console.log(`icons: font written (${sorted.length} icons, ${bytes.length} bytes).`);
}

const list = JSON.parse(readFileSync(listPath, "utf8"));
const known = new Set([...list.names, ...list.extra]);
const used = collect();
const missing = [...used].filter((name) => !known.has(name)).sort();
const fetchMode = process.argv.includes("--fetch");

if (process.argv.includes("--write") || fetchMode) {
  const names = [...new Set([...list.names, ...used])].sort();
  writeFileSync(
    listPath,
    JSON.stringify({ names, extra: list.extra }, null, 2) + "\n",
  );
  console.log(`icons: ${names.length} names written (${missing.length} new).`);

  if (fetchMode) {
    await fetchFont(new Set([...names, ...list.extra]));
  }
} else if (missing.length > 0) {
  console.error(
    `icons: the code uses icons that are not in src/lib/iconNames.json: ${missing.join(", ")}\n` +
      "Run: node scripts/icons.mjs --fetch",
  );
  process.exit(1);
} else {
  const inFont = readFontNames();
  const notInFont = [...used].filter((name) => !inFont.has(name)).sort();

  if (notInFont.length > 0) {
    console.error(
      `icons: the icon font in public/fonts lacks: ${notInFont.join(", ")}\n` +
        "Run: node scripts/icons.mjs --fetch (then commit public/fonts).",
    );
    process.exit(1);
  }

  console.log(`icons: ok (${used.size} names used, ${known.size} listed).`);
}
