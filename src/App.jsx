import { useReducer, useEffect, useState, useCallback, useRef } from 'react'
import MapCanvas from './components/MapCanvas.jsx'
import Timeline from './components/Timeline.jsx'
import RightPanel from './components/RightPanel.jsx'
import LegendRow from './components/LegendRow.jsx'
import SectorBar from './components/SectorBar.jsx'
import Tooltip from './components/Tooltip.jsx'
import MobileOverlay from './components/MobileOverlay.jsx'
import { usePlayback } from './hooks/usePlayback.js'
import { useKeybinds } from './hooks/useKeybinds.js'
import { LAYERS, buildTimeIndex } from './data/layerConfig.js'
import { getMaxTimeIndex, getTimeEntries } from './hooks/useTimeData.js'

/* ── State management ── PRD §6.2 */
const initialState = {
    activeLayer: 'unemployment',
    activeSector: 'leisure',
    timeIndex: 0,
    isPlaying: false,
    playSpeed: 1,
    hoveredState: null,
    selectedState: null,
    _wasPlaying: false // internal: track play state during scrub
}

function reducer(state, action) {
    switch (action.type) {
        case 'SET_LAYER':
            return { ...state, activeLayer: action.layer, timeIndex: 0, isPlaying: false }
        case 'SET_SECTOR':
            return { ...state, activeSector: action.sector }
        case 'SET_TIME':
            return { ...state, timeIndex: action.index }
        case 'TOGGLE_PLAY':
            return { ...state, isPlaying: !state.isPlaying }
        case 'SET_SPEED':
            return { ...state, playSpeed: action.speed }
        case 'STEP': {
            const next = Math.max(0, state.timeIndex + action.delta)
            return { ...state, timeIndex: next, isPlaying: false }
        }
        case 'HOVER_STATE':
            return { ...state, hoveredState: action.fips }
        case 'SELECT_STATE': {
            const fips = action.fips
            if (fips === state.selectedState) return { ...state, selectedState: null }
            return { ...state, selectedState: fips }
        }
        case 'PAUSE_FOR_SCRUB':
            return { ...state, _wasPlaying: state.isPlaying, isPlaying: false }
        case 'RESUME_AFTER_SCRUB':
            return { ...state, isPlaying: state._wasPlaying, _wasPlaying: false }
        default:
            return state
    }
}

export default function App() {
    const [state, dispatch] = useReducer(reducer, initialState)
    const { activeLayer, activeSector, timeIndex, isPlaying, playSpeed, hoveredState, selectedState } = state

    /* ── Load data ── */
    const [allData, setAllData] = useState({})
    const [topoData, setTopoData] = useState(null)
    const [sectorData, setSectorData] = useState(null)

    useEffect(() => {
        // Fetch topo
        fetch('/states-10m.json').then(r => r.json()).then(setTopoData)
        // Fetch all layer data
        const layers = ['unemployment', 'participation', 'wage', 'education', 'age']
        for (const l of layers) {
            fetch(`/data/${l}.json`).then(r => r.json()).then(d => {
                setAllData(prev => ({ ...prev, [l]: d }))
            })
        }
        // Fetch sector data
        fetch('/data/sectors.json').then(r => r.json()).then(setSectorData)
        // Fetch FRED
        fetch('/data/fred_national.json').then(r => r.json()).then(d => {
            setAllData(prev => ({ ...prev, fred: d }))
        })
    }, [])

    /* ── Derive active layer data ── */
    const layerData = activeLayer === 'sector' ? allData.unemployment : allData[activeLayer]
    const maxIndex = getMaxTimeIndex(layerData)
    const timeEntries = layerData ? getTimeEntries(layerData) : []
    const isAnnual = LAYERS[activeLayer]?.frequency === 'annual'

    /* ── Clamp timeIndex ── */
    useEffect(() => {
        if (timeIndex > maxIndex && maxIndex > 0) {
            dispatch({ type: 'SET_TIME', index: maxIndex })
        }
    }, [maxIndex])

    /* ── Playback engine ── */
    const setTimeIndex = useCallback((fn) => {
        dispatch({ type: 'SET_TIME', index: typeof fn === 'function' ? fn(timeIndex) : fn })
    }, [timeIndex])

    usePlayback(isPlaying, playSpeed, timeIndex, maxIndex, (fn) => {
        // We need to use a functional update here
        dispatch({ type: 'SET_TIME', index: typeof fn === 'function' ? fn(0) : fn })
    })

    // Better playback: use ref for timeIndex
    const timeIndexRef = useRef(timeIndex)
    timeIndexRef.current = timeIndex

    useEffect(() => {
        if (!isPlaying) return
        const fps = 30
        const ms = 1000 / fps
        const id = setInterval(() => {
            const step = playSpeed * (1 / fps) * 4
            const next = timeIndexRef.current + step
            dispatch({ type: 'SET_TIME', index: next >= maxIndex ? 0 : next })
        }, ms)
        return () => clearInterval(id)
    }, [isPlaying, playSpeed, maxIndex])

    /* ── Keybinds ── */
    const keybindState = useKeybinds(dispatch)

    /* ── Tooltip position ── */
    const [mousePos, setMousePos] = useState(null)
    const mapContainerRef = useRef(null)

    const onMouseMove = useCallback((pos) => {
        setMousePos(pos)
    }, [])

    const onHover = useCallback((fips) => {
        dispatch({ type: 'HOVER_STATE', fips })
        if (!fips) setMousePos(null)
    }, [])

    const onSelect = useCallback((fips) => {
        dispatch({ type: 'SELECT_STATE', fips })
    }, [])

    return (
        <div className="app-shell">
            {/* §3 Header */}
            <div className="header-bar fade-up fade-delay-0">
                <span className="t-11" style={{ color: '#111111', letterSpacing: '0.1em' }}>LABOR ATLAS</span>
                <span className="t-10" style={{ color: '#888888' }}>BLS · CENSUS · FRED</span>
            </div>

            {/* Sector bar (conditional) — §12 */}
            {activeLayer === 'sector' && (
                <SectorBar
                    activeSector={activeSector}
                    onSelect={(id) => dispatch({ type: 'SET_SECTOR', sector: id })}
                />
            )}

            {/* Main area: map + right panel */}
            <div className="main-area">
                <div ref={mapContainerRef} style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
                    <MapCanvas
                        topoData={topoData}
                        activeLayer={activeLayer}
                        layerData={layerData}
                        timeIndex={timeIndex}
                        hoveredState={hoveredState}
                        selectedState={selectedState}
                        onHover={onHover}
                        onSelect={onSelect}
                        onMouseMove={onMouseMove}
                    />
                    <Tooltip
                        hoveredState={hoveredState}
                        layerData={layerData}
                        activeLayer={LAYERS[activeLayer]}
                        timeIndex={timeIndex}
                        mousePos={mousePos}
                        containerRect={mapContainerRef.current?.getBoundingClientRect()}
                    />
                </div>

                <RightPanel
                    activeLayer={activeLayer}
                    layerData={layerData}
                    timeIndex={timeIndex}
                    hoveredState={hoveredState}
                    selectedState={selectedState}
                    allData={allData}
                    sectorData={sectorData}
                    activeSector={activeSector}
                />
            </div>

            {/* Timeline — §8 */}
            <Timeline
                isPlaying={isPlaying}
                playSpeed={playSpeed}
                timeIndex={timeIndex}
                maxIndex={maxIndex}
                timeEntries={timeEntries}
                isAnnual={isAnnual}
                dispatch={dispatch}
            />

            {/* Legend + Keybinds — §10 */}
            <LegendRow
                activeLayer={activeLayer}
                layerData={layerData}
                timeIndex={timeIndex}
                keybindState={keybindState}
            />

            {/* 2020 ACS footnote */}
            {isAnnual && (
                <div className="t-10" style={{
                    position: 'fixed', bottom: 2, left: 16,
                    color: '#888888', zIndex: 50
                }}>
                    * 2020 ACS 1-Year not released (COVID-19 data collection disruption)
                </div>
            )}

            {/* Mobile overlay — §13 */}
            <MobileOverlay />
        </div>
    )
}
