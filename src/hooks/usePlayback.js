import { useRef, useEffect, useCallback } from 'react'

/**
 * usePlayback — setInterval-based playback engine
 * PRD §8.3 / §14: continuous float timeIndex, ~30fps, looping
 */
export function usePlayback(isPlaying, playSpeed, timeIndex, maxIndex, setTimeIndex) {
    const intervalRef = useRef(null)
    const wasPlayingRef = useRef(false)

    const start = useCallback(() => {
        if (intervalRef.current) return
        const fps = 30
        const ms = 1000 / fps
        intervalRef.current = setInterval(() => {
            setTimeIndex(prev => {
                const step = playSpeed * (1 / fps) * 4 // advance ~4 indices/sec at 1×
                const next = prev + step
                return next >= maxIndex ? 0 : next
            })
        }, ms)
    }, [playSpeed, maxIndex, setTimeIndex])

    const stop = useCallback(() => {
        if (intervalRef.current) {
            clearInterval(intervalRef.current)
            intervalRef.current = null
        }
    }, [])

    useEffect(() => {
        if (isPlaying) start()
        else stop()
        return stop
    }, [isPlaying, start, stop])

    // Restart when speed changes during playback
    useEffect(() => {
        if (isPlaying) {
            stop()
            start()
        }
    }, [playSpeed])

    return { wasPlayingRef }
}
