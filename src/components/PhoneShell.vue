<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'

/** 手机外壳：华为 Mate80 风格 — 居中挖孔屏 + 曲面屏边框，slot 内为 APP 屏幕内容 */
withDefaults(defineProps<{
  transparentStatus?: boolean
}>(), {
  transparentStatus: false,
})

const clock = ref('')
let timer: number | undefined

function tick() {
  const d = new Date()
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  clock.value = `${hh}:${mm}`
}

onMounted(() => {
  tick()
  timer = window.setInterval(tick, 1000)
})

onBeforeUnmount(() => {
  if (timer) window.clearInterval(timer)
})
</script>

<template>
  <div class="phone-shell">
    <!-- 侧边按键 -->
    <div class="side-btn side-btn--power"></div>
    <div class="side-btn side-btn--volume-up"></div>
    <div class="side-btn side-btn--volume-down"></div>

    <div class="phone-screen">
      <!-- 华为 Mate80 居中挖孔前摄 -->
      <div class="phone-punch-hole"></div>

      <!-- 状态栏：时间 + 信号图标 -->
      <div class="phone-statusbar" :class="{ 'statusbar--transparent': transparentStatus }">
        <span class="sb-time">{{ clock }}</span>
        <span class="sb-icons">
          <span class="sb-signal">
            <img src="../asset/image/信号.svg" alt="signal" />
          </span>
          <span class="sb-battery">
            <img src="../asset/image/电池电量.svg" alt="battery" />
          </span>
        </span>
      </div>

      <!-- Vant 弹层 teleport 容器：弹层渲染在此处以约束在手机屏幕内。
           必须位于 slot 之前：slot 内的弹层组件挂载/显示时会解析 teleport 目标，
           若目标声明在 slot 之后，则挂载时目标尚不存在，弹层将无法渲染。 -->
      <div id="phone-teleport" class="phone-teleport"></div>

      <!-- App 内容区域 -->
      <div class="phone-app">
        <slot />
      </div>

      <!-- 底部导航条 -->
      <div class="phone-nav-bar"></div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.phone-shell {
  position: relative;
  width: min(390px, calc(100vw - 32px));
  height: calc(100vh - 48px);
  max-height: 860px;
  min-height: 620px;
  margin: 24px auto;
  padding: 8px;
  border-radius: 48px;
  background: linear-gradient(145deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
  border: 6px solid #2a2a3a;
  box-shadow:
    0 30px 80px rgba(0, 0, 0, 0.35),
    0 0 0 1px rgba(255, 255, 255, 0.08) inset,
    0 0 0 2px rgba(100, 140, 200, 0.15) inset;
}

/* 侧边实体按键 */
.side-btn {
  position: absolute;
  right: -8px;
  background: linear-gradient(180deg, #3a3a4a, #1a1a2a);
  border-radius: 3px 5px 5px 3px;
  z-index: 10;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.4);

  &--power {
    top: 22%;
    width: 4px;
    height: 48px;
  }

  &--volume-up {
    top: 14%;
    width: 4px;
    height: 30px;
  }

  &--volume-down {
    top: 18%;
    width: 4px;
    height: 30px;
  }
}

.phone-screen {
  position: relative;
  width: 100%;
  height: 100%;
  border-radius: 42px;
  overflow: hidden;
  background: var(--sp-bg);
  display: flex;
  flex-direction: column;
  /* transform 使本元素成为 position:fixed 元素的包含块。
     Vant 弹层（action-sheet / popup / toast）默认渲染到 body 且为 fixed 定位，
     若无 transform，它们会覆盖整个浏览器窗口，破坏手机外壳的显示效果；
     加 transform 后这些弹层会被约束在手机屏幕内，无需依赖 teleport。 */
  transform: translateZ(0);
}

/* 居中挖孔前摄 — 华为 Mate80 标志性设计 */
.phone-punch-hole {
  position: absolute;
  top: 8px;
  left: 50%;
  transform: translateX(-50%);
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #000;
  border: 1.5px solid #1a1a1a;
  z-index: 20;
  box-shadow: 0 0 0 2px rgba(0, 0, 0, 0.15);
}

.phone-statusbar {
  flex-shrink: 0;
  height: 34px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  font-size: 13px;
  font-weight: 600;
  color: #fff;
  background: var(--sp-primary);
  transition: background 0.3s;

  &.statusbar--transparent {
    background: transparent;
    color: #333;
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    z-index: 10;
    .sb-signal img,
    .sb-battery img {
      filter: brightness(0.2);
    }
  }

  .sb-icons {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
  }

  .sb-signal {
    font-size: 10px;
    letter-spacing: -1px;
    line-height: 1;

    img {
      display: block;
      width: 17px;
      height: auto;
    }
  }

  .sb-battery {
    display: flex;
    align-items: center;

    img {
      display: block;
      width: 32px;
      height: 20px;
    }
  }
}

.phone-app {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  position: relative;
}

/* 底部手势导航条 */
.phone-nav-bar {
  flex-shrink: 0;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--sp-bg);

  &::after {
    content: '';
    width: 100px;
    height: 4px;
    background: rgba(0, 0, 0, 0.2);
    border-radius: 3px;
  }
}

/* Vant 弹层 teleport 容器：fill the phone screen, position:relative so
   Vant overlays with position:fixed become absolute within */
.phone-teleport {
  position: absolute;
  inset: 0;
  pointer-events: none;
  /* 需高于页面内所有同层遮罩（如守护页信息面板 z-index:100），
     否则 teleport 进来的弹层会被 DOM 顺序更靠后的页面元素盖住 */
  z-index: 400;

  /* allow interaction with children */
  > * {
    pointer-events: auto;
  }
}
</style>
