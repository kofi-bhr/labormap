import { STATE_FIPS } from '../data/layerConfig.js'
import { getValueForState, getDelta, formatValue } from '../hooks/useTimeData.js'

/**
 * Tooltip — PRD §7.4
 * Appears on hover, 12px above cursor. State name + value + delta.
 * Clamped to not clip outside map container.
 */
export default function Tooltip({ hoveredState, layerData, activeLayer, timeIndex, mousePos, containerRect }) {
    if (!hoveredState || !mousePos) return null

    const stateInfo = STATE_FIPS[hoveredState]
    if (!stateInfo) return null

    const value = getValueForState(hoveredState, layerData, timeIndex)
    const delta = getDelta(hoveredState, layerData, timeIndex)
    const { unit } = activeLayer

    // Position — 12px above cursor, clamped
    let x = mousePos.x
    let y = mousePos.y - 12

    // Approximate tooltip size for clamping
    const tooltipW = 160
    const tooltipH = 28
    const containerW = containerRect?.width || 1000
    const containerH = containerRect?.height || 600

    if (x + tooltipW / 2 > containerW) x = containerW - tooltipW / 2
    if (x - tooltipW / 2 < 0) x = tooltipW / 2
    if (y - tooltipH < 0) y = tooltipH + 24

    const deltaStr = delta != null
        ? ` ${delta > 0 ? '↑' : delta < 0 ? '↓' : '→'} ${Math.abs(delta).toFixed(1)}${unit === '$' ? '' : 'pp'}`
        : ''

    return (
        <div
            className="map-tooltip"
            style={{
                left: x,
                top: y,
                transform: 'translate(-50%, -100%)'
            }}
        >
            <span style={{ color: '#111111' }}>{stateInfo.name}</span>
            <span style={{ color: '#888888', marginLeft: 8 }}>
                {formatValue(value, unit)}{deltaStr}
            </span>
        </div>
    )
}
