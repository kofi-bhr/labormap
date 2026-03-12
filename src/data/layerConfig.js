import * as d3 from 'd3'

/* FIPS code → State name + abbreviation */
export const STATE_FIPS = {
    '01': { name: 'Alabama', abbr: 'AL' },
    '02': { name: 'Alaska', abbr: 'AK' },
    '04': { name: 'Arizona', abbr: 'AZ' },
    '05': { name: 'Arkansas', abbr: 'AR' },
    '06': { name: 'California', abbr: 'CA' },
    '08': { name: 'Colorado', abbr: 'CO' },
    '09': { name: 'Connecticut', abbr: 'CT' },
    '10': { name: 'Delaware', abbr: 'DE' },
    '11': { name: 'District of Columbia', abbr: 'DC' },
    '12': { name: 'Florida', abbr: 'FL' },
    '13': { name: 'Georgia', abbr: 'GA' },
    '15': { name: 'Hawaii', abbr: 'HI' },
    '16': { name: 'Idaho', abbr: 'ID' },
    '17': { name: 'Illinois', abbr: 'IL' },
    '18': { name: 'Indiana', abbr: 'IN' },
    '19': { name: 'Iowa', abbr: 'IA' },
    '20': { name: 'Kansas', abbr: 'KS' },
    '21': { name: 'Kentucky', abbr: 'KY' },
    '22': { name: 'Louisiana', abbr: 'LA' },
    '23': { name: 'Maine', abbr: 'ME' },
    '24': { name: 'Maryland', abbr: 'MD' },
    '25': { name: 'Massachusetts', abbr: 'MA' },
    '26': { name: 'Michigan', abbr: 'MI' },
    '27': { name: 'Minnesota', abbr: 'MN' },
    '28': { name: 'Mississippi', abbr: 'MS' },
    '29': { name: 'Missouri', abbr: 'MO' },
    '30': { name: 'Montana', abbr: 'MT' },
    '31': { name: 'Nebraska', abbr: 'NE' },
    '32': { name: 'Nevada', abbr: 'NV' },
    '33': { name: 'New Hampshire', abbr: 'NH' },
    '34': { name: 'New Jersey', abbr: 'NJ' },
    '35': { name: 'New Mexico', abbr: 'NM' },
    '36': { name: 'New York', abbr: 'NY' },
    '37': { name: 'North Carolina', abbr: 'NC' },
    '38': { name: 'North Dakota', abbr: 'ND' },
    '39': { name: 'Ohio', abbr: 'OH' },
    '40': { name: 'Oklahoma', abbr: 'OK' },
    '41': { name: 'Oregon', abbr: 'OR' },
    '42': { name: 'Pennsylvania', abbr: 'PA' },
    '44': { name: 'Rhode Island', abbr: 'RI' },
    '45': { name: 'South Carolina', abbr: 'SC' },
    '46': { name: 'South Dakota', abbr: 'SD' },
    '47': { name: 'Tennessee', abbr: 'TN' },
    '48': { name: 'Texas', abbr: 'TX' },
    '49': { name: 'Utah', abbr: 'UT' },
    '50': { name: 'Vermont', abbr: 'VT' },
    '51': { name: 'Virginia', abbr: 'VA' },
    '53': { name: 'Washington', abbr: 'WA' },
    '54': { name: 'West Virginia', abbr: 'WV' },
    '55': { name: 'Wisconsin', abbr: 'WI' },
    '56': { name: 'Wyoming', abbr: 'WY' }
}

export const FIPS_CODES = Object.keys(STATE_FIPS)

/* Color interpolators — Vibrant Spy HUD */
function makeInterpolator(hue) {
    return t => d3.interpolateRgb('#0A0A1A', hue)(t)
}

export const LAYERS = {
    unemployment: {
        id: 'unemployment',
        label: 'Unemployment Rate',
        defaultKey: 'U',
        frequency: 'monthly',
        unit: '%',
        source: 'BLS LAUS · API v2',
        interpolator: makeInterpolator('#00FFAA'),
        dataFile: 'unemployment.json'
    },
    participation: {
        id: 'participation',
        label: 'Labor Force Participation',
        defaultKey: 'P',
        frequency: 'monthly',
        unit: '%',
        source: 'BLS LAUS · API v2',
        interpolator: makeInterpolator('#0088FF'),
        dataFile: 'participation.json'
    },
    wage: {
        id: 'wage',
        label: 'Median Household Income',
        defaultKey: 'W',
        frequency: 'annual',
        unit: '$',
        source: 'CENSUS ACS 1-YR',
        interpolator: makeInterpolator('#FF0055'),
        dataFile: 'wage.json'
    },
    education: {
        id: 'education',
        label: "Bachelor's Degree %",
        defaultKey: 'E',
        frequency: 'annual',
        unit: '%',
        source: 'CENSUS ACS 1-YR',
        interpolator: makeInterpolator('#FFCC00'),
        dataFile: 'education.json'
    },
    population: {
        id: 'population',
        label: "Total Population",
        defaultKey: 'O',
        frequency: 'annual',
        unit: 'K',
        source: 'CENSUS ACS 1-YR',
        interpolator: makeInterpolator('#AA00FF'),
        dataFile: 'population.json'
    },
    sector: {
        id: 'sector',
        label: 'Sector Employment',
        defaultKey: 'S',
        frequency: 'monthly',
        unit: 'K',
        source: 'BLS CES · API v2',
        interpolator: makeInterpolator('#00FFAA'),
        dataFile: 'unemployment.json' // sector mode uses unemployment as base fill
    }
}

export const LAYER_IDS = ['unemployment', 'participation', 'wage', 'education', 'population', 'sector']

export const SECTORS = [
    { id: 'leisure', label: 'Leisure & Hosp.', series: 'CES7000000001' },
    { id: 'manufacturing', label: 'Manufacturing', series: 'CES3000000001' },
    { id: 'finance', label: 'Finance', series: 'CES5500000001' },
    { id: 'healthcare', label: 'Health Care', series: 'CES6562000001' },
    { id: 'tech', label: 'Information', series: 'CES5000000001' },
    { id: 'retail', label: 'Retail Trade', series: 'CES4200000001' },
    { id: 'construction', label: 'Construction', series: 'CES2000000001' },
    { id: 'government', label: 'Government', series: 'CES9000000001' },
    { id: 'transport', label: 'Transportation', series: 'CES4300000001' },
    { id: 'mining', label: 'Mining & Logging', series: 'CES1000000001' },
    { id: 'education_svc', label: 'Education Svcs', series: 'CES6561000001' }
]

export const DEFAULT_KEYBINDS = {
    U: 'unemployment',
    P: 'participation',
    W: 'wage',
    E: 'education',
    O: 'population',
    S: 'sector',
    ' ': 'play',
    ArrowLeft: 'stepBack',
    ArrowRight: 'stepForward',
    Escape: 'deselect',
    '1': 'speed1',
    '2': 'speed2',
    '3': 'speed4'
}

/* Compute time indices for a given layer's data */
export function buildTimeIndex(layerData) {
    if (!layerData || !layerData.data) return []
    const firstFips = Object.keys(layerData.data)[0]
    if (!firstFips) return []
    const entries = layerData.data[firstFips]
    return entries.map((e, i) => ({
        index: i,
        year: e.year,
        month: e.month ?? null
    }))
}

/* Format date label for timeline */
export function formatTimeLabel(timeEntry, isAnnual) {
    if (!timeEntry) return ''
    if (isAnnual || !timeEntry.month) {
        const label = String(timeEntry.year)
        return timeEntry.year === 2020 ? label + '*' : label
    }
    const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']
    return `${months[(timeEntry.month || 1) - 1]} ${timeEntry.year}`
}
