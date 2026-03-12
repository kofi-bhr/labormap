/**
 * fetch-bls.js — Fetch BLS LAUS + CES data
 * Run: node scripts/fetch-bls.js
 * Requires: VITE_BLS_API_KEY in .env
 */
import { writeFileSync, readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT = join(__dirname, '..', 'public', 'data')

// Load API key from .env
const envFile = readFileSync(join(__dirname, '..', '.env'), 'utf-8')
const API_KEY = envFile.match(/VITE_BLS_API_KEY=(.+)/)?.[1]?.trim()
if (!API_KEY) { console.error('Missing VITE_BLS_API_KEY in .env'); process.exit(1) }

const BLS_URL = 'https://api.bls.gov/publicAPI/v2/timeseries/data/'

const FIPS_CODES = [
    '01', '02', '04', '05', '06', '08', '09', '10', '11', '12',
    '13', '15', '16', '17', '18', '19', '20', '21', '22', '23',
    '24', '25', '26', '27', '28', '29', '30', '31', '32', '33',
    '34', '35', '36', '37', '38', '39', '40', '41', '42', '44',
    '45', '46', '47', '48', '49', '50', '51', '53', '54', '55', '56'
]

async function fetchBLS(seriesIds, startYear, endYear) {
    // BLS allows max 50 series per request
    const chunks = []
    for (let i = 0; i < seriesIds.length; i += 50) {
        chunks.push(seriesIds.slice(i, i + 50))
    }

    const allResults = {}
    for (const chunk of chunks) {
        const body = {
            seriesid: chunk,
            startyear: String(startYear),
            endyear: String(endYear),
            annualaverage: false,
            registrationKey: API_KEY
        }
        console.log(`  Fetching ${chunk.length} series (${startYear}-${endYear})...`)
        const resp = await fetch(BLS_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        })
        const json = await resp.json()

        if (json.status !== 'REQUEST_SUCCEEDED') {
            console.error('BLS API error:', json.message || json.status)
            continue
        }

        for (const series of json.Results.series) {
            allResults[series.seriesID] = series.data
        }

        // Rate limit pause
        if (chunks.length > 1) await new Promise(r => setTimeout(r, 1000))
    }
    return allResults
}

function normalizeLAUS(raw, seriesPattern, layer, unit) {
    const data = {}

    for (const fips of FIPS_CODES) {
        const paddedFips = fips.padEnd(6, '0') // e.g. "010000"
        const seriesId = seriesPattern.replace('{FIPS}', paddedFips)
        const seriesData = raw[seriesId]

        if (!seriesData) {
            console.warn(`  Missing series: ${seriesId}`)
            data[fips] = []
            continue
        }

        // BLS returns data newest-first, reverse it
        const entries = seriesData
            .filter(d => d.period.startsWith('M') && d.period !== 'M13')
            .map(d => ({
                year: parseInt(d.year),
                month: parseInt(d.period.replace('M', '')),
                value: d.value === '-' ? null : parseFloat(d.value)
            }))
            .sort((a, b) => a.year - b.year || a.month - b.month)

        data[fips] = entries
    }

    return {
        meta: { layer, unit, source: 'BLS LAUS', series_id_pattern: seriesPattern, frequency: 'monthly', last_updated: new Date().toISOString().split('T')[0] },
        data
    }
}

async function main() {
    console.log('Fetching BLS LAUS data...')

    // We need to split into multiple year ranges because BLS v2 allows max 20 years
    // Unemployment rate (series code 03)
    const unempIds = FIPS_CODES.map(f => `LASST${f.padEnd(6, '0')}0000000003`)
    const unempRaw = await fetchBLS(unempIds, 2014, 2024)
    const unemployment = normalizeLAUS(unempRaw, 'LASST{FIPS}0000000003', 'unemployment', 'percent')
    writeFileSync(join(OUT, 'unemployment.json'), JSON.stringify(unemployment))
    console.log('  ✓ unemployment.json')

    // Labor force participation (series code 06)
    const partIds = FIPS_CODES.map(f => `LASST${f.padEnd(6, '0')}0000000006`)
    const partRaw = await fetchBLS(partIds, 2014, 2024)
    const participation = normalizeLAUS(partRaw, 'LASST{FIPS}0000000006', 'participation', 'percent')
    writeFileSync(join(OUT, 'participation.json'), JSON.stringify(participation))
    console.log('  ✓ participation.json')

    // CES sector data (national)
    console.log('Fetching BLS CES sector data...')
    const sectorSeries = [
        'CES7000000001', 'CES3000000001', 'CES5500000001', 'CES6562000001',
        'CES5000000001', 'CES4200000001', 'CES2000000001', 'CES9000000001',
        'CES4300000001', 'CES1000000001', 'CES6561000001'
    ]
    const sectorNames = [
        'Leisure & Hospitality', 'Manufacturing', 'Financial Activities', 'Health Care',
        'Information', 'Retail Trade', 'Construction', 'Government',
        'Transportation', 'Mining & Logging', 'Education Services'
    ]
    const sectorRaw = await fetchBLS(sectorSeries, 2014, 2024)
    const sectors = { meta: { layer: 'sectors', unit: 'thousands', source: 'BLS CES', frequency: 'monthly', last_updated: new Date().toISOString().split('T')[0] }, sectors: {} }
    for (let i = 0; i < sectorSeries.length; i++) {
        const id = sectorSeries[i]
        const rawData = sectorRaw[id] || []
        const entries = rawData
            .filter(d => d.period.startsWith('M') && d.period !== 'M13')
            .map(d => ({
                year: parseInt(d.year),
                month: parseInt(d.period.replace('M', '')),
                value: d.value === '-' ? null : parseFloat(d.value)
            }))
            .sort((a, b) => a.year - b.year || a.month - b.month)
        sectors.sectors[id] = { name: sectorNames[i], data: entries }
    }
    writeFileSync(join(OUT, 'sectors.json'), JSON.stringify(sectors))
    console.log('  ✓ sectors.json')

    console.log('\nBLS data fetch complete.')
}

main().catch(console.error)
