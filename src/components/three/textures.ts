// Textures painted in code (no image files), shared by the 3D views.
import { CanvasTexture, SRGBColorSpace } from 'three'

/** solar cells and busbars painted onto a small canvas, used as the panel's top */
export function cellTexture(cols: number, rows: number) {
  const c = document.createElement('canvas')
  c.width = 64 * cols
  c.height = 64 * rows
  const g = c.getContext('2d')!
  g.fillStyle = '#0C2A47'
  g.fillRect(0, 0, c.width, c.height)
  for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
    g.fillStyle = '#1B3E66'
    g.fillRect(i * 64 + 3, j * 64 + 3, 58, 58)
    g.fillStyle = '#C9D3DA'
    g.fillRect(i * 64 + 22, j * 64 + 5, 2, 54)
    g.fillRect(i * 64 + 42, j * 64 + 5, 2, 54)
  }
  const tex = new CanvasTexture(c)
  tex.colorSpace = SRGBColorSpace
  return tex
}

