/**
 * MobileOverlay — PRD §13
 * Full-viewport blur overlay on screens < 1024px.
 * Non-dismissable. The ONLY element with border-radius > 0.
 */
import { useState, useEffect } from 'react'

export default function MobileOverlay() {
    const [isMobile, setIsMobile] = useState(() => window.innerWidth < 1024)

    useEffect(() => {
        function check() {
            setIsMobile(window.innerWidth < 1024)
        }
        window.addEventListener('resize', check)
        return () => window.removeEventListener('resize', check)
    }, [])

    if (!isMobile) return null

    return (
        <div
            style={{
                position: 'fixed',
                inset: 0,
                zIndex: 9999,
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                background: 'rgba(255,255,255,0.85)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
            }}
        >
            {/* PRD §2.3 exception: the ONLY element with border-radius: 2px */}
            <div
                style={{
                    width: 280,
                    height: 120,
                    border: '1px solid #E5E5E5',
                    background: '#FFFFFF',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 12,
                    borderRadius: '2px' /* §2.3 documented exception — mobile overlay card only */
                }}
            >
                <div style={{ fontSize: 11, letterSpacing: '0.06em', color: '#111111' }}>
                    LABOR ATLAS
                </div>
                <div style={{ fontSize: 11, letterSpacing: '0.06em', color: '#111111', textAlign: 'center', padding: '0 20px', lineHeight: 1.5 }}>
                    This experience is designed for desktop.
                    <br />
                    Please revisit on a screen wider than 1024px.
                </div>
            </div>
        </div>
    )
}
