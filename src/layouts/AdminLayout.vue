<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import { useAuthStore } from '@/stores/auth'
import { useI18nStore } from '@/stores/i18n'
import { LOGIN_PATH, ROLE_LABEL } from '@/utils/consts'
import { PRESET_AVATARS } from '@/utils/presetAvatars'
import { updateAdminProfileApi } from '@/api/modules/admin'
import { changePasswordApi } from '@/api/modules/auth'
import type { AppLocale } from '@/locales'
import type { Role } from '@/types'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const { t } = useI18n()
const i18nStore = useI18nStore()

interface AdminMenuLeaf { path: string; titleKey: string; icon: string }
interface AdminMenuGroupNode { titleKey: string; icon: string; children: AdminMenuLeaf[] }
type AdminMenuNode = AdminMenuLeaf | AdminMenuGroupNode
interface AdminMenuGroup { titleKey: string; nodes: AdminMenuNode[] }

const MENUS: Record<string, AdminMenuGroup[]> = {
  admin: [
    {
      titleKey: 'nav.admin.groupWorkbench',
      nodes: [
        { path: '/admin/dashboard', titleKey: 'nav.admin.dashboard', icon: 'TrendCharts' },
        {
          titleKey: 'nav.admin.bi',
          icon: 'DataAnalysis',
          children: [
            { path: '/admin/bi/monitor', titleKey: 'nav.admin.biMonitor', icon: 'Odometer' },
            { path: '/admin/bi/device', titleKey: 'nav.admin.biDevice', icon: 'Cpu' },
            { path: '/admin/bi/pet', titleKey: 'nav.admin.biPet', icon: 'Coin' },
            { path: '/admin/bi/hospital', titleKey: 'nav.admin.biHospital', icon: 'FirstAidKit' },
          ],
        },
      ],
    },
    {
      titleKey: 'nav.admin.groupBiz',
      nodes: [
        {
          titleKey: 'nav.admin.devices',
          icon: 'Monitor',
          children: [
            { path: '/admin/devices/archive', titleKey: 'nav.admin.deviceArchive', icon: 'Files' },
            { path: '/admin/devices/firmware', titleKey: 'nav.admin.deviceFirmware', icon: 'Upload' },
            { path: '/admin/devices/active', titleKey: 'nav.admin.deviceActive', icon: 'Cpu' },
          ],
        },
        { path: '/admin/users', titleKey: 'nav.admin.users', icon: 'User' },
        {
          titleKey: 'nav.admin.pets',
          icon: 'Coin',
          children: [
            { path: '/admin/pets/archive', titleKey: 'nav.admin.petArchive', icon: 'Document' },
            { path: '/admin/pets/health', titleKey: 'nav.admin.petHealth', icon: 'Monitor' },
            { path: '/admin/pets/reports', titleKey: 'nav.admin.petReports', icon: 'Tickets' },
          ],
        },
        { path: '/admin/vets', titleKey: 'nav.admin.vets', icon: 'FirstAidKit' },
        { path: '/admin/orders', titleKey: 'nav.admin.orders', icon: 'List' },
        { path: '/admin/subscriptions', titleKey: 'nav.admin.subscriptions', icon: 'CreditCard' },
      ],
    },
    {
      titleKey: 'nav.admin.groupSystem',
      nodes: [
        {
          titleKey: 'nav.admin.system',
          icon: 'Setting',
          children: [
            { path: '/admin/system/users', titleKey: 'nav.admin.systemUsers', icon: 'User' },
            { path: '/admin/system/roles', titleKey: 'nav.admin.roles', icon: 'Avatar' },
            { path: '/admin/system/menus', titleKey: 'nav.admin.menus', icon: 'Menu' },
            { path: '/admin/system/dicts', titleKey: 'nav.admin.dicts', icon: 'Notebook' },
            { path: '/admin/system/logs', titleKey: 'nav.admin.logs', icon: 'Document' },
            { path: '/admin/system/terminals', titleKey: 'nav.admin.terminals', icon: 'Monitor' },
            { path: '/admin/system/i18n', titleKey: 'nav.admin.i18n', icon: 'Connection' },
          ],
        },
      ],
    },
  ],
  user: [],
}

const menus = computed(() => MENUS[auth.role] ?? [])

/** 侧边栏当前高亮项：取与当前路径匹配的最长菜单叶子路径。
 *  详情类路由（如 /admin/pets/reports/:id）不在菜单叶子上，需回退到所属菜单叶子以保持高亮与展开。 */
const activeMenu = computed(() => {
  const p = route.path
  const leaves = menus.value.flatMap((g) =>
    g.nodes.flatMap((n) => ('path' in n ? [n.path] : n.children.map((c) => c.path))),
  )
  const match = leaves
    .filter((leaf) => p === leaf || p.startsWith(leaf + '/'))
    .sort((a, b) => b.length - a.length)[0]
  return match ?? p
})

/** 侧边栏折叠：仅展示图标模式（224px ↔ 64px） */
const collapsed = ref(false)

const roleLabel = computed(() => (auth.role ? t(ROLE_LABEL[auth.role as Role]) : ''))
const pageTitle = computed(() => (route.meta.titleKey ? t(route.meta.titleKey as string) : ''))

/** 新密码强度：与后端 mock 校验一致（含字母和数字，6~20 位） */
const PWD_REGEX = /^(?=.*[A-Za-z])(?=.*\d)[\S]{6,20}$/

// ---- 修改头像 ----
const avatarVisible = ref(false)
const savingAvatar = ref(false)
async function selectAvatar(src: string) {
  if (savingAvatar.value) return
  savingAvatar.value = true
  try {
    await updateAdminProfileApi({ avatar: src })
    auth.setUser({ avatar: src })
    avatarVisible.value = false
    ElMessage.success(t('common.saveSuccess'))
  } catch (e) {
    ElMessage.error((e as Error).message || t('common.saveFailed'))
  } finally {
    savingAvatar.value = false
  }
}

// ---- 修改昵称 ----
const nicknameVisible = ref(false)
const nickname = ref('')
const savingNickname = ref(false)
async function saveNickname() {
  const name = nickname.value.trim()
  if (!name) {
    ElMessage.warning(t('user.account.namePlaceholder'))
    return
  }
  if (savingNickname.value) return
  savingNickname.value = true
  try {
    await updateAdminProfileApi({ name })
    auth.setUser({ name })
    nicknameVisible.value = false
    ElMessage.success(t('common.saveSuccess'))
  } catch (e) {
    ElMessage.error((e as Error).message || t('common.saveFailed'))
  } finally {
    savingNickname.value = false
  }
}

// ---- 修改密码 ----
const passwordVisible = ref(false)
const passwordFormRef = ref<FormInstance>()
const savingPassword = ref(false)
const pwdForm = ref({ oldPassword: '', newPassword: '', confirmPassword: '' })
/** validator 运行时取 t()，保证切换语言后提示实时生效 */
const passwordRules: FormRules = {
  oldPassword: [
    {
      validator: (_r, _v, cb) =>
        pwdForm.value.oldPassword ? cb() : cb(new Error(t('user.password.oldRequired'))),
      trigger: 'blur',
    },
  ],
  newPassword: [
    {
      validator: (_r, v, cb) => {
        if (!v) return cb(new Error(t('user.password.newRequired')))
        if (!PWD_REGEX.test(v)) return cb(new Error(t('user.password.formatRule')))
        cb()
      },
      trigger: 'blur',
    },
  ],
  confirmPassword: [
    {
      validator: (_r, v, cb) => {
        if (!v) return cb(new Error(t('user.password.confirmRequired')))
        if (v !== pwdForm.value.newPassword) return cb(new Error(t('user.password.mismatch')))
        cb()
      },
      trigger: 'blur',
    },
  ],
}
async function doChangePassword() {
  const valid = await passwordFormRef.value?.validate().catch(() => false)
  if (!valid) return
  savingPassword.value = true
  try {
    await changePasswordApi({
      oldPassword: pwdForm.value.oldPassword,
      newPassword: pwdForm.value.newPassword,
    })
    ElMessage.success(t('user.password.success'))
    // 改密成功后要求重新登录
    setTimeout(() => {
      auth.logout()
      router.replace(LOGIN_PATH.admin)
    }, 800)
  } catch (e) {
    ElMessage.error((e as Error).message || t('common.opFailed'))
  } finally {
    savingPassword.value = false
  }
}

function onCommand(command: string) {
  if (command === 'avatar') {
    avatarVisible.value = true
  } else if (command === 'nickname') {
    nickname.value = auth.user?.name ?? ''
    nicknameVisible.value = true
  } else if (command === 'password') {
    pwdForm.value = { oldPassword: '', newPassword: '', confirmPassword: '' }
    passwordFormRef.value?.clearValidate()
    passwordVisible.value = true
  } else if (command === 'switch' || command === 'logout') {
    auth.logout()
    router.push('/')
  }
}
</script>

<template>
  <el-config-provider :locale="i18nStore.elLocale">
    <el-container class="admin-layout">
      <el-aside :width="collapsed ? '64px' : '224px'" class="admin-aside">
        <el-menu
          class="admin-menu"
          :collapse="collapsed"
          :collapse-transition="false"
          :default-active="activeMenu"
          router
        >
          <template v-for="group in menus" :key="group.titleKey">
            <el-menu-item-group :title="t(group.titleKey)">
              <template v-for="node in group.nodes" :key="'path' in node ? node.path : node.titleKey">
                <el-sub-menu v-if="!('path' in node)" :index="node.titleKey">
                  <template #title>
                    <el-icon><component :is="node.icon" /></el-icon>
                    <span>{{ t(node.titleKey) }}</span>
                  </template>
                  <el-menu-item v-for="c in node.children" :key="c.path" :index="c.path">
                    <el-icon><component :is="c.icon" /></el-icon>
                    <span>{{ t(c.titleKey) }}</span>
                  </el-menu-item>
                </el-sub-menu>
                <el-menu-item v-else :index="node.path">
                  <el-icon><component :is="node.icon" /></el-icon>
                  <span>{{ t(node.titleKey) }}</span>
                </el-menu-item>
              </template>
            </el-menu-item-group>
          </template>
        </el-menu>

        <div
          class="aside-fold"
          :title="t(collapsed ? 'common.unfold' : 'common.fold')"
          @click="collapsed = !collapsed"
        >
          <el-icon><component :is="collapsed ? 'Expand' : 'Fold'" /></el-icon>
          <span v-if="!collapsed">{{ t(collapsed ? 'common.unfold' : 'common.fold') }}</span>
        </div>
      </el-aside>

      <el-container class="admin-body">
        <el-header class="admin-header">
          <div class="header-left">
            <div class="admin-logo">
              <span class="logo-dot">🐾</span>
              <div>
                <div class="logo-title">{{ t('brand.name') }}</div>
                <div class="logo-sub">{{ t('brand.platform') }}</div>
              </div>
            </div>
            <div class="header-title">{{ pageTitle }}</div>
          </div>
          <div class="header-right">
            <el-dropdown @command="(cmd: string) => i18nStore.applyLocale(cmd as AppLocale)">
              <span class="lang-chip">
                <el-icon><Earth /></el-icon>
                <span>{{ i18nStore.locale === 'zh-CN' ? t('admin.i18n.zh') : t('admin.i18n.en') }}</span>
                <el-icon><arrow-down /></el-icon>
              </span>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item command="zh-CN">{{ t('admin.i18n.zh') }}</el-dropdown-item>
                  <el-dropdown-item command="en-US">{{ t('admin.i18n.en') }}</el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
            <el-tag size="small" type="primary" effect="light">{{ roleLabel }}</el-tag>
            <el-dropdown trigger="click" @command="onCommand">
              <span class="user-chip">
                <el-avatar :size="30" :src="auth.user?.avatar">
                  {{ auth.user?.name?.slice(0, 1) }}
                </el-avatar>
                <span class="user-name">{{ auth.user?.name }}</span>
                <el-icon><arrow-down /></el-icon>
              </span>
              <template #dropdown>
                <el-dropdown-menu class="user-menu">
                  <el-dropdown-item class="user-menu-card" disabled>
                    <el-avatar :size="40" :src="auth.user?.avatar">
                      {{ auth.user?.name?.slice(0, 1) }}
                    </el-avatar>
                    <div class="user-card-info">
                      <div class="user-card-name">{{ auth.user?.name || '—' }}</div>
                      <div class="user-card-row">
                        <el-tag size="small" type="primary" effect="light">{{ roleLabel }}</el-tag>
                      </div>
                      <div class="user-card-row">
                        <span class="user-card-label">{{ t('admin.userMenu.account') }}</span>
                        <span class="user-card-account">{{ auth.user?.account || '—' }}</span>
                      </div>
                    </div>
                  </el-dropdown-item>
                  <el-dropdown-item command="avatar">
                    <el-icon><Picture /></el-icon>{{ t('admin.userMenu.changeAvatar') }}
                  </el-dropdown-item>
                  <el-dropdown-item command="nickname">
                    <el-icon><EditPen /></el-icon>{{ t('admin.userMenu.changeNickname') }}
                  </el-dropdown-item>
                  <el-dropdown-item command="password">
                    <el-icon><Lock /></el-icon>{{ t('admin.userMenu.changePassword') }}
                  </el-dropdown-item>
                  <el-dropdown-item command="switch" divided>
                    <el-icon><SwitchButton /></el-icon>{{ t('common.switchRole') }}
                  </el-dropdown-item>
                  <el-dropdown-item command="logout">
                    <el-icon><Close /></el-icon>{{ t('common.logout') }}
                  </el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>
        </el-header>
        <el-main class="admin-main">
          <router-view />
        </el-main>
      </el-container>
    </el-container>

    <!-- 修改头像：预设头像宫格，点击即保存 -->
    <el-dialog v-model="avatarVisible" :title="t('admin.userMenu.changeAvatar')" width="360px">
      <div class="avatar-grid">
        <div
          v-for="a in PRESET_AVATARS"
          :key="a.id"
          class="avatar-grid__item"
          :class="{ 'is-active': auth.user?.avatar === a.src }"
          @click="selectAvatar(a.src)"
        >
          <img :src="a.src" :alt="a.id" />
        </div>
      </div>
      <template #footer>
        <el-button @click="avatarVisible = false">{{ t('common.cancel') }}</el-button>
      </template>
    </el-dialog>

    <!-- 修改昵称 -->
    <el-dialog v-model="nicknameVisible" :title="t('admin.userMenu.changeNickname')" width="400px">
      <el-input
        v-model="nickname"
        :placeholder="t('user.account.namePlaceholder')"
        maxlength="20"
        show-word-limit
        @keyup.enter="saveNickname"
      />
      <template #footer>
        <el-button @click="nicknameVisible = false">{{ t('common.cancel') }}</el-button>
        <el-button type="primary" :loading="savingNickname" @click="saveNickname">{{ t('common.save') }}</el-button>
      </template>
    </el-dialog>

    <!-- 修改密码 -->
    <el-dialog v-model="passwordVisible" :title="t('admin.userMenu.changePassword')" width="420px">
      <el-form ref="passwordFormRef" :model="pwdForm" :rules="passwordRules" label-width="88px" @submit.prevent>
        <el-form-item :label="t('user.password.oldPassword')" prop="oldPassword">
          <el-input
            v-model="pwdForm.oldPassword"
            type="password"
            show-password
            maxlength="20"
            :placeholder="t('user.password.oldPasswordPlaceholder')"
          />
        </el-form-item>
        <el-form-item :label="t('user.password.newPassword')" prop="newPassword">
          <el-input
            v-model="pwdForm.newPassword"
            type="password"
            show-password
            maxlength="20"
            :placeholder="t('user.password.newPasswordPlaceholder')"
          />
        </el-form-item>
        <el-form-item :label="t('user.password.confirmPassword')" prop="confirmPassword">
          <el-input
            v-model="pwdForm.confirmPassword"
            type="password"
            show-password
            maxlength="20"
            :placeholder="t('user.password.confirmPasswordPlaceholder')"
          />
        </el-form-item>
      </el-form>
      <div class="pwd-hint">{{ t('user.password.formatRule') }}</div>
      <template #footer>
        <el-button @click="passwordVisible = false">{{ t('common.cancel') }}</el-button>
        <el-button type="primary" :loading="savingPassword" @click="doChangePassword">{{ t('common.save') }}</el-button>
      </template>
    </el-dialog>
  </el-config-provider>
</template>

<style scoped lang="scss">
.admin-layout {
  height: 100vh;
}

.admin-aside {
  background: #f9fcf7;
  border-right: 1px solid #e5e8eb;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  transition: width 0.2s ease;
}

.admin-menu {
  flex: 1;
  border-right: none;
  background: transparent;
  padding: 8px 10px;
  overflow-y: auto;
  --el-menu-bg-color: transparent;
  --el-menu-text-color: #555a52;
  --el-menu-hover-bg-color: rgba(114, 209, 168, 0.18);
  --el-menu-hover-text-color: #3c8a6c;
  --el-menu-active-color: #3c8a6c;
  --el-menu-item-height: 42px;
  --el-menu-sub-item-height: 40px;

  :deep(.el-menu-item-group__title) {
    font-size: 12px;
    color: #a8b3ab;
    padding: 14px 16px 6px;
  }

  .el-menu-item,
  .el-sub-menu__title {
    border-radius: 8px;
    margin-bottom: 2px;
    font-size: 14px;
    color: #555a52;
    &:hover {
      color: #3c8a6c;
    }
  }

  .el-menu-item.is-active {
    background: rgba(114, 209, 168, 0.28);
    color: #3c8a6c;
    font-weight: 600;
  }

  .el-sub-menu {
    &.is-active > .el-sub-menu__title {
      color: #3c8a6c;
      font-weight: 600;
    }
    :deep(.el-menu) {
      background: transparent;
    }
  }

  &.el-menu--collapse {
    padding: 8px;
    :deep(.el-menu-item-group__title) {
      padding: 10px 0 4px;
      text-align: center;
    }
    .el-menu-item,
    .el-sub-menu__title {
      padding: 0 16px;
    }
  }
}

.aside-fold {
  display: flex;
  align-items: center;
  gap: 10px;
  height: 46px;
  padding: 0 18px;
  margin: 8px 10px;
  border-radius: 8px;
  color: #777777;
  font-size: 13px;
  cursor: pointer;
  user-select: none;
  transition: all 0.2s;
  white-space: nowrap;
  &:hover {
    background: rgba(114, 209, 168, 0.18);
    color: #3c8a6c;
  }
}

.admin-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #fff;
  border-bottom: 1px solid #e5e8eb;
  height: 60px;
  padding: 0 20px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 22px;
  min-width: 0;
}

.admin-logo {
  display: flex;
  align-items: center;
  gap: 10px;
  .logo-dot {
    font-size: 24px;
  }
  .logo-title {
    font-size: 17px;
    font-weight: 700;
    letter-spacing: 0.5px;
    color: #222222;
  }
  .logo-sub {
    font-size: 11px;
    color: #a8b3ab;
    margin-top: 1px;
  }
}

.header-title {
  font-size: 17px;
  font-weight: 600;
  color: #222222;
  white-space: nowrap;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 14px;
}

.lang-chip {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  outline: none;
  font-size: 13px;
  color: #555a52;
}

.user-chip {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  outline: none;
  .user-name {
    font-size: 14px;
    color: #555a52;
  }
}

.admin-main {
  background: #f9fcf7;
  padding: 20px;
  overflow-y: auto;
}

/* ---- 修改头像宫格（对话框默认原地渲染，scoped 可命中） ---- */
.avatar-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  justify-items: center;
  padding: 4px 0;

  &__item {
    width: 72px;
    height: 72px;
    border-radius: 50%;
    padding: 3px;
    cursor: pointer;

    img {
      width: 100%;
      height: 100%;
      border-radius: 50%;
      object-fit: cover;
      display: block;
    }

    &.is-active {
      outline: 3px solid #3c8a6c;
    }
  }
}

.pwd-hint {
  font-size: 12px;
  color: #a8b3ab;
  line-height: 1.5;
}
</style>

<style lang="scss">
/* 用户下拉菜单 teleport 到 body，scoped 样式打不到，需非 scoped 全局样式 */
.user-menu.el-dropdown-menu {
  padding: 6px;
  min-width: 230px;

  .el-dropdown-menu__item {
    border-radius: 6px;
    .el-icon {
      margin-right: 6px;
    }
  }

  /* 顶部用户信息卡（禁用项去灰） */
  .el-dropdown-menu__item.is-disabled.user-menu-card {
    cursor: default;
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 12px;
    margin-bottom: 6px;
    border-bottom: 1px solid var(--el-border-color-lighter);
    color: var(--el-text-color-primary);

    &:hover {
      background: transparent;
    }
  }

  .user-card-info {
    display: flex;
    flex-direction: column;
    gap: 3px;
    min-width: 0;
  }

  .user-card-name {
    font-size: 15px;
    font-weight: 600;
    color: #222;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .user-card-row {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
  }

  .user-card-label {
    color: #a8b3ab;
  }

  .user-card-account {
    color: #555a52;
  }
}
</style>
