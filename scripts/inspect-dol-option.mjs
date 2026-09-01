import fs from "node:fs";
const catalog = JSON.parse(fs.readFileSync("b3-snapshots/2026-08-24/catalog.json", "utf8"));
const rows = catalog.rows.filter(row => row.symbol === "DOLV26C005350");
console.log(JSON.stringify(rows, null, 2));
