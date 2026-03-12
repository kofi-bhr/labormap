import { useEffect, useCallback, useState } from 'react'
import { DEFAULT_KEYBINDS } from '../data/layerConfig.js'

const STORAGE_KEY = 'laboratlas_keybinds'

/**
 * useKeybinds — remappable keyboard handler
 * PRD §10.2 / §11: single keydown listener, localStorage persistence, conflict detection
 */
export function useKeybinds(dispatch) {
    const [keybinds, setKeybinds] = useState(() => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY)
            if (stored) return JSON.parse(stored)
        } catch { }
        return { ...DEFAULT_KEYBINDS }
    })

    const [editingKey, setEditingKey] = useState(null) // which action is being remapped
    const [conflict, setConflict] = useState(null)

    // Persist keybinds
    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(keybinds))
        } catch { }
    }, [keybinds])

    // Reverse lookup: action → key
    const actionToKey = useCallback(() => {
        const map = {}
        for (const [key, action] of Object.entries(keybinds)) {
            map[action] = key
        }
        return map
    }, [keybinds])

    // Keydown handler
    useEffect(() => {
        function onKeyDown(e) {
            // Guard: ignore when typing in input
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return

            const key = e.key === ' ' ? ' ' : e.key
            const action = keybinds[key]
            if (!action) return

            e.preventDefault()

            switch (action) {
                case 'unemployment':
                case 'participation':
                case 'wage':
                case 'education':
                case 'sector':
                    dispatch({ type: 'SET_LAYER', layer: action })
                    break
                case 'play':
                    dispatch({ type: 'TOGGLE_PLAY' })
                    break
                case 'stepBack':
                    dispatch({ type: 'STEP', delta: -1 })
                    break
                case 'stepForward':
                    dispatch({ type: 'STEP', delta: 1 })
                    break
                case 'deselect':
                    dispatch({ type: 'SELECT_STATE', fips: null })
                    break
                case 'speed1':
                    dispatch({ type: 'SET_SPEED', speed: 1 })
                    break
                case 'speed2':
                    dispatch({ type: 'SET_SPEED', speed: 2 })
                    break
                case 'speed4':
                    dispatch({ type: 'SET_SPEED', speed: 4 })
                    break
            }
        }

        window.addEventListener('keydown', onKeyDown)
        return () => window.removeEventListener('keydown', onKeyDown)
    }, [keybinds, dispatch])

    // Remap a keybind
    const remapKey = useCallback((action, newKey) => {
        const normalizedKey = newKey === ' ' ? ' ' : newKey
        // Check conflict
        if (keybinds[normalizedKey] && keybinds[normalizedKey] !== action) {
            setConflict(action)
            setTimeout(() => setConflict(null), 1500)
            return false
        }
        // Remove old key for this action
        const updated = { ...keybinds }
        for (const [k, a] of Object.entries(updated)) {
            if (a === action) delete updated[k]
        }
        updated[normalizedKey] = action
        setKeybinds(updated)
        setEditingKey(null)
        return true
    }, [keybinds])

    return { keybinds, actionToKey: actionToKey(), editingKey, setEditingKey, conflict, remapKey }
}
