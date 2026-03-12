import { LAYERS } from '../data/layerConfig.js'

/**
 * useTimeData — data lookup with linear interpolation for continuous timeIndex
 * PRD §14.3: interpolates between adjacent data points for smooth animation
 */

/** Get the time entries array for a given layer dataset */
export function getTimeEntries(layerData) {
    if (!layerData?.data) return []
    const firstFips = Object.keys(layerData.data)[0]
    if (!firstFips) return []
    return layerData.data[firstFips]
}

/** Get value for a state at a (possibly non-integer) timeIndex with interpolation */
export function getValueForState(fips, layerData, timeIndex) {
    if (!layerData?.data?.[fips]) return null
    const entries = layerData.data[fips]
    if (!entries.length) return null

    const idx = Math.max(0, Math.min(timeIndex, entries.length - 1))
    const lo = Math.floor(idx)
    const hi = Math.min(lo + 1, entries.length - 1)
    const t = idx - lo

    const vLo = entries[lo]?.value
    const vHi = entries[hi]?.value

    if (vLo == null && vHi == null) return null
    if (vLo == null) return vHi
    if (vHi == null) return vLo

    return vLo + (vHi - vLo) * t
}

/** Compute global min/max across all states for full time range — PRD §14.2 anchoring */
export function getLayerDomain(layerData) {
    if (!layerData?.data) return [0, 1]
    let min = Infinity, max = -Infinity
    for (const entries of Object.values(layerData.data)) {
        for (const e of entries) {
            if (e.value != null) {
                if (e.value < min) min = e.value
                if (e.value > max) max = e.value
            }
        }
    }
    return [min === Infinity ? 0 : min, max === -Infinity ? 1 : max]
}

/** Get national average at a given time index (average across all states) */
export function getNationalAvg(layerData, timeIndex) {
    if (!layerData?.data) return null
    let sum = 0, count = 0
    for (const fips of Object.keys(layerData.data)) {
        const v = getValueForState(fips, layerData, timeIndex)
        if (v != null) { sum += v; count++ }
    }
    return count > 0 ? sum / count : null
}

/** Get delta from previous period */
export function getDelta(fips, layerData, timeIndex) {
    const curr = getValueForState(fips, layerData, Math.floor(timeIndex))
    const prev = getValueForState(fips, layerData, Math.max(0, Math.floor(timeIndex) - 1))
    if (curr == null || prev == null) return null
    return Math.round((curr - prev) * 10) / 10
}

/** Get max time index for layer data */
export function getMaxTimeIndex(layerData) {
    if (!layerData?.data) return 0
    const firstFips = Object.keys(layerData.data)[0]
    if (!firstFips) return 0
    return Math.max(0, layerData.data[firstFips].length - 1)
}

/** Format value for display */
export function formatValue(value, unit) {
    if (value == null) return '—'
    if (unit === '$') return '$' + Math.round(value).toLocaleString()
    if (unit === 'K') return Math.round(value).toLocaleString() + 'K'
    return value.toFixed(1) + '%'
}

/** Get the full state time series as [{x: year.month, y: value}] for charts */
export function getStateSeries(fips, layerData) {
    if (!layerData?.data?.[fips]) return []
    return layerData.data[fips].map((e, i) => ({
        x: e.year + (e.month ? (e.month - 1) / 12 : 0),
        y: e.value,
        index: i
    }))
}

/** Get all states' values at a given time index for scatter/bar charts */
export function getAllStatesAtTime(layerData, timeIndex) {
    if (!layerData?.data) return []
    const result = []
    for (const [fips, entries] of Object.entries(layerData.data)) {
        const v = getValueForState(fips, layerData, timeIndex)
        result.push({ fips, value: v })
    }
    return result.filter(d => d.value != null)
}
