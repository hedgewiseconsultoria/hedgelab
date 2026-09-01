import fs from "node:fs";
const catalog = JSON.parse(fs.readFileSync("b3-snapshots/2026-08-24/catalog.json", "utf8"));
const symbols = new Set(["DOLV26", "WDOV26"]);
const rows = catalog.rows.filter(row => symbols.has(row.symbol));
const margins = catalog.marginRows ?? [];
console.log(JSON.stringify(rows.map(row => ({ symbol: row.symbol, family: row.family, instrumentId: row.instrumentId, maturity: row.maturity, adjustedQuote: row.adjustedQuote, lastPrice: row.lastPrice, financialInstrumentQuantity: row.financialInstrumentQuantity, margin: margins.find(item => item.instrumentId === row.instrumentId) })), null, 2));
console.log(JSON.stringify(margins.filter(item => symbols.has(item.symbol)), null, 2));
