import { ref, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { showToast } from 'vant'
import { useAuthStore } from '@/stores/auth'
import { useCountdown } from '@/composables/useCountdown'
import { AREA_CODES, DEMO_ACCOUNTS } from '@/utils/consts'
import { sendCodeApi } from '@/api/modules/auth'
import { authErrorMessage } from '@/utils/authError'
import type { ContactType, Role, VerifyScene } from '@/types'

export interface LoginFormOptions {
  /** 当前登录入口角色：提交时带 role 供 mock 校验账号归属 */
  role: Role
  /** 支持的登录方式（默认两种都启用） */
  modes?: ('pwd' | 'code')[]
  defaultMode?: 'pwd' | 'code'
  /** 验证码登录默认联系方式与区号（欧美用户默认邮箱 +1） */
  defaultContactType?: ContactType
  defaultAreaCode?: string
  /** 是否展示用户协议勾选（宠物主端开启，医生/平台端关闭） */
  showAgreement?: boolean
  /** 提示函数：默认 Vant showToast；平台端可传 ElMessage */
  notify?: (msg: string) => void
}

type DemoAccount = (typeof DEMO_ACCOUNTS)[number]

/**
 * 登录表单共享逻辑：三端登录页（宠物主 / 医生 / 平台）复用，
 * 页面各自负责模板与样式。
 */
export function useLoginForm(options: LoginFormOptions) {
  const {
    role,
    modes = ['pwd', 'code'],
    defaultMode = 'pwd',
    defaultContactType = 'email',
    defaultAreaCode = '+1',
    showAgreement = true,
    notify = showToast,
  } = options

  const router = useRouter()
  const route = useRoute()
  const auth = useAuthStore()
  const { t, locale } = useI18n()

  /* ---------- 登录方式 ---------- */
  const mode = ref<'pwd' | 'code'>(defaultMode)

  /* ---------- 密码登录 ---------- */
  const account = ref('')
  const password = ref('')
  const showPwd = ref(false)
  const pwdType = computed(() => (showPwd.value ? 'text' : 'password'))

  /* ---------- 验证码登录 ---------- */
  const contactType = ref<ContactType>(defaultContactType)
  const areaCode = ref(defaultAreaCode)
  const phone = ref('')
  const email = ref('')
  const code = ref('')
  const codeSending = ref(false)
  const showArea = ref(false)
  const { seconds: codeSeconds, start: startCountdown } = useCountdown()

  const contactValue = computed(() =>
    contactType.value === 'phone' ? phone.value.trim() : email.value.trim(),
  )

  /** 区号选择项（名称随当前语言展示） */
  const areaActions = computed(() =>
    AREA_CODES.map((a) => ({
      name: `${a.code} ${locale.value === 'zh-CN' ? a.name : a.nameEn}`,
      code: a.code,
    })),
  )

  function onAreaSelect(action: { code: string }) {
    areaCode.value = action.code
    showArea.value = false
  }

  /* ---------- 通用 ---------- */
  const agree = ref(true)
  /** 「记住我」默认勾选：跨会话保持，否则仅当前标签页 */
  const remember = ref(true)
  const loading = ref(false)
  const demoAccounts = computed(() => DEMO_ACCOUNTS.filter((d) => d.role === role))

  const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)
  const isPhone = (v: string) => /^[1-9]\d{6,14}$/.test(v)

  /** 校验当前联系方式并返回其值；不合法时提示并返回空串 */
  function validContact(): string {
    const v = contactValue.value
    if (contactType.value === 'phone') {
      if (!v) {
        notify(t('login.phoneRequired'))
        return ''
      }
      if (!isPhone(v)) {
        notify(t('login.invalidPhone'))
        return ''
      }
    } else {
      if (!v) {
        notify(t('login.emailRequired'))
        return ''
      }
      if (!isEmail(v)) {
        notify(t('login.invalidEmail'))
        return ''
      }
    }
    return v
  }

  async function sendCode(scene: VerifyScene) {
    const contact = validContact()
    if (!contact) return
    codeSending.value = true
    try {
      const res = await sendCodeApi({ account: contact, scene })
      startCountdown(60)
      notify(t('login.sendOk', { code: res.code }))
    } catch (e) {
      notify(authErrorMessage(e, t))
    } finally {
      codeSending.value = false
    }
  }

  async function submitPwd() {
    if (showAgreement && !agree.value) {
      notify(t('login.agreeRequired'))
      return
    }
    if (!account.value || !password.value) {
      notify(t('login.required'))
      return
    }
    loading.value = true
    try {
      await auth.login(account.value.trim(), password.value, role, remember.value)
      notify(t('login.success'))
      router.push((route.query.redirect as string) || auth.homePath())
    } catch (e) {
      notify(authErrorMessage(e, t))
    } finally {
      loading.value = false
    }
  }

  async function submitCode() {
    if (showAgreement && !agree.value) {
      notify(t('login.agreeRequired'))
      return
    }
    const contact = validContact()
    if (!contact) return
    if (!code.value) {
      notify(t('login.codeRequired'))
      return
    }
    loading.value = true
    try {
      await auth.loginByCode(contact, code.value, role, remember.value)
      notify(t('login.success'))
      router.push((route.query.redirect as string) || auth.homePath())
    } catch (e) {
      notify(authErrorMessage(e, t))
    } finally {
      loading.value = false
    }
  }

  /** 演示账号一键填充 */
  function fillDemo(demo: DemoAccount) {
    mode.value = 'pwd'
    account.value = demo.account
    password.value = demo.password
  }

  /** 注册 / 找回密码成功返回登录页时（?account=）预填账号 */
  watch(
    () => route.query.account as string | undefined,
    (acc) => {
      if (!acc) return
      mode.value = 'pwd'
      account.value = acc
      password.value = ''
    },
    { immediate: true },
  )

  return {
    mode,
    account,
    password,
    showPwd,
    pwdType,
    contactType,
    areaCode,
    phone,
    email,
    code,
    codeSending,
    showArea,
    codeSeconds,
    agree,
    remember,
    loading,
    showAgreement,
    modes,
    demoAccounts,
    areaActions,
    onAreaSelect,
    sendCode,
    submitPwd,
    submitCode,
    fillDemo,
  }
}
