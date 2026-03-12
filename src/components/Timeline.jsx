import { useCallback } from 'react'
import { formatTimeLabel } from '../data/layerConfig.js'

/**
 * Timeline — PRD §8
 * Play/pause, scrubber, date label, speed toggle
 */
export default function Timeline({
    isPlaying, playSpeed, timeIndex, maxIndex, timeEntries, isAnnual,
    dispatch
}) {
    const currentEntry = timeEntries[Math.floor(Math.min(timeIndex, timeEntries.length - 1))]

    const onScrub = useCallback((e) => {
        dispatch({ type: 'SET_TIME', index: parseFloat(e.target.value) })
    }, [dispatch])

    const onScrubStart = useCallback(() => {
        dispatch({ type: 'PAUSE_FOR_SCRUB' })
    }, [dispatch])

    const onScrubEnd = useCallback(() => {
        dispatch({ type: 'RESUME_AFTER_SCRUB' })
    }, [dispatch])

    const togglePlay = useCallback(() => {
        dispatch({ type: 'TOGGLE_PLAY' })
    }, [dispatch])

    const cycleSpeed = useCallback(() => {
        const next = playSpeed === 1 ? 2 : playSpeed === 2 ? 4 : 1
        dispatch({ type: 'SET_SPEED', speed: next })
    }, [dispatch, playSpeed])

    return (
        <div className="timeline-bar fade-up fade-delay-1">
            {/* Play/Pause button — PRD §8.3 */}
            <button
                id="play-btn"
                onClick={togglePlay}
                style={{
                    width: 32, height: 32, minWidth: 32,
                    background: '#111111',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    marginRight: 1
                }}
                aria-label={isPlaying ? 'Pause' : 'Play'}
            >
                {isPlaying ? (
                    <svg width="10" height="12" viewBox="0 0 10 12" fill="none">
                        <rect x="0" y="0" width="3" height="12" fill="#FFFFFF" />
                        <rect x="7" y="0" width="3" height="12" fill="#FFFFFF" />
                    </svg>
                ) : (
                    <svg width="10" height="12" viewBox="0 0 10 12" fill="none">
                        <polygon points="0,0 10,6 0,12" fill="#FFFFFF" />
                    </svg>
                )}
            </button>

            {/* Divider */}
            <div style={{ width: 1, height: '100%', background: '#E5E5E5', flexShrink: 0 }} />

            {/* Scrubber — PRD §8.2 */}
            <div style={{ flex: 1, padding: '0 12px', display: 'flex', alignItems: 'center' }}>
                <input
                    id="timeline-scrubber"
                    type="range"
                    min={0}
                    max={maxIndex}
                    step={0.01}
                    value={timeIndex}
                    onChange={onScrub}
                    onMouseDown={onScrubStart}
                    onMouseUp={onScrubEnd}
                />
            </div>

            {/* Divider */}
            <div style={{ width: 1, height: '100%', background: '#E5E5E5', flexShrink: 0 }} />

            {/* Date label — PRD §8.4 */}
            <div
                className="t-11"
                style={{
                    width: 80, minWidth: 80,
                    textAlign: 'center',
                    color: '#111111',
                    padding: '0 8px'
                }}
            >
                {formatTimeLabel(currentEntry, isAnnual)}
            </div>

            {/* Divider */}
            <div style={{ width: 1, height: '100%', background: '#E5E5E5', flexShrink: 0 }} />

            {/* Speed toggle — PRD §8.3 */}
            <button
                id="speed-toggle"
                onClick={cycleSpeed}
                className="t-10"
                style={{
                    padding: '0 10px',
                    color: '#111111',
                    minWidth: 32
                }}
            >
                {playSpeed}×
            </button>
        </div>
    )
}
