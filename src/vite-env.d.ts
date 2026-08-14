/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** 高德地图 JS API Key（Web端） */
  readonly VITE_AMAP_KEY: string
  /** 高德地图安全密钥 securityJsCode */
  readonly VITE_AMAP_JSCODE: string
  /** Deepseek API Key，用于健康报告 AI 生成 */
  readonly VITE_DS_API_KEY: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
