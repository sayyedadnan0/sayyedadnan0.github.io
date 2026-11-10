import Link from 'next/link'
import Navigation from '@/components/layout/Navigation'

export default function NotFound() {
  return <><Navigation /><main id="main-content" className="portfolio-page"><div className="page-shell route-message"><span className="page-kicker">404 / Off the map</span><h1 className="page-heading">Nothing here.<br />Plenty to explore.</h1><p>This page may have moved, or the project is no longer available. Let’s get you back to the work.</p><Link className="page-button page-button-primary" href="/work">Explore the work ↗</Link></div></main></>
}
