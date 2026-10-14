/** The sun-over-panel-and-leaf mark from the prototype header. */
export function Logo({ size = 34 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 34 34" aria-hidden="true">
      <circle cx="17" cy="11" r="7" fill="#F2B705" />
      <rect x="4" y="18" width="26" height="5" rx="1.5" fill="#1B3E66" transform="rotate(-8 17 20)" />
      <path d="M17 33 V25 M17 28 q-5 -1 -6 -5 q5 0 6 5 M17 27 q5 -1 6 -5 q-5 0 -6 5" stroke="#3E9B4F" strokeWidth="2" fill="#3E9B4F" />
    </svg>
  )
}
