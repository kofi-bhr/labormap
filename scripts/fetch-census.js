/**
 * fetch-census.js — Fetch Census ACS 1-Year subject tables
 * Run: node scripts/fetch-census.js
 * Requires: VITE_CENSUS_API_KEY in .env
 */
import { writeFileSync, readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT = join(__dirname, '..', 'public', 'data')

const envFile = readFileSync(join(__dirname, '..', '.env'), 'utf-8')
const API_KEY = envFile.match(/VITE_CENSUS_API_KEY=(.+)/)?.[1]?.trim()
if (!API_KEY) { console.error('Missing VITE_CENSUS_API_KEY in .env'); process.exit(1) }

const BASE = 'https://api.census.gov/data'

// Variables we need per year
const VARIABLES = {
    wage: { var: 'S1903_C03_001E', table: 'subject', unit: '$' },
    education: { var: 'S1501_C02_015E', table: 'subject', unit: 'percent' },
    age: { var: 'S0101_C01_030E', table: 'subject', unit: 'years' },
    population: { var: 'S0101_C01_001E', table: 'subject', unit: 'K' }
}

// Years to fetch (ACS 1-Year: 2005-2023, skip 2020)
const YEARS = []
for (let y = 2010; y <= 2023; y++) YEARS.push(y)

async function fetchACSVariable(varId, table, years) {
    const stateData = {} // fips -> [{year, value}]

    for (const year of years) {
        if (year === 2020) {
            // 2020 ACS 1-Year not released — COVID gap
            continue
        }

        const url = `${BASE}/${year}/acs/acs1/${table}?get=NAME,${varId}&for=state:*&key=${API_KEY}`
        console.log(`  Fetching ${varId} for ${year}...`)

        try {
            const resp = await fetch(url)
            if (!resp.ok) {
                console.warn(`  ⚠ ${year}: HTTP ${resp.status}`)
                continue
            }
            const json = await resp.json()
            // Response: [[header...], [values...], ...]
            const headers = json[0]
            const nameIdx = headers.indexOf('NAME')
            const valIdx = headers.indexOf(varId)
            const stateIdx = headers.indexOf('state')

            for (let i = 1; i < json.length; i++) {
                const row = json[i]
                const fips = row[stateIdx]
                const rawVal = row[valIdx]
                let value = rawVal == null || rawVal === '' || rawVal === '-' ? null : parseFloat(rawVal)

                if (value != null && varId === 'S0101_C01_001E') value = value / 1000; // Scale population to K

                if (!stateData[fips]) stateData[fips] = []
                stateData[fips].push({ year, value })
            }
        } catch (err) {
            console.warn(`  ⚠ ${year}: ${err.message}`)
        }

        // Rate limit
        await new Promise(r => setTimeout(r, 300))
    }

    // Insert null for 2020
    for (const fips of Object.keys(stateData)) {
        stateData[fips].push({ year: 2020, value: null })
        stateData[fips].sort((a, b) => a.year - b.year)
    }

    return stateData
}

async function main() {
    console.log('Fetching Census ACS data...\n')

    for (const [layer, config] of Object.entries(VARIABLES)) {
        console.log(`Layer: ${layer}`)
        const stateData = await fetchACSVariable(config.var, config.table, YEARS)

        const output = {
            meta: {
                layer,
                unit: config.unit,
                source: 'CENSUS ACS 1-YR',
                frequency: 'annual',
                last_updated: new Date().toISOString().split('T')[0]
            },
            data: stateData
        }

        writeFileSync(join(OUT, `${layer}.json`), JSON.stringify(output))
        console.log(`  ✓ ${layer}.json\n`)
    }

    console.log('Census data fetch complete.')
}

main().catch(console.error)
