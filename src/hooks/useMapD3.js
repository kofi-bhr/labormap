import { useRef, useEffect, useCallback } from 'react'
import * as d3 from 'd3'
import * as topojson from 'topojson-client'
import { LAYERS } from '../data/layerConfig.js'
import { getValueForState, getLayerDomain } from './useTimeData.js'

/**
 * useMapD3 — creates SVG map, draws states, manages transitions
 * PRD §7: D3 renders all SVG; React manages everything outside it
 */
export function useMapD3({
    containerRef,
    topoData,
    activeLayer,
    layerData,
    timeIndex,
    hoveredState,
    selectedState,
    onHover,
    onSelect,
    onMouseMove
}) {
    const svgRef = useRef(null)
    const pathRef = useRef(null)
    const projectionRef = useRef(null)
    const colorScaleRef = useRef(null)

    // Build/rebuild the SVG on mount or topo data change
    useEffect(() => {
        if (!containerRef.current || !topoData) return

        const container = containerRef.current
        // Clear previous
        d3.select(container).select('svg').remove()

        const width = container.offsetWidth
        const height = container.offsetHeight

        const svg = d3.select(container)
            .append('svg')
            .attr('viewBox', `0 0 ${width} ${height}`)
            .attr('width', '100%')
            .attr('height', '100%')
            .style('display', 'block')

        svgRef.current = svg

        const states = topojson.feature(topoData, topoData.objects.states)
        const projection = d3.geoAlbersUsa().fitSize([width, height], states)
        projectionRef.current = projection

        const path = d3.geoPath().projection(projection)
        pathRef.current = path

        // Draw state paths
        svg.append('g')
            .selectAll('path')
            .data(states.features)
            .join('path')
            .attr('class', 'state')
            .attr('d', path)
            .attr('fill', '#F5F5F5')
            .attr('stroke', '#D0D0D0')
            .attr('stroke-width', 0.5)
            .style('cursor', 'pointer')
            .on('mouseover', function (event, d) {
                onHover(d.id)
            })
            .on('mousemove', function (event) {
                const rect = container.getBoundingClientRect()
                onMouseMove({
                    x: event.clientX - rect.left,
                    y: event.clientY - rect.top
                })
            })
            .on('mouseout', function () {
                onHover(null)
            })
            .on('click', function (event, d) {
                onSelect(d.id)
            })

        // Resize observer
        const ro = new ResizeObserver(entries => {
            const { width: w, height: h } = entries[0].contentRect
            if (w > 0 && h > 0) {
                svg.attr('viewBox', `0 0 ${w} ${h}`)
                const newProj = d3.geoAlbersUsa().fitSize([w, h], states)
                projectionRef.current = newProj
                const newPath = d3.geoPath().projection(newProj)
                pathRef.current = newPath
                svg.selectAll('.state').attr('d', newPath)
            }
        })
        ro.observe(container)

        return () => {
            ro.disconnect()
            svg.remove()
        }
    }, [topoData])

    // Update fills on timeIndex / activeLayer change — PRD §7.2 + §14
    useEffect(() => {
        if (!svgRef.current || !layerData) return

        const layer = LAYERS[activeLayer]
        const [min, max] = getLayerDomain(layerData)
        const colorScale = d3.scaleSequential()
            .domain([min, max])
            .interpolator(layer.interpolator)
        colorScaleRef.current = colorScale

        svgRef.current.selectAll('.state')
            .transition()
            .duration(180)
            .ease(d3.easeCubicOut)
            .attr('fill', d => {
                const val = getValueForState(d.id, layerData, timeIndex)
                return val != null ? colorScale(val) : '#EEEEEE'
            })
    }, [timeIndex, activeLayer, layerData])

    // Update stroke on hover/select — PRD §7.3
    useEffect(() => {
        if (!svgRef.current) return
        svgRef.current.selectAll('.state')
            .attr('stroke', d => {
                if (d.id === hoveredState || d.id === selectedState) return '#111111'
                return '#D0D0D0'
            })
            .attr('stroke-width', d => {
                if (d.id === hoveredState || d.id === selectedState) return 1.5
                return 0.5
            })
    }, [hoveredState, selectedState])

    return { colorScaleRef }
}
