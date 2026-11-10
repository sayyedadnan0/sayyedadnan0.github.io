import { ImageResponse } from 'next/og'

export const alt = 'ADNAN — Creative direction, design, and digital experiences'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function OpenGraphImage() {
  return new ImageResponse(<div style={{ width: '100%', height: '100%', background: '#080808', color: '#f1efe3', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '64px 72px' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 20, color: '#aaa79f' }}><span>CREATIVE PORTFOLIO</span><span>DESIGN / MOTION / DIGITAL</span></div>
    <div style={{ display: 'flex', fontSize: 160, letterSpacing: '-9px', fontWeight: 700 }}>ADNAN</div>
    <div style={{ display: 'flex', borderTop: '1px solid #ffffff30', paddingTop: 28, fontSize: 28 }}>Thoughtful ideas. Considered experiences.</div>
  </div>, size)
}
