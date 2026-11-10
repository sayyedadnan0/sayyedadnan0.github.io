import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

interface Props {
  eyebrow: string
  title: string
  href: string
  label: string
  primary?: boolean
}

export default function CallToAction({ eyebrow, title, href, label, primary = true }: Props) {
  return <section className="page-cta page-divider">
    <div><span className="page-kicker">{eyebrow}</span><h2>{title}</h2></div>
    <Link href={href} className={primary ? 'page-button page-button-primary' : 'page-button'}>{label} <ArrowRight aria-hidden="true" /></Link>
  </section>
}
