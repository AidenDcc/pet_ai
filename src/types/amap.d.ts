/**
 * 高德地图 JS API v2.0 类型声明（仅项目用到的 API）
 */

/** 高德地图 Loader 全局对象 */
interface Window {
  AMapLoader: {
    load(options: { key: string; version: string; plugins?: string[] }): Promise<void>
  }
  _AMapSecurityConfig?: {
    securityJsCode?: string
    serviceHost?: string
  }
  __amap_sdk_ready?: boolean
}

declare namespace AMap {
  /** 经纬度 */
  interface LngLat {
    lng: number
    lat: number
  }

  /** 地图选项 */
  interface MapOptions {
    zoom?: number
    center?: [number, number]
    resizeEnable?: boolean
    viewMode?: '2D' | '3D'
    mapStyle?: string
    layers?: any[]
    features?: string[]
    showBuildingBlock?: boolean
  }

  /** 地图实例 */
  class Map {
    constructor(container: string | HTMLElement, opts?: MapOptions)
    destroy(): void
    setCenter(center: [number, number]): void
    setZoomAndCenter(zoom: number, center: [number, number]): void
    setFitView(overlays?: any[], immediately?: boolean, avoid?: number[], maxZoom?: number): void
    add(overlay: any | any[]): void
    remove(overlay: any | any[]): void
    clearMap(): void
    getCenter(): LngLat
    getZoom(): number
    on(event: string, handler: Function): void
    off(event: string, handler: Function): void
  }

  /** 标记选项 */
  interface MarkerOptions {
    position?: [number, number]
    icon?: string | Icon
    content?: string | HTMLElement
    offset?: Pixel
    zIndex?: number
    title?: string
    label?: { content: string; offset?: Pixel; direction?: string }
  }

  /** 标记 */
  class Marker {
    constructor(opts?: MarkerOptions)
    setPosition(position: [number, number]): void
    getPosition(): LngLat
    setMap(map: Map | null): void
    setContent(content: string | HTMLElement): void
    on(event: string, handler: Function): void
  }

  /** 图标 */
  interface IconOptions {
    size?: Size
    image?: string
    imageSize?: Size
    imageOffset?: Pixel
  }

  class Icon {
    constructor(opts?: IconOptions)
  }

  /** 尺寸 */
  class Size {
    constructor(width: number, height: number)
  }

  /** 像素偏移 */
  class Pixel {
    constructor(x: number, y: number)
  }

  /** 折线选项 */
  interface PolylineOptions {
    path?: [number, number][] | [number, number][]
    strokeColor?: string
    strokeWeight?: number
    strokeOpacity?: number
    strokeStyle?: 'solid' | 'dashed'
    borderWeight?: number
    lineJoin?: 'miter' | 'round' | 'bevel'
    lineCap?: 'butt' | 'round' | 'square'
    geodesic?: boolean
    showDir?: boolean
    zIndex?: number
  }

  /** 折线 */
  class Polyline {
    constructor(opts?: PolylineOptions)
    setPath(path: [number, number][]): void
    setMap(map: Map | null): void
  }

  /** 圆选项 */
  interface CircleOptions {
    center?: [number, number]
    radius?: number
    strokeColor?: string
    strokeWeight?: number
    strokeOpacity?: number
    strokeStyle?: 'solid' | 'dashed'
    fillColor?: string
    fillOpacity?: number
    zIndex?: number
  }

  /** 圆 */
  class Circle {
    constructor(opts?: CircleOptions)
    setCenter(center: [number, number]): void
    setRadius(radius: number): void
    setMap(map: Map | null): void
  }

  /** 信息窗体 */
  interface InfoWindowOptions {
    content?: string | HTMLElement
    offset?: Pixel
    isCustom?: boolean
    autoMove?: boolean
  }

  class InfoWindow {
    constructor(opts?: InfoWindowOptions)
    setContent(content: string | HTMLElement): void
    open(map: Map, pos?: [number, number]): void
    close(): void
  }
}
