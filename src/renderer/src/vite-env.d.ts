/// <reference types="vite/client" />

declare module '*?worker' {
  const worker: new () => Worker
  export default worker
}

declare const self: {
  MonacoEnvironment: {
    getWorker: (workerId: string, label: string) => Worker
  }
} & typeof globalThis
