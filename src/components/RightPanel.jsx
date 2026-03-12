import { useRef, useEffect, useMemo } from 'react'
import * as d3 from 'd3'
import { STATE_FIPS, LAYERS } from '../data/layerConfig.js'
import {
    getValueForState, getDelta, formatValue,
    getStateSeries, getAllStatesAtTime, getNationalAvg
} from '../hooks/useTimeData.js'

/**
 * RightPanel — PRD §9
 * State header, primary time-series chart, correlational charts, attribution
 */
export default function RightPanel({
    activeLayer, layerData, timeIndex, hoveredState, selectedState,
    allData, sectorData, activeSector, dispatch
}) {
    const activeFips = selectedState || hoveredState
    const stateInfo = activeFips ? STATE_FIPS[activeFips] : null
    const layer = LAYERS[activeLayer]
    const value = activeFips ? getValueForState(activeFips, layerData, timeIndex) : null
    const delta = activeFips ? getDelta(activeFips, layerData, timeIndex) : null

    return (
        <div className="right-panel fade-up fade-delay-2">
            {/* §9.1 State Header */}
            <div className="rp-section" style={{ minHeight: 60, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                {stateInfo ? (
                    <>
                        <div className="t-15" style={{ marginBottom: 4 }}>{stateInfo.name}</div>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                            <span style={{ fontSize: 24, letterSpacing: '0.01em', fontFamily: 'var(--font)' }}>
                                {formatValue(value, layer.unit)}
                            </span>
                            {delta != null && (
                                <span className="t-11" style={{ color: 'var(--text-secondary)' }}>
                                    {delta > 0 ? '↑' : delta < 0 ? '↓' : '→'}{' '}
                                    {Math.abs(delta).toFixed(1)}{layer.unit === '$' ? '' : 'pp'}
                                </span>
                            )}
                        </div>
                    </>
                ) : (
                    <div className="t-10" style={{ color: 'var(--text-secondary)' }}>HOVER A STATE</div>
                )}
            </div>

            {/* §9.2 Primary time-series chart */}
            <div className="rp-section" style={{ minHeight: 160, flex: 1 }}>
                <PrimaryChart
                    fips={activeFips}
                    layerData={layerData}
                    timeIndex={timeIndex}
                    layer={layer}
                    dispatch={dispatch}
                />
            </div>

            {/* §9.3 Correlational charts */}
            <div className="rp-section" style={{ minHeight: 180, display: 'flex', gap: 8 }}>
                <CorrelationChart
                    activeLayer={activeLayer}
                    allData={allData}
                    timeIndex={timeIndex}
                    activeFips={activeFips}
                />
                <EmploymentBarChart
                    layerData={allData?.unemployment}
                    timeIndex={timeIndex}
                    activeFips={activeFips}
                />
            </div>

            {/* §9.4 Attribution */}
            <div className="rp-section" style={{ minHeight: 28, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span className="t-10" style={{ color: 'var(--text-secondary)' }}>{layer.source}</span>
                <span className="t-10" style={{ color: 'var(--text-secondary)' }}>UPDATED JAN 2025</span>
            </div>
        </div>
    )
}

/* ── Primary line chart (D3 in SVG) ── */
function PrimaryChart({ fips, layerData, timeIndex, layer, dispatch }) {
    const svgRef = useRef(null)

    useEffect(() => {
        if (!svgRef.current) return
        const svg = d3.select(svgRef.current)
        svg.selectAll('*').remove()

        const w = svgRef.current.clientWidth || 288
        const h = svgRef.current.clientHeight || 130
        const margin = { top: 8, right: 32, bottom: 20, left: 4 }
        const iw = w - margin.left - margin.right
        const ih = h - margin.top - margin.bottom

        if (!layerData?.data) {
            svg.append('text')
                .attr('x', w / 2).attr('y', h / 2)
                .attr('text-anchor', 'middle')
                .attr('fill', 'var(--text-secondary)')
                .attr('font-size', 10)
                .attr('font-family', 'var(--font)')
                .text('Loading data...')
            return
        }

        const firstFips = Object.keys(layerData.data)[0]
        if (!firstFips) return
        const baseSeries = getStateSeries(firstFips, layerData)

        // Compute national series
        const fipsList = Object.keys(layerData.data)
        const nationalSeries = []
        for (let i = 0; i < baseSeries.length; i++) {
            let sum = 0, cnt = 0
            for (const f of fipsList) {
                const entries = layerData.data[f]
                if (entries[i]?.value != null) { sum += entries[i].value; cnt++ }
            }
            if (cnt > 0) nationalSeries.push({ x: baseSeries[i].x, y: sum / cnt, index: i })
            else nationalSeries.push({ x: baseSeries[i].x, y: null, index: i })
        }

        const stateSeriesRaw = fips ? getStateSeries(fips, layerData) : null
        const stateSeries = stateSeriesRaw ? stateSeriesRaw.map((d, i) => ({ ...d, index: i })) : null

        const activeSeries = stateSeries || nationalSeries
        const validSeries = activeSeries.filter(d => d.y != null)
        if (!validSeries.length) return

        const xDomain = d3.extent(activeSeries, d => d.x)
        const allYSeries = stateSeries ? stateSeries.concat(nationalSeries) : nationalSeries
        const yDomain = d3.extent(allYSeries.filter(d => d.y != null), d => d.y)

        yDomain[0] = Math.max(0, yDomain[0] - (yDomain[1] - yDomain[0]) * 0.1)
        yDomain[1] = yDomain[1] + (yDomain[1] - yDomain[0]) * 0.1

        const xScale = d3.scaleLinear().domain(xDomain).range([margin.left, margin.left + iw])
        const yScale = d3.scaleLinear().domain(yDomain).range([margin.top + ih, margin.top])

        // Draw national series
        const natLine = d3.line().x(d => xScale(d.x)).y(d => yScale(d.y)).defined(d => d.y != null)
        svg.append('path')
            .datum(nationalSeries.filter(d => d.y != null))
            .attr('d', natLine)
            .attr('fill', 'none')
            .attr('stroke', fips ? 'var(--text-secondary)' : 'var(--text-primary)')
            .attr('stroke-width', 1)
            .attr('stroke-dasharray', fips ? '3,3' : null)

        // Draw State line if selected
        if (stateSeries) {
            const line = d3.line().x(d => xScale(d.x)).y(d => yScale(d.y)).defined(d => d.y != null)
            svg.append('path')
                .datum(validSeries)
                .attr('d', line)
                .attr('fill', 'none')
                .attr('stroke', 'var(--text-primary)')
                .attr('stroke-width', 1)
        }

        // Current time hairline
        const currentTimePoint = activeSeries[Math.min(Math.floor(timeIndex), activeSeries.length - 1)]
        const currentX = xScale(currentTimePoint?.x ?? xDomain[0])
        svg.append('line')
            .attr('x1', currentX).attr('x2', currentX)
            .attr('y1', margin.top).attr('y2', margin.top + ih)
            .attr('stroke', 'var(--text-secondary)').attr('stroke-width', 1)

        // X-axis: year labels every 5 years
        const years = []
        for (let y = Math.ceil(xDomain[0] / 5) * 5; y <= xDomain[1]; y += 5) years.push(y)
        for (const y of years) {
            svg.append('text')
                .attr('x', xScale(y)).attr('y', margin.top + ih + 14)
                .attr('text-anchor', 'middle').attr('fill', 'var(--text-secondary)')
                .attr('font-size', 10).attr('font-family', 'var(--font)')
                .text(y)
        }

        // Y-axis: 3 ticks, right-aligned
        const yTicks = yScale.ticks(3)
        for (const t of yTicks) {
            svg.append('text')
                .attr('x', margin.left + iw + 4).attr('y', yScale(t) + 3)
                .attr('text-anchor', 'start').attr('fill', 'var(--text-secondary)')
                .attr('font-size', 10).attr('font-family', 'var(--font)')
                .text(layer.unit === '$' ? `${(t / 1000).toFixed(0)}k` : t.toFixed(1))
        }

        // Invisible rect for hover scrubbing
        if (dispatch) {
            svg.append('rect')
                .attr('x', margin.left).attr('y', margin.top)
                .attr('width', iw).attr('height', ih)
                .attr('fill', 'transparent').style('cursor', 'col-resize')
                .on('mousemove', function (event) {
                    const [mouseX] = d3.pointer(event)
                    const hoveredX = xScale.invert(mouseX)
                    let closestIndex = 0, minDiff = Infinity
                    for (let i = 0; i < activeSeries.length; i++) {
                        const diff = Math.abs(activeSeries[i].x - hoveredX)
                        if (diff < minDiff) {
                            minDiff = diff; closestIndex = i
                        }
                    }
                    dispatch({ type: 'SET_TIME', index: closestIndex })
                })
        }

    }, [fips, layerData, timeIndex, layer, dispatch])

    return <svg ref={svgRef} width="100%" height="100%" style={{ display: 'block' }} />
}

/* ── Correlation scatter chart ── */
function CorrelationChart({ activeLayer, allData, timeIndex, activeFips }) {
    const svgRef = useRef(null)

    // Determine axes based on active layer — PRD §9.3 Chart A
    const config = useMemo(() => {
        switch (activeLayer) {
            case 'participation':
                return { xData: allData?.age, yData: allData?.participation, xLabel: 'Med. Age', yLabel: 'Participation' }
            case 'wage':
                return { xData: allData?.education, yData: allData?.wage, xLabel: 'Education', yLabel: 'Income' }
            case 'education':
                return { xData: allData?.wage, yData: allData?.education, xLabel: 'Income', yLabel: 'Education' }
            default: // unemployment
                return { xData: allData?.education, yData: allData?.unemployment, xLabel: 'Education', yLabel: 'Unemp.' }
        }
    }, [activeLayer, allData])

    useEffect(() => {
        if (!svgRef.current) return
        const svg = d3.select(svgRef.current)
        svg.selectAll('*').remove()

        const w = svgRef.current.clientWidth || 140
        const h = svgRef.current.clientHeight || 140
        const m = { top: 16, right: 4, bottom: 16, left: 4 }

        if (!config.xData?.data || !config.yData?.data) return

        const fipsList = Object.keys(config.xData.data)
        const points = []
        for (const f of fipsList) {
            const xEntries = config.xData.data[f]
            const yEntries = config.yData.data[f]
            // Use floor of timeIndex, clamped
            const xi = Math.min(Math.floor(timeIndex), (xEntries?.length || 1) - 1)
            const yi = Math.min(Math.floor(timeIndex), (yEntries?.length || 1) - 1)
            const xv = xEntries?.[xi]?.value
            const yv = yEntries?.[yi]?.value
            if (xv != null && yv != null) points.push({ fips: f, x: xv, y: yv })
        }

        if (!points.length) return

        const xDomain = d3.extent(points, d => d.x)
        const yDomain = d3.extent(points, d => d.y)

        const xScale = d3.scaleLinear().domain(xDomain).range([m.left, w - m.right])
        const yScale = d3.scaleLinear().domain(yDomain).range([h - m.bottom, m.top])

        for (const p of points) {
            svg.append('rect')
                .attr('x', xScale(p.x) - 1.5)
                .attr('y', yScale(p.y) - 1.5)
                .attr('width', 3)
                .attr('height', 3)
                .attr('fill', p.fips === activeFips ? 'var(--text-primary)' : 'var(--state-border)')
        }

        // Labels
        svg.append('text').attr('x', w / 2).attr('y', h - 2).attr('text-anchor', 'middle')
            .attr('fill', 'var(--text-secondary)').attr('font-size', 9).attr('font-family', 'var(--font)').text(config.xLabel)
        svg.append('text').attr('x', 2).attr('y', 10)
            .attr('fill', 'var(--text-secondary)').attr('font-size', 9).attr('font-family', 'var(--font)').text(config.yLabel)

    }, [config, timeIndex, activeFips])

    return <svg ref={svgRef} width="100%" height="100%" style={{ display: 'block', flex: 1 }} />
}

/* ── Employment bar chart ── PRD §9.3 Chart B */
function EmploymentBarChart({ layerData, timeIndex, activeFips }) {
    const svgRef = useRef(null)

    useEffect(() => {
        if (!svgRef.current) return
        const svg = d3.select(svgRef.current)
        svg.selectAll('*').remove()

        const w = svgRef.current.clientWidth || 140
        const h = svgRef.current.clientHeight || 140
        const m = { top: 16, right: 4, bottom: 16, left: 4 }

        if (!layerData?.data) return

        const states = getAllStatesAtTime(layerData, timeIndex)
            .sort((a, b) => b.value - a.value)

        if (!states.length) return

        const maxVal = d3.max(states, d => d.value)
        const barW = Math.max(1, (w - m.left - m.right) / states.length - 0.5)

        for (let i = 0; i < states.length; i++) {
            const s = states[i]
            const barH = ((s.value || 0) / maxVal) * (h - m.top - m.bottom)
            svg.append('rect')
                .attr('x', m.left + i * (barW + 0.5))
                .attr('y', h - m.bottom - barH)
                .attr('width', barW)
                .attr('height', barH)
                .attr('fill', s.fips === activeFips ? 'var(--text-primary)' : 'var(--state-border)')
        }

        // Y-axis: 2 ticks
        const yScale = d3.scaleLinear().domain([0, maxVal]).range([h - m.bottom, m.top])
        const ticks = yScale.ticks(2)
        for (const t of ticks) {
            svg.append('text')
                .attr('x', w - 2).attr('y', yScale(t) + 3)
                .attr('text-anchor', 'end').attr('fill', 'var(--text-secondary)')
                .attr('font-size', 9).attr('font-family', 'var(--font)')
                .text(t.toFixed(1))
        }

        svg.append('text').attr('x', w / 2).attr('y', h - 2).attr('text-anchor', 'middle')
            .attr('fill', 'var(--text-secondary)').attr('font-size', 9).attr('font-family', 'var(--font)').text('States ranked')

    }, [layerData, timeIndex, activeFips])

    return <svg ref={svgRef} width="100%" height="100%" style={{ display: 'block', flex: 1 }} />
}
