import { createApp } from 'vue'
import { createPinia } from 'pinia'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'
import { i18n } from '@/locales'
import { useI18nStore } from '@/stores/i18n'

// 组件样式（组件本身由 unplugin-vue-components 按需注册）
import 'element-plus/dist/index.css'
import 'vant/lib/index.css'
import '@/styles/index.scss'

import App from './App.vue'
import router from './router'

const app = createApp(App)

const pinia = createPinia()
app.use(pinia)
app.use(router)
app.use(i18n)

// 全局注册 Element Plus 图标（菜单/按钮以 <component :is> 方式使用）
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}

// 应用初始语言（Vant / dayjs / HTML lang），并加载运营端配置的词条覆盖
const i18nStore = useI18nStore()
i18nStore.applyLocale(i18nStore.locale)
void i18nStore.loadOverrides()

app.mount('#app')
