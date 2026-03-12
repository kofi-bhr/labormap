import { useRef, useCallback } from 'react'
import { useMapD3 } from '../hooks/useMapD3.js'

/**
 * MapCanvas — PRD §7
 * Container div for D3-managed SVG. React manages nothing inside the SVG.
 */
export default function MapCanvas({
    topoData, activeLayer, layerData, timeIndex,
    hoveredState, selectedState, onHover, onSelect, onMouseMove
}) {
    const containerRef = useRef(null)

    const { colorScaleRef } = useMapD3({
        containerRef, topoData, activeLayer, layerData, timeIndex,
        hoveredState, selectedState, onHover, onSelect, onMouseMove
    })

    return (
        <div
            ref={containerRef}
            id="map-root"
            className="map-region"
            style={{ width: '100%', height: '100%' }}
        />
    )
}
