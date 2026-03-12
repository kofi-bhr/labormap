/**
 * fetch-fred.js — Fetch FRED national series
 * Run: node scripts/fetch-fred.js
 * Requires: VITE_FRED_API_KEY in .env
 */
import { writeFileSync, readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT = join(__dirname, '..', 'public', 'data')

const envFile = readFileSync(join(__dirname, '..', '.env'), 'utf-8')
const API_KEY = envFile.match(/VITE_FRED_API_KEY=(.+)/)?.[1]?.trim()
if (!API_KEY) { console.error('Missing VITE_FRED_API_KEY in .env'); process.exit(1) }

const BASE = 'https://api.stlouisfed.org/fred/series/observations'

const SERIES = ['UNRATE', 'CIVPART', 'EMRATIO']

async function fetchSeries(seriesId) {
    const url = `${BASE}?series_id=${seriesId}&observation_start=2014-01-01&api_key=${API_KEY}&file_type=json`
    console.log(`  Fetching ${seriesId}...`)
    const resp = await fetch(url)
    const json = await resp.json()
    return json.observations || []
}

async function main() {
    console.log('Fetching FRED data...\n')

    const allObs = {}
    for (const id of SERIES) {
        const obs = await fetchSeries(id)
        for (const o of obs) {
            const [y, m] = o.date.split('-').map(Number)
            const key = `${y}-${m}`
            if (!allObs[key]) allObs[key] = { year: y, month: m }
            allObs[key][id] = o.value === '.' ? null : parseFloat(o.value)
        }
        await new Promise(r => setTimeout(r, 300))
    }

    const data = Object.values(allObs).sort((a, b) => a.year - b.year || a.month - b.month)

    const output = {
        meta: { source: 'FRED', frequency: 'monthly', last_updated: new Date().toISOString().split('T')[0] },
        data
    }

    writeFileSync(join(OUT, 'fred_national.json'), JSON.stringify(output))
    console.log('  ✓ fred_national.json\n')
    console.log('FRED data fetch complete.')
}

main().catch(console.error)
