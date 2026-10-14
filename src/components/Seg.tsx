// A row of toggle buttons (aria-pressed). Single choice by default.
type Option<V> = { v: V; label: string; disabled?: boolean }

type Props<V> = {
  options: Option<V>[]
  isOn: (v: V) => boolean
  onPick: (v: V) => void
  label?: string
}

export function Seg<V extends string | number>({ options, isOn, onPick, label }: Props<V>) {
  return (
    <div className="seg" role={label ? 'group' : undefined} aria-label={label}>
      {options.map(o => (
        <button key={String(o.v)} type="button" aria-pressed={isOn(o.v)} disabled={o.disabled} onClick={() => onPick(o.v)}>
          {o.label}
        </button>
      ))}
    </div>
  )
}
