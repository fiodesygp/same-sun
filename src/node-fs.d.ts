// The two Node file functions the photo tests use, declared here so the project needs no @types/node
// (vite.config.ts declares process the same way).
declare module 'node:fs' {
  export function readFileSync(path: string): Uint8Array
  export function existsSync(path: string): boolean
}
