// How many columns a row of equal-width tabs can use so every label stays on one line:
// all of them in one row if the widest label fits, otherwise two (a 2 x 2 grid for four tabs).
export function tabColumns(labelWidths: number[], { width, gap, extra }: { width: number; gap: number; extra: number }) {
  const n = labelWidths.length
  const cell = Math.max(0, ...labelWidths) + extra // the widest label plus its button's padding and border
  return n <= 2 || n * cell + (n - 1) * gap <= width ? n : 2
}
