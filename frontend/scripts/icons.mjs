// Keeps src/lib/iconNames.json in step with the Material Symbols icons the
// code uses.
//
// The site loads a font with only these icons (a few KB) instead of the whole
// icon font (about 4 MB, which held up the first paint by many seconds). An
// icon missing from the list would show its name as plain text, so the build
// runs this check first.
//
//   node scripts/icons.mjs          check: fail if the code uses an icon that
//                                   is not in the list
//   node scripts/icons.mjs --write  add the icons the code uses to the list
//
// It reads the code for icon names written as string literals: name="x" on an
// <Icon>, icon="x" / icon: "x" props and data, names inside a name={...}
// expression, and text written inside a material-symbols-outlined span.
// Extra names (valid or not) in the list are harmless: the font service
// ignores names it does not know. Add an icon that is only built at run time
// to "extra" in the JSON file by hand.

import { readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const srcDir = join(root, "src");
const listPath = join(srcDir, "lib", "iconNames.json");

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

const list = JSON.parse(readFileSync(listPath, "utf8"));
const known = new Set([...list.names, ...list.extra]);
const used = collect();
const missing = [...used].filter((name) => !known.has(name)).sort();

if (process.argv.includes("--write")) {
  const names = [...new Set([...list.names, ...used])].sort();
  writeFileSync(
    listPath,
    JSON.stringify({ names, extra: list.extra }, null, 2) + "\n",
  );
  console.log(`icons: ${names.length} names written (${missing.length} new).`);
} else if (missing.length > 0) {
  console.error(
    `icons: the code uses icons that are not in src/lib/iconNames.json: ${missing.join(", ")}\n` +
      "Run: node scripts/icons.mjs --write",
  );
  process.exit(1);
} else {
  console.log(`icons: ok (${used.size} names used, ${known.size} listed).`);
}
