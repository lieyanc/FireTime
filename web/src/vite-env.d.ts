/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_COMMIT_ID: string
  readonly VITE_BUILD_ID: string
  readonly VITE_BUILD_TIME: string
}
