'use client'

import Link from 'next/link'
import Navigation from '@/components/layout/Navigation'

export default function PageError({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return <><Navigation /><main id="main-content" className="portfolio-page"><div className="page-shell route-message"><span className="page-kicker">A small interruption</span><h1 className="page-heading">Let’s try that again.</h1><p>This page couldn’t load. Try once more, or head back to the homepage.</p><div className="flex flex-wrap gap-3"><button className="page-button page-button-primary" onClick={retry}>Try again</button><Link className="page-button" href="/">Back home</Link></div></div></main></>
}
