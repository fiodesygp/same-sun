import { t, type Key } from '../i18n/t'

type Props = { eyebrow: Key; title: Key; maroon?: boolean }

/** Temporary page body until each tab is built. */
export function Placeholder({ eyebrow, title, maroon }: Props) {
  return (
    <div>
      <div className={maroon ? 'eyebrow maroon' : 'eyebrow'}>{t(eyebrow)}</div>
      <h1 className="page-title">{t(title)}</h1>
      <p className="lede">{t('common.comingSoon')}</p>
    </div>
  )
}
