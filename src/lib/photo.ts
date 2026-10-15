// Shrink a photo before saving, so many entries fit on the device. Redrawing on a canvas also
// drops the photo's hidden data (EXIF), such as where it was taken.
const MAX_SIDE = 900
const JPEG_QUALITY = 0.72

export function shrinkPhoto(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('decode'))
    }
    img.onload = () => {
      URL.revokeObjectURL(url)
      const k = Math.min(1, MAX_SIDE / Math.max(img.naturalWidth, img.naturalHeight))
      const c = document.createElement('canvas')
      c.width = Math.round(img.naturalWidth * k)
      c.height = Math.round(img.naturalHeight * k)
      const ctx = c.getContext('2d')
      if (!ctx) return reject(new Error('canvas'))
      ctx.drawImage(img, 0, 0, c.width, c.height)
      resolve(c.toDataURL('image/jpeg', JPEG_QUALITY))
    }
    img.src = url
  })
}
