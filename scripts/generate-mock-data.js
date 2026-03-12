/*
 * Generate realistic mock data for Labor Atlas development.
 * Run: node scripts/generate-mock-data.js
 * Writes JSON files to public/data/
 */
import { writeFileSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT = join(__dirname, '..', 'public', 'data')
mkdirSync(OUT, { recursive: true })

const FIPS = [
    '01', '02', '04', '05', '06', '08', '09', '10', '11', '12',
    '13', '15', '16', '17', '18', '19', '20', '21', '22', '23',
    '24', '25', '26', '27', '28', '29', '30', '31', '32', '33',
    '34', '35', '36', '37', '38', '39', '40', '41', '42', '44',
    '45', '46', '47', '48', '49', '50', '51', '53', '54', '55', '56'
]

function seededRandom(seed) {
    let s = seed
    return () => {
        s = (s * 16807 + 0) % 2147483647
        return s / 2147483647
    }
}

/* ── Monthly BLS-style data (2014–2024) ── */
function generateMonthly(baseFn, unit, layer, source, seriesPattern) {
    const data = {}
    for (const fips of FIPS) {
        const rand = seededRandom(parseInt(fips, 10) * 31 + 7)
        const entries = []
        for (let y = 2014; y <= 2024; y++) {
            for (let m = 1; m <= 12; m++) {
                if (y === 2024 && m > 10) continue // lag
                const base = baseFn(fips, rand)
                // Add cyclical + trend noise
                const seasonal = Math.sin((m / 12) * Math.PI * 2) * (base * 0.08)
                const trend = (y - 2014) * (rand() - 0.5) * 0.15
                const noise = (rand() - 0.5) * base * 0.05
                let value = base + seasonal + trend + noise
                // COVID spike for unemployment
                if (layer === 'unemployment' && y === 2020 && m >= 3 && m <= 6) {
                    value += (6 - Math.abs(m - 4)) * 2.5
                }
                if (layer === 'participation' && y === 2020 && m >= 3 && m <= 6) {
                    value -= (6 - Math.abs(m - 4)) * 1.5
                }
                entries.push({ year: y, month: m, value: Math.round(Math.max(0.5, value) * 10) / 10 })
            }
        }
        data[fips] = entries
    }
    return {
        meta: { layer, unit, source, series_id_pattern: seriesPattern, frequency: 'monthly', last_updated: '2025-01-15' },
        data
    }
}

/* ── Annual Census-style data (2005–2023, missing 2020) ── */
function generateAnnual(baseFn, unit, layer, source) {
    const data = {}
    for (const fips of FIPS) {
        const rand = seededRandom(parseInt(fips, 10) * 17 + 3)
        const entries = []
        for (let y = 2005; y <= 2023; y++) {
            if (y === 2020) {
                entries.push({ year: y, value: null }) // COVID ACS gap
                continue
            }
            const base = baseFn(fips, rand)
            const trend = (y - 2005) * (rand() * 0.3 + 0.1)
            const noise = (rand() - 0.5) * base * 0.04
            let value = base + trend + noise
            if (unit === '$') value = Math.round(value / 100) * 100
            else value = Math.round(value * 10) / 10
            entries.push({ year: y, value: Math.max(0, value) })
        }
        data[fips] = entries
    }
    return {
        meta: { layer, unit, source, frequency: 'annual', last_updated: '2025-01-15' },
        data
    }
}

// Unemployment: base 3–8%
const unemployment = generateMonthly(
    (fips, rand) => 3 + rand() * 5,
    'percent', 'unemployment', 'BLS LAUS', 'LASST{FIPS}0000000000003'
)

// Participation: base 55–70%
const participation = generateMonthly(
    (fips, rand) => 55 + rand() * 15,
    'percent', 'participation', 'BLS LAUS', 'LASST{FIPS}0000000000006'
)

// Wage (median HH income): base $40k–$85k
const wage = generateAnnual(
    (fips, rand) => 40000 + rand() * 45000,
    '$', 'wage', 'CENSUS ACS 1-YR'
)

// Education (bachelor's %): base 18–42%
const education = generateAnnual(
    (fips, rand) => 18 + rand() * 24,
    'percent', 'education', 'CENSUS ACS 1-YR'
)

// Age (median age): base 30–42
const age = generateAnnual(
    (fips, rand) => 30 + rand() * 12,
    'years', 'age', 'CENSUS ACS 1-YR'
)

// Sectors (national, monthly)
const SECTOR_IDS = [
    'CES7000000001', 'CES3000000001', 'CES5500000001', 'CES6562000001',
    'CES5000000001', 'CES4200000001', 'CES2000000001', 'CES9000000001',
    'CES4300000001', 'CES1000000001', 'CES6561000001'
]
const SECTOR_NAMES = [
    'Leisure & Hospitality', 'Manufacturing', 'Financial Activities', 'Health Care',
    'Information', 'Retail Trade', 'Construction', 'Government',
    'Transportation', 'Mining & Logging', 'Education Services'
]
const sectorData = {}
for (let i = 0; i < SECTOR_IDS.length; i++) {
    const rand = seededRandom(i * 37 + 11)
    const base = 5000 + rand() * 15000
    const entries = []
    for (let y = 2014; y <= 2024; y++) {
        for (let m = 1; m <= 12; m++) {
            if (y === 2024 && m > 10) continue
            const trend = (y - 2014) * rand() * 50
            const seasonal = Math.sin((m / 12) * Math.PI * 2) * base * 0.03
            let value = base + trend + seasonal + (rand() - 0.5) * 200
            if (y === 2020 && m >= 3 && m <= 6) value *= (0.7 + Math.abs(m - 4) * 0.05)
            entries.push({ year: y, month: m, value: Math.round(value) })
        }
    }
    sectorData[SECTOR_IDS[i]] = { name: SECTOR_NAMES[i], data: entries }
}

const sectors = {
    meta: { layer: 'sectors', unit: 'thousands', source: 'BLS CES', frequency: 'monthly', last_updated: '2025-01-15' },
    sectors: sectorData
}

// FRED national (monthly)
const fredEntries = []
const fredRand = seededRandom(42)
for (let y = 2014; y <= 2024; y++) {
    for (let m = 1; m <= 12; m++) {
        if (y === 2024 && m > 10) continue
        const unrate = 4 + Math.sin((y - 2014 + m / 12) * 0.5) * 1.5 + (fredRand() - 0.5) * 0.3
        const civpart = 63 - (y - 2014) * 0.1 + (fredRand() - 0.5) * 0.5
        const emratio = 60 + Math.sin((y - 2014 + m / 12) * 0.3) * 1 + (fredRand() - 0.5) * 0.3
        // COVID shock
        const covid = (y === 2020 && m >= 3 && m <= 6) ? 1 : 0
        fredEntries.push({
            year: y, month: m,
            UNRATE: Math.round((unrate + covid * 8) * 10) / 10,
            CIVPART: Math.round((civpart - covid * 4) * 10) / 10,
            EMRATIO: Math.round((emratio - covid * 6) * 10) / 10
        })
    }
}

const fred = {
    meta: { source: 'FRED', frequency: 'monthly', last_updated: '2025-01-15' },
    data: fredEntries
}

/* Write all files */
const files = {
    'unemployment.json': unemployment,
    'participation.json': participation,
    'wage.json': wage,
    'education.json': education,
    'age.json': age,
    'sectors.json': sectors,
    'fred_national.json': fred
}

for (const [name, content] of Object.entries(files)) {
    writeFileSync(join(OUT, name), JSON.stringify(content), 'utf-8')
    console.log(`  ✓ ${name}`)
}

console.log('\nMock data generated successfully.')
