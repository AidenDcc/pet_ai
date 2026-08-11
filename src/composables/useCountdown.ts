import { ref, onBeforeUnmount } from 'vue'

/**
 * 验证码倒计时：start() 后每秒递减，归零自动停止；组件卸载时清理定时器。
 * 多个页面（登录 / 注册 / 找回密码）复用。
 */
export function useCountdown() {
  const seconds = ref(0)
  let timer: number | undefined

  function stop(): void {
    if (timer) {
      window.clearInterval(timer)
      timer = undefined
    }
    seconds.value = 0
  }

  function start(duration = 60): void {
    stop()
    seconds.value = duration
    timer = window.setInterval(() => {
      seconds.value -= 1
      if (seconds.value <= 0) stop()
    }, 1000)
  }

  onBeforeUnmount(stop)

  return { seconds, running: (): boolean => seconds.value > 0, start, stop }
}
