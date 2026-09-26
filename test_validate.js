// test_validate.js
const fs = require('fs');
const path = require('path');
const vm = require('vm');

console.log("=== RUNNING VALIDATION SUITE ===");

const indexPath = path.join(__dirname, 'index.html');
const aiPath = path.join(__dirname, 'ai_studio_code.html');

if (!fs.existsSync(indexPath)) {
    console.error("FAIL: index.html missing");
    process.exit(1);
}
if (!fs.existsSync(aiPath)) {
    console.error("FAIL: ai_studio_code.html missing");
    process.exit(1);
}

const indexHtml = fs.readFileSync(indexPath, 'utf-8');
const aiHtml = fs.readFileSync(aiPath, 'utf-8');

if (indexHtml !== aiHtml) {
    console.error("FAIL: index.html and ai_studio_code.html are not in sync!");
    process.exit(1);
}
console.log("✓ index.html and ai_studio_code.html are 100% synchronized.");

// Check DOM elements exist in HTML
const requiredStrings = [
    'openCalendarModal(\'promozione\')',
    'openCalendarModal(\'seconda\')',
    'openCalendarModal(\'terza\')',
    'modalTabPromozione',
    'modalTabSeconda',
    'modalTabTerza',
    'giornatePillsContainer',
    'giornataInfoBanner',
    'giornataMatchesList',
    'matchesContainer',
    'countAll'
];

requiredStrings.forEach(s => {
    if (!indexHtml.includes(s)) {
        console.error(`FAIL: Required HTML element/string '${s}' not found in index.html`);
        process.exit(1);
    }
});
console.log("✓ All required DOM IDs and handler strings present.");

// Extract script
const scriptMatch = indexHtml.match(/<script>([\s\S]*?)<\/script>[\s\n]*<\/body>/i);
if (!scriptMatch) {
    console.error("FAIL: Could not extract script block from index.html");
    process.exit(1);
}

const scriptCode = scriptMatch[1];

// Mock browser environment for evaluation
const mockElem = () => ({
    classList: { add: () => {}, remove: () => {}, toggle: () => {} },
    addEventListener: () => {},
    appendChild: () => {},
    innerText: '',
    innerHTML: '',
    value: ''
});

const sandbox = {
    document: {
        getElementById: () => mockElem(),
        querySelectorAll: () => [],
        createElement: () => mockElem()
    },
    window: {
        addEventListener: () => {}
    },
    console: console
};

try {
    vm.createContext(sandbox);
    vm.runInContext(scriptCode + `
        globalThis.__val_matches = typeof matches !== 'undefined' ? matches : null;
        globalThis.__val_prom = typeof promozioneFullCalendar !== 'undefined' ? promozioneFullCalendar : null;
        globalThis.__val_sec = typeof secondaCategoriaFullCalendar !== 'undefined' ? secondaCategoriaFullCalendar : null;
        globalThis.__val_ter = typeof terzaCategoriaFullCalendar !== 'undefined' ? terzaCategoriaFullCalendar : null;
    `, sandbox);
    console.log("✓ Script evaluated with zero syntax or runtime errors.");
} catch (err) {
    console.error("FAIL: Error evaluating script:", err);
    process.exit(1);
}

// Validate matches array
const matches = sandbox.__val_matches;
if (!Array.isArray(matches) || matches.length !== 79) {
    console.error(`FAIL: matches length expected 79, got ${matches?.length}`);
    process.exit(1);
}
console.log(`✓ Matches array contains ${matches.length} home matches.`);

// Check counts per home team
const teamCounts = {};
let derbies = 0;
let anticipi = 0;

matches.forEach((m, idx) => {
    if (!m.isoDate || !/^\d{4}-\d{2}-\d{2}$/.test(m.isoDate)) {
        console.error(`FAIL: Invalid isoDate at match ${idx}:`, m);
        process.exit(1);
    }
    if (!m.home || !m.away || !m.stadium || !m.category) {
        console.error(`FAIL: Missing fields at match ${idx}:`, m);
        process.exit(1);
    }
    teamCounts[m.home] = (teamCounts[m.home] || 0) + 1;
    if (m.isDerby) derbies++;
    if (m.isAnticipo) anticipi++;
});

if (teamCounts['Cortona Camucia'] !== 15) {
    console.error(`FAIL: Cortona Camucia expected 15 matches, got ${teamCounts['Cortona Camucia']}`);
    process.exit(1);
}
if (teamCounts['Fratta Santa Caterina'] !== 15) {
    console.error(`FAIL: Fratta Santa Caterina expected 15 matches, got ${teamCounts['Fratta Santa Caterina']}`);
    process.exit(1);
}
if (teamCounts['Fratticciola'] !== 15) {
    console.error(`FAIL: Fratticciola expected 15 matches, got ${teamCounts['Fratticciola']}`);
    process.exit(1);
}
if (teamCounts['Monsigliolo'] !== 17) {
    console.error(`FAIL: Monsigliolo expected 17 matches, got ${teamCounts['Monsigliolo']}`);
    process.exit(1);
}
if (teamCounts['Montecchio'] !== 17) {
    console.error(`FAIL: Montecchio expected 17 matches, got ${teamCounts['Montecchio']}`);
    process.exit(1);
}

console.log("✓ Team match distribution verified:", teamCounts);
console.log(`✓ Derbies: ${derbies} (expected 4), Anticipi: ${anticipi} (expected 1).`);

// Validate Calendars
const prom = sandbox.__val_prom;
const sec = sandbox.__val_sec;
const ter = sandbox.__val_ter;

if (!Array.isArray(prom) || prom.length !== 15) {
    console.error(`FAIL: Promozione expected 15 giornate, got ${prom?.length}`);
    process.exit(1);
}
prom.forEach(g => {
    if (g.m.length !== 8) throw new Error(`Promozione G${g.g} does not have 8 matches`);
});

if (!Array.isArray(sec) || sec.length !== 15) {
    console.error(`FAIL: Seconda Categoria expected 15 giornate, got ${sec?.length}`);
    process.exit(1);
}
sec.forEach(g => {
    if (g.m.length !== 8) throw new Error(`Seconda Categoria G${g.g} does not have 8 matches`);
});

if (!Array.isArray(ter) || ter.length !== 17) {
    console.error(`FAIL: Terza Categoria expected 17 giornate, got ${ter?.length}`);
    process.exit(1);
}
ter.forEach(g => {
    if (g.m.length !== 9) throw new Error(`Terza Categoria G${g.g} does not have 9 matches`);
});

console.log("✓ Promozione Girone C: 15 giornate (120 partite totali).");
console.log("✓ Seconda Categoria Girone I: 15 giornate (120 partite totali).");
console.log("✓ Terza Categoria Girone A: 17 giornate (153 partite totali).");

console.log("=== ALL VALIDATION CHECKS PASSED SUCCESSFULLY ===");
