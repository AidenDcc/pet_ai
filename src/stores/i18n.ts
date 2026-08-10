import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { Locale as VantLocale } from 'vant'
import zhCNVant from 'vant/es/locale/lang/zh-CN'
import enUSVant from 'vant/es/locale/lang/en-US'
import zhCnEl from 'element-plus/es/locale/lang/zh-cn'
import enEl from 'element-plus/es/locale/lang/en'
import dayjs from 'dayjs'
import 'dayjs/locale/zh-cn'
import 'dayjs/locale/en'
import {
  i18n,
  baseMessages,
  deepMerge,
  unflattenMessages,
  getInitialLocale,
  type AppLocale,
  type MessageDict,
  type I18nEntry,
} from '@/locales'
import { getI18nEntriesApi, saveI18nEntryApi, deleteI18nEntryApi } from '@/api/modules/i18n'

export const useI18nStore = defineStore('i18n', () => {
  const locale = ref<AppLocale>(getInitialLocale())
  /** 全量词条（基础 + override） */
  const entries = ref<MessageDict>({})
  /** 仅 override 词条 */
  const overrides = ref<MessageDict>({})

  const elLocale = computed(() => (locale.value === 'zh-CN' ? zhCnEl : enEl))

  function applyLocale(lang: AppLocale) {
    locale.value = lang
    i18n.global.locale.value = lang
    localStorage.setItem('sp_locale', lang)
    VantLocale.use(lang, lang === 'zh-CN' ? zhCNVant : enUSVant)
    dayjs.locale(lang === 'zh-CN' ? 'zh-cn' : 'en')
    document.documentElement.lang = lang
  }

  function toggleLocale() {
    applyLocale(locale.value === 'zh-CN' ? 'en-US' : 'zh-CN')
  }

  /** 将 override 合并进基础词条，重写两语 messages */
  function rebuildMessages() {
    for (const lang of ['zh-CN', 'en-US'] as AppLocale[]) {
      const over = unflattenMessages(
        Object.fromEntries(
          Object.entries(overrides.value).map(([k, v]) => [k, lang === 'zh-CN' ? v.zh : v.en]),
        ),
      )
      i18n.global.setLocaleMessage(lang, deepMerge(baseMessages[lang], over))
    }
  }

  async function loadOverrides() {
    try {
      const list = await getI18nEntriesApi()
      const all: MessageDict = {}
      const ov: MessageDict = {}
      for (const e of list) {
        all[e.key] = { zh: e.zh, en: e.en }
        if (e.isOverride) ov[e.key] = { zh: e.zh, en: e.en }
      }
      entries.value = all
      overrides.value = ov
      rebuildMessages()
    } catch {
      // 保持基础词条
    }
  }

  function syncEntry(entry: I18nEntry, baseZh: string, baseEn: string) {
    entries.value[entry.key] = { zh: entry.zh, en: entry.en }
    if (entry.zh === baseZh && entry.en === baseEn) {
      delete overrides.value[entry.key]
    } else {
      overrides.value[entry.key] = { zh: entry.zh, en: entry.en }
    }
    rebuildMessages()
  }

  async function saveEntry(entry: I18nEntry) {
    await saveI18nEntryApi(entry)
    syncEntry(entry, baseZhOf(entry.key), baseEnOf(entry.key))
  }

  async function removeEntry(key: string) {
    await deleteI18nEntryApi(key)
    delete entries.value[key]
    delete overrides.value[key]
    rebuildMessages()
  }

  return {
    locale,
    entries,
    overrides,
    elLocale,
    applyLocale,
    toggleLocale,
    loadOverrides,
    saveEntry,
    removeEntry,
    syncEntry,
  }
})

/** 从基础词条取某 key 的默认值（供“等于默认即恢复”判断） */
function baseZhOf(key: string): string {
  const node = resolveKey(baseMessages['zh-CN'], key)
  return typeof node === 'string' ? node : ''
}
function baseEnOf(key: string): string {
  const node = resolveKey(baseMessages['en-US'], key)
  return typeof node === 'string' ? node : ''
}
function resolveKey(obj: Record<string, unknown>, key: string): unknown {
  let node: unknown = obj
  for (const p of key.split('.')) {
    if (node && typeof node === 'object' && p in (node as Record<string, unknown>)) {
      node = (node as Record<string, unknown>)[p]
    } else {
      return undefined
    }
  }
  return node
}
