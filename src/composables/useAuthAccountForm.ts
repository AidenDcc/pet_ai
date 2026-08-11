import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { showToast } from 'vant'
import { useCountdown } from '@/composables/useCountdown'
import { AREA_CODES, LOGIN_PATH } from '@/utils/consts'
import { sendCodeApi, registerApi, resetPasswordApi } from '@/api/modules/auth'
import { authErrorMessage } from '@/utils/authError'
import type { ContactType, Role } from '@/types'

export interface AuthAccountFormOptions {
  /** 当前端角色：注册时创建对应角色账号 */
  role: Role
  /** register=注册 / reset=找回密码 */
  scene: 'register' | 'reset'
  /** 是否展示协议勾选（默认仅宠物主端注册展示） */
  showAgreement?: boolean
  /** 提示函数：默认 Vant showToast；平台端可传 ElMessage */
  notify?: (msg: string) => void
}

/**
 * 注册 / 找回密码共享逻辑：三端（宠物主 / 医生 / 平台）复用，
 * 页面各自负责模板与样式。成功后回本端登录页并带 ?account= 预填账号。
 */
export function useAuthAccountForm(options: AuthAccountFormOptions) {
  const { role, scene, showAgreement = role === 'user', notify = showToast } = options

  const router = useRouter()
  const { t, locale } = useI18n()
  const ns = scene === 'register' ? 'register' : 'forgot'

  /* ---------- 联系方式 ---------- */
  const contactType = ref<ContactType>('phone')
  const areaCode = ref('+86')
  const phone = ref('')
  const email = ref('')
  const code = ref('')

  /* ---------- 密码 ---------- */
  const password = ref('')
  const confirmPwd = ref('')
  const showPwd = ref(false)
  const showConfirmPwd = ref(false)
  const pwdType = computed(() => (showPwd.value ? 'text' : 'password'))
  const confirmPwdType = computed(() => (showConfirmPwd.value ? 'text' : 'password'))

  const agree = ref(true)
  const submitting = ref(false)
  const codeSending = ref(false)
  const showArea = ref(false)
  const { seconds: codeSeconds, start: startCountdown } = useCountdown()

  const contactValue = computed(() =>
    contactType.value === 'phone' ? phone.value.trim() : email.value.trim(),
  )

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

  const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)
  const isPhone = (v: string) => /^[1-9]\d{6,14}$/.test(v)

  /** 校验当前联系方式并返回其值；不合法时提示并返回空串 */
  function validContact(): string {
    const v = contactValue.value
    if (contactType.value === 'phone') {
      if (!v) {
        notify(t(`${ns}.phoneRequired`))
        return ''
      }
      if (!isPhone(v)) {
        notify(t(`${ns}.invalidPhone`))
        return ''
      }
    } else {
      if (!v) {
        notify(t(`${ns}.emailRequired`))
        return ''
      }
      if (!isEmail(v)) {
        notify(t(`${ns}.invalidEmail`))
        return ''
      }
    }
    return v
  }

  async function sendCode() {
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

  /** 成功后回本端登录页，带 ?account= 预填账号 */
  function goLogin(contact: string): void {
    router.replace({ path: LOGIN_PATH[role], query: { account: contact } })
  }

  async function onSubmit() {
    if (showAgreement && !agree.value) {
      notify(t(`${ns}.agreeRequired`))
      return
    }
    const contact = validContact()
    if (!contact) return
    if (!code.value) {
      notify(t(`${ns}.codeRequired`))
      return
    }
    if (!password.value || password.value.length < 6) {
      notify(t(`${ns}.passwordTooShort`))
      return
    }
    if (password.value !== confirmPwd.value) {
      notify(t(`${ns}.pwdMismatch`))
      return
    }
    submitting.value = true
    try {
      if (scene === 'register') {
        await registerApi({ account: contact, password: password.value, code: code.value, role })
        notify(t('register.success'))
      } else {
        await resetPasswordApi({
          account: contact,
          newPassword: password.value,
          code: code.value,
        })
        notify(t('forgot.success'))
      }
      goLogin(contact)
    } catch (e) {
      notify(authErrorMessage(e, t))
    } finally {
      submitting.value = false
    }
  }

  /* ---------- 标题（医生/平台端用各自 welcome/subtitle，宠物主端用通用 title/subtitle） ---------- */
  const titleKey = computed(() => {
    if (role === 'doctor' || role === 'admin') return `${ns}.${role}.welcome`
    return `${ns}.title`
  })
  const subtitleKey = computed(() => {
    if (role === 'doctor' || role === 'admin') return `${ns}.${role}.subtitle`
    return `${ns}.subtitle`
  })
  /** 返回本端登录页路径 */
  const toLogin = LOGIN_PATH[role]

  return {
    scene,
    contactType,
    areaCode,
    phone,
    email,
    code,
    password,
    confirmPwd,
    showPwd,
    showConfirmPwd,
    pwdType,
    confirmPwdType,
    agree,
    showAgreement,
    submitting,
    codeSending,
    showArea,
    codeSeconds,
    areaActions,
    onAreaSelect,
    sendCode,
    onSubmit,
    titleKey,
    subtitleKey,
    toLogin,
  }
}
