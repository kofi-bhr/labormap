import { useRef, useEffect, useCallback } from 'react'
import * as d3 from 'd3'
import * as topojson from 'topojson-client'
import { LAYERS } from '../data/layerConfig.js'
import { getValueForState, getLayerDomain } from './useTimeData.js'

const ELECTION_2024 = {
    '01': 'red', '02': 'red', '04': 'red', '05': 'red', '06': 'blue', '08': 'blue',
    '09': 'blue', '10': 'blue', '11': 'blue', '12': 'red', '13': 'red', '15': 'blue',
    '16': 'red', '17': 'blue', '18': 'red', '19': 'red', '20': 'red', '21': 'red',
    '22': 'red', '23': 'blue', '24': 'blue', '25': 'blue', '26': 'red', '27': 'blue',
    '28': 'red', '29': 'red', '30': 'red', '31': 'red', '32': 'red', '33': 'blue',
    '34': 'blue', '35': 'blue', '36': 'blue', '37': 'red', '38': 'red', '39': 'red',
    '40': 'red', '41': 'blue', '42': 'red', '44': 'blue', '45': 'red', '46': 'red',
    '47': 'red', '48': 'red', '49': 'red', '50': 'blue', '51': 'blue', '53': 'blue',
    '54': 'red', '55': 'red', '56': 'red'
}

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
    onMouseMove,
    showElection
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
            .attr('fill', 'var(--map-base)')
            .attr('stroke', 'var(--state-border)')
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

        // Do not use duration transition here to fix playback lag
        svgRef.current.selectAll('.state')
            .attr('fill', d => {
                if (showElection) {
                    const color = ELECTION_2024[d.id]
                    if (color === 'red') return '#FF0055'
                    if (color === 'blue') return '#0088FF'
                    return 'var(--missing)'
                }
                const val = getValueForState(d.id, layerData, timeIndex)
                return val != null ? colorScale(val) : 'var(--missing)'
            })
    }, [timeIndex, activeLayer, layerData, showElection])

    useEffect(() => {
        if (!svgRef.current) return
        svgRef.current.selectAll('.state')
            .attr('stroke', d => {
                if (d.id === hoveredState || d.id === selectedState) return 'var(--text-primary)'
                return 'var(--state-border)'
            })
            .attr('stroke-width', d => {
                if (d.id === hoveredState || d.id === selectedState) return 1.5
                return 0.5
            })
    }, [hoveredState, selectedState])

    // Zoom on state select
    useEffect(() => {
        if (!svgRef.current || !pathRef.current) return
        const svg = svgRef.current
        const g = svg.select('g')
        const width = svg.node().clientWidth || 1000
        const height = svg.node().clientHeight || 800

        if (selectedState) {
            const node = svg.selectAll('.state').filter(d => d.id === selectedState).node()
            if (node) {
                const [[x0, y0], [x1, y1]] = pathRef.current.bounds(d3.select(node).datum())
                const scale = Math.min(8, 0.9 / Math.max((x1 - x0) / width, (y1 - y0) / height))
                const tx = width / 2 - scale * (x0 + x1) / 2
                const ty = height / 2 - scale * (y0 + y1) / 2
                g.transition().duration(750).ease(d3.easeCubicOut)
                    .attr('transform', `translate(${tx},${ty}) scale(${scale})`)
            }
        } else {
            g.transition().duration(750).ease(d3.easeCubicOut)
                .attr('transform', 'translate(0,0) scale(1)')
        }
    }, [selectedState])

    return { colorScaleRef }
}
