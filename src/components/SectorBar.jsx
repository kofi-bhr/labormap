import { SECTORS } from '../data/layerConfig.js'

/**
 * SectorBar — PRD §12
 * 24px tab row shown when sector layer is active.
 * Sector data is NATIONAL only — indicated with ⓘ marker.
 */
export default function SectorBar({ activeSector, onSelect }) {
    return (
        <div className="sector-bar fade-up" style={{ animationDelay: '0ms' }}>
            <span className="t-10" style={{ color: '#888888', marginRight: 12, whiteSpace: 'nowrap', flexShrink: 0 }}>
                SECTOR
            </span>
            {SECTORS.map(s => (
                <button
                    key={s.id}
                    onClick={() => onSelect(s.id)}
                    className="t-10"
                    style={{
                        padding: '0 10px',
                        height: 24,
                        whiteSpace: 'nowrap',
                        color: activeSector === s.id ? '#111111' : '#BBBBBB',
                        borderBottom: activeSector === s.id ? '1px solid #111111' : '1px solid transparent',
                        flexShrink: 0,
                        transition: 'color 150ms, border-color 150ms'
                    }}
                >
                    {s.label}
                </button>
            ))}
            <span className="t-10" style={{ color: '#888888', marginLeft: 12, whiteSpace: 'nowrap', flexShrink: 0 }}>
                ⓘ national series
            </span>
        </div>
    )
}
