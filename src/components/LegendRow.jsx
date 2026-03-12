import { useRef, useEffect, useState, useCallback } from 'react'
import * as d3 from 'd3'
import { LAYERS, LAYER_IDS } from '../data/layerConfig.js'
import { getLayerDomain, getNationalAvg, formatValue } from '../hooks/useTimeData.js'

/**
 * LegendRow — PRD §10
 * Color ramp + min/max labels + national avg tick + keybind chips
 */
export default function LegendRow({
    activeLayer, layerData, timeIndex,
    keybindState
}) {
    const { keybinds, actionToKey, editingKey, setEditingKey, conflict, remapKey } = keybindState
    const layer = LAYERS[activeLayer]
    const [min, max] = getLayerDomain(layerData)
    const nationalAvg = getNationalAvg(layerData, timeIndex)

    const rampRef = useRef(null)

    // Draw color ramp via canvas
    useEffect(() => {
        if (!rampRef.current) return
        const canvas = rampRef.current
        const ctx = canvas.getContext('2d')
        const w = canvas.width
        const h = canvas.height
        for (let x = 0; x < w; x++) {
            const t = x / w
            ctx.fillStyle = layer.interpolator(t)
            ctx.fillRect(x, 0, 1, h)
        }
    }, [activeLayer, layer])

    // Keybind actions to show
    const chipActions = [
        { action: 'unemployment', label: 'Unemployment' },
        { action: 'participation', label: 'Participation' },
        { action: 'wage', label: 'Wage' },
        { action: 'education', label: 'Education' },
        { action: 'sector', label: 'Sectors' },
        { action: 'play', label: 'Play/Pause' },
        { action: 'stepBack', label: 'Step' },
        { action: 'stepForward', label: 'Step' }
    ]

    const formatKey = (k) => {
        if (k === ' ') return '⎵'
        if (k === 'ArrowLeft') return '←'
        if (k === 'ArrowRight') return '→'
        return k.toUpperCase()
    }

    return (
        <div className="legend-row fade-up fade-delay-3">
            {/* §10.1 Color scale legend */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div>
                    <div className="t-10" style={{ color: 'var(--text-secondary)', marginBottom: 1 }}>{layer.label}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, position: 'relative' }}>
                        <span className="t-10" style={{ color: 'var(--text-secondary)' }}>{formatValue(min, layer.unit)}</span>
                        <canvas
                            ref={rampRef}
                            width={200}
                            height={8}
                            style={{ display: 'block', width: 200, height: 8 }}
                        />
                        <span className="t-10" style={{ color: 'var(--text-secondary)' }}>{formatValue(max, layer.unit)}</span>
                        {/* National avg tick */}
                        {nationalAvg != null && max > min && (
                            <div style={{
                                position: 'absolute',
                                left: `${((nationalAvg - min) / (max - min)) * 200 + 30}px`,
                                top: 8,
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center'
                            }}>
                                <div style={{ width: 1, height: 4, background: 'var(--text-primary)' }} />
                                <span style={{ fontSize: 8, color: 'var(--text-secondary)', fontFamily: 'var(--font)' }}>avg</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* §10.2 Keybind chips */}
            <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'nowrap', gap: 0 }}>
                {chipActions.map(({ action, label }) => {
                    const key = actionToKey[action]
                    const isEditing = editingKey === action
                    const hasConflict = conflict === action

                    return (
                        <div key={action} className="keybind-chip">
                            {isEditing ? (
                                <input
                                    autoFocus
                                    maxLength={1}
                                    style={{
                                        width: 16, height: 16, textAlign: 'center',
                                        border: '1px solid var(--text-primary)', fontSize: 9,
                                        fontFamily: 'var(--font)', padding: 0
                                    }}
                                    onKeyDown={(e) => {
                                        e.preventDefault()
                                        e.stopPropagation()
                                        remapKey(action, e.key)
                                    }}
                                    onBlur={() => setEditingKey(null)}
                                />
                            ) : (
                                <span
                                    className="key"
                                    onClick={() => setEditingKey(action)}
                                    style={{ cursor: 'pointer' }}
                                >
                                    {key ? formatKey(key) : '?'}
                                </span>
                            )}
                            <span className="label">
                                {hasConflict ? 'KEY IN USE' : label}
                            </span>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
