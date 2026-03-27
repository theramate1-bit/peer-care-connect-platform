const fs = require("fs");
const path = require("path");

const inputPath = path.join(
  process.env.USERPROFILE || process.env.HOME,
  ".cursor",
  "projects",
  "c-Users-rayma-Desktop-New-folder",
  "agent-tools",
  "15b45518-b172-4a51-9b12-1087251621a6.txt",
);

let raw;
try {
  raw = fs.readFileSync(inputPath, "utf8");
} catch (e) {
  console.error("File not found:", inputPath);
  process.exit(1);
}

// MCP returns { result: "Below is...\n<untrusted>...[array]..." }
// Parse outer JSON first, then extract array from result string
let outer;
try {
  outer = JSON.parse(raw);
} catch (e) {
  console.error("Outer JSON parse error:", e.message);
  process.exit(1);
}

const resultStr = outer.result || raw;
const startIdx = resultStr.indexOf("[{");
if (startIdx < 0) {
  console.error("No JSON array found in result");
  process.exit(1);
}
const endIdx = resultStr.lastIndexOf("}]") + 2;
const arrayStr = resultStr.substring(startIdx, endIdx);

let arr;
try {
  arr = JSON.parse(arrayStr);
} catch (e) {
  console.error("Array JSON parse error:", e.message);
  process.exit(1);
}

const byTable = {};
arr.forEach((r) => {
  const t = r.table_name;
  if (!byTable[t]) byTable[t] = [];
  byTable[t].push(r);
});

const tables = Object.keys(byTable).sort();

let md = `# Complete Database Schema – Every Table

**Source:** Supabase MCP (\`execute_sql\` on \`information_schema.columns\`), project \`aikqnvltuwwgifuocvto\`  
**Generated:** ${new Date().toISOString().split("T")[0]}

This document lists every table in the \`public\` schema with all columns, data types, nullability, and defaults.

---

`;

tables.forEach((t) => {
  md += `## \`${t}\`\n\n`;
  md += `| # | Column | Type | Nullable | Default |\n`;
  md += `|---|--------|------|----------|--------|\n`;
  byTable[t]
    .sort((a, b) => a.ordinal_position - b.ordinal_position)
    .forEach((c, i) => {
      let def = c.column_default;
      if (def == null) def = "—";
      else if (typeof def === "string" && def.length > 60)
        def = def.substring(0, 57) + "…";
      md += `| ${i + 1} | \`${c.column_name}\` | ${c.data_type} | ${c.is_nullable} | ${def} |\n`;
    });
  md += "\n";
});

const outPath = path.join(
  __dirname,
  "..",
  "docs",
  "architecture",
  "database-complete-schema.md",
);
fs.writeFileSync(outPath, md, "utf8");
console.log("Written", tables.length, "tables to", outPath);
