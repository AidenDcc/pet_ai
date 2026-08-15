import type { RouteRecordRaw } from 'vue-router'
import { LOGIN_PATH } from '@/utils/consts'
import type { Role } from '@/types'

export const publicRoutes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'portal',
    component: () => import('@/views/portal/Portal.vue'),
    meta: { public: true },
  },
  /* 旧统一入口兼容：按 ?role= 重定向到对应端登录页 */
  {
    path: '/login',
    redirect: (to) => ({ path: LOGIN_PATH[(to.query.role as Role) || 'user'] || LOGIN_PATH.user }),
  },
  { path: '/register', redirect: '/user/register' },
  { path: '/forgot', redirect: '/user/forgot' },
  /* 宠物主端登录 / 注册 / 找回密码 */
  {
    path: '/user/login',
    name: 'login-user',
    component: () => import('@/views/user/Login.vue'),
    meta: { titleKey: 'login.owner.welcome', public: true, role: 'user' },
  },
  {
    path: '/user/register',
    name: 'register-user',
    component: () => import('@/views/user/Register.vue'),
    meta: { titleKey: 'register.title', public: true, role: 'user' },
  },
  {
    path: '/user/forgot',
    name: 'forgot-user',
    component: () => import('@/views/user/Forgot.vue'),
    meta: { titleKey: 'forgot.title', public: true, role: 'user' },
  },
  /* 医生端登录 / 注册 / 找回密码 */
  {
    path: '/doctor/login',
    name: 'login-doctor',
    component: () => import('@/views/doctor/Login.vue'),
    meta: { titleKey: 'login.doctor.welcome', public: true, role: 'doctor' },
  },
  {
    path: '/doctor/register',
    name: 'register-doctor',
    component: () => import('@/views/doctor/Register.vue'),
    meta: { titleKey: 'register.doctor.welcome', public: true, role: 'doctor' },
  },
  {
    path: '/doctor/forgot',
    name: 'forgot-doctor',
    component: () => import('@/views/doctor/Forgot.vue'),
    meta: { titleKey: 'forgot.doctor.welcome', public: true, role: 'doctor' },
  },
  /* 平台端登录 / 注册 / 找回密码 */
  {
    path: '/admin/login',
    name: 'login-admin',
    component: () => import('@/views/admin/Login.vue'),
    meta: { titleKey: 'login.admin.welcome', public: true, role: 'admin' },
  },
  {
    path: '/admin/register',
    name: 'register-admin',
    component: () => import('@/views/admin/Register.vue'),
    meta: { titleKey: 'register.admin.welcome', public: true, role: 'admin' },
  },
  {
    path: '/admin/forgot',
    name: 'forgot-admin',
    component: () => import('@/views/admin/Forgot.vue'),
    meta: { titleKey: 'forgot.admin.welcome', public: true, role: 'admin' },
  },
  {
    path: '/agreement/:type',
    name: 'agreement',
    component: () => import('@/views/auth/Agreement.vue'),
    meta: { public: true },
  },
  {
    path: '/404',
    name: 'not-found',
    component: () => import('@/views/error/NotFound.vue'),
    meta: { public: true },
  },
]

/** 宠物用户端（移动 APP · 手机外壳） */
export const userRoutes: RouteRecordRaw[] = [
  {
    path: '/user',
    component: () => import('@/layouts/MobileLayout.vue'),
    meta: { role: 'user' },
    children: [
      { path: '', redirect: '/user/home' },
      {
        path: 'home',
        name: 'user-home',
        component: () => import('@/views/user/Home.vue'),
        meta: { titleKey: 'nav.home', tabbar: true, hideNavbar: true },
      },
      {
        path: 'health',
        name: 'user-health',
        component: () => import('@/views/user/Health.vue'),
        meta: { titleKey: 'nav.guard', tabbar: true, hideNavbar: true },
      },
      {
        path: 'health/vitals/:petId/:metricType',
        name: 'user-health-vitals',
        component: () => import('@/views/user/VitalDetail.vue'),
        meta: { titleKey: 'user.health.vitalsTitle' },
      },
      {
        path: 'health/exercise',
        name: 'user-health-exercise',
        component: () => import('@/views/user/FeaturePlaceholder.vue'),
        meta: { titleKey: 'user.health.exerciseTrend', icon: 'chart-trending-o' },
      },
      {
        path: 'health/fence/:petId',
        name: 'user-health-fence',
        component: () => import('@/views/user/FenceManage.vue'),
        meta: { titleKey: 'user.health.fenceManage' },
      },
      {
        path: 'health/track/:petId',
        name: 'user-health-track',
        component: () => import('@/views/user/TrackView.vue'),
        meta: { titleKey: 'user.health.trackTitle' },
      },
      {
        path: 'community',
        name: 'user-community',
        component: () => import('@/views/user/Community.vue'),
        meta: { titleKey: 'nav.community', tabbar: true },
      },
      {
        path: 'community/:id',
        name: 'user-community-detail',
        component: () => import('@/views/user/CommunityDetail.vue'),
        meta: { titleKey: 'nav.communityDetail' },
      },
      // 在线问诊入口：优先展示问诊记录，右下角「问诊」悬浮按钮进入选医生界面
      {
        path: 'consult',
        name: 'user-consult',
        component: () => import('@/views/user/ConsultRecords.vue'),
        meta: { titleKey: 'user.consult.recordsTitle' },
      },
      {
        path: 'consult/doctors',
        name: 'user-consult-doctors',
        component: () => import('@/views/user/Consult.vue'),
        meta: { titleKey: 'nav.consult' },
      },
      {
        path: 'consult/compose',
        name: 'user-consult-compose',
        component: () => import('@/views/user/ConsultCompose.vue'),
        meta: { titleKey: 'user.consult.composeTitle' },
      },
      {
        path: 'consult/records',
        redirect: '/user/consult',
      },
      {
        path: 'consult/records/:id',
        name: 'user-consult-record-detail',
        component: () => import('@/views/user/ConsultDetail.vue'),
        meta: { titleKey: 'user.consult.detailTitle' },
      },
      {
        path: 'recipes',
        name: 'user-recipes',
        component: () => import('@/views/user/FeaturePlaceholder.vue'),
        meta: { titleKey: 'nav.recipes', icon: 'shop-o' },
      },
      {
        path: 'translate',
        name: 'user-translate',
        component: () => import('@/views/user/FeaturePlaceholder.vue'),
        meta: { titleKey: 'nav.translate', icon: 'chat-o' },
      },
      {
        path: 'selfcheck',
        name: 'user-selfcheck',
        component: () => import('@/views/user/FeaturePlaceholder.vue'),
        meta: { titleKey: 'nav.selfcheck', icon: 'checked' },
      },
      {
        path: 'album',
        name: 'user-album',
        component: () => import('@/views/user/FeaturePlaceholder.vue'),
        meta: { titleKey: 'nav.album', icon: 'photo-o' },
      },
      {
        path: 'ledger',
        name: 'user-ledger',
        component: () => import('@/views/user/FeaturePlaceholder.vue'),
        meta: { titleKey: 'nav.ledger', icon: 'gold-coin-o' },
      },
      {
        path: 'todo',
        name: 'user-todo',
        component: () => import('@/views/user/FeaturePlaceholder.vue'),
        meta: { titleKey: 'nav.todo', icon: 'todo-list-o' },
      },
      {
        path: 'me',
        name: 'user-me',
        component: () => import('@/views/user/Me.vue'),
        meta: { titleKey: 'nav.me', tabbar: true, hideNavbar: true },
      },
      {
        path: 'myposts',
        name: 'user-myposts',
        component: () => import('@/views/user/FeaturePlaceholder.vue'),
        meta: { titleKey: 'user.me.myPosts', icon: 'friends-o' },
      },
      {
        path: 'encyclopedia',
        name: 'user-encyclopedia',
        component: () => import('@/views/user/FeaturePlaceholder.vue'),
        meta: { titleKey: 'user.me.encyclopedia', icon: 'shop-o' },
      },
      {
        path: 'settings',
        name: 'user-settings',
        component: () => import('@/views/user/Settings.vue'),
        meta: { titleKey: 'user.settings.title', icon: 'setting-o' },
      },
      {
        path: 'settings/account',
        name: 'user-settings-account',
        component: () => import('@/views/user/AccountInfo.vue'),
        meta: { titleKey: 'user.settings.accountInfo' },
      },
      {
        path: 'settings/password',
        name: 'user-settings-password',
        component: () => import('@/views/user/ChangePassword.vue'),
        meta: { titleKey: 'user.settings.changePassword' },
      },
      {
        path: 'settings/feedback',
        name: 'user-settings-feedback',
        component: () => import('@/views/user/Feedback.vue'),
        meta: { titleKey: 'user.settings.feedback' },
      },
      {
        path: 'settings/about',
        name: 'user-settings-about',
        component: () => import('@/views/user/About.vue'),
        meta: { titleKey: 'user.settings.about' },
      },
      {
        path: 'settings/version',
        name: 'user-settings-version',
        component: () => import('@/views/user/VersionInfo.vue'),
        meta: { titleKey: 'user.settings.version' },
      },
      {
        path: 'settings/services',
        name: 'user-settings-services',
        component: () => import('@/views/user/Services.vue'),
        meta: { titleKey: 'user.settings.services' },
      },
      {
        path: 'settings/services/:type',
        name: 'user-settings-service-detail',
        component: () => import('@/views/user/ServiceDetail.vue'),
        meta: { titleKey: 'user.settings.serviceDetail' },
      },
      {
        path: 'settings/cancel',
        name: 'user-settings-cancel',
        component: () => import('@/views/user/CancelAccount.vue'),
        meta: { titleKey: 'user.settings.cancelAccount' },
      },
      {
        path: 'sync',
        name: 'user-sync',
        component: () => import('@/views/user/SyncData.vue'),
        meta: { titleKey: 'nav.sync' },
      },
      {
        path: 'assistant',
        name: 'user-assistant',
        component: () => import('@/views/user/Assistant.vue'),
        meta: { titleKey: 'nav.assistant' },
      },
      {
        path: 'devices',
        name: 'user-devices',
        component: () => import('@/views/user/DeviceList.vue'),
        meta: { titleKey: 'nav.deviceManage' },
      },
      {
        path: 'devices/bind',
        name: 'user-device-bind',
        component: () => import('@/views/user/DeviceBind.vue'),
        meta: { titleKey: 'nav.bindDevice' },
      },
      {
        path: 'devices/:id',
        name: 'user-device-detail',
        component: () => import('@/views/user/DeviceDetail.vue'),
        meta: { titleKey: 'user.devices.detail' },
      },
      {
        path: 'devices/:id/firmware',
        name: 'user-device-firmware',
        component: () => import('@/views/user/FirmwareUpdate.vue'),
        meta: { titleKey: 'user.firmware.title' },
      },
      {
        path: 'pets',
        name: 'user-pets',
        component: () => import('@/views/user/PetList.vue'),
        meta: { titleKey: 'user.petList.title' },
      },
      {
        path: 'pets/add',
        name: 'user-pet-add',
        component: () => import('@/views/user/PetAdd.vue'),
        meta: { titleKey: 'user.petAdd.title' },
      },
      {
        path: 'pet/:id',
        name: 'user-pet',
        component: () => import('@/views/user/PetProfile.vue'),
        meta: { titleKey: 'nav.petProfile' },
      },
      {
        path: 'reports',
        name: 'user-reports',
        component: () => import('@/views/user/ReportList.vue'),
        meta: { titleKey: 'nav.healthReport' },
      },
      {
        path: 'reports/:id',
        name: 'user-report-detail',
        component: () => import('@/views/user/ReportDetail.vue'),
        meta: { titleKey: 'nav.reportDetail' },
      },
      {
        path: 'subscription',
        name: 'user-subscription',
        component: () => import('@/views/user/Subscription.vue'),
        meta: { titleKey: 'nav.subscription' },
      },
    ],
  },
]

/** 宠物医生端（移动 H5） */
export const doctorRoutes: RouteRecordRaw[] = [
  {
    path: '/doctor',
    component: () => import('@/layouts/MobileLayout.vue'),
    meta: { role: 'doctor' },
    children: [
      { path: '', redirect: '/doctor/dashboard' },
      {
        path: 'dashboard',
        name: 'doctor-dashboard',
        component: () => import('@/views/doctor/Dashboard.vue'),
        meta: { titleKey: 'nav.dashboard', tabbar: true },
      },
      {
        path: 'patients',
        name: 'doctor-patients',
        component: () => import('@/views/doctor/Patients.vue'),
        meta: { titleKey: 'nav.patientManage', tabbar: true },
      },
      {
        path: 'telemetry',
        name: 'doctor-telemetry',
        component: () => import('@/views/doctor/Telemetry.vue'),
        meta: { titleKey: 'nav.telemetry', tabbar: true },
      },
      {
        path: 'reports',
        name: 'doctor-reports',
        component: () => import('@/views/doctor/Reports.vue'),
        meta: { titleKey: 'nav.healthReport', tabbar: true },
      },
      {
        path: 'ai-analysis',
        name: 'doctor-ai',
        component: () => import('@/views/doctor/AiAnalysis.vue'),
        meta: { titleKey: 'nav.aiAnalysis', tabbar: true },
      },
      {
        path: 'bi',
        name: 'doctor-bi',
        component: () => import('@/views/doctor/Bi.vue'),
        meta: { titleKey: 'nav.bi', tabbar: true },
      },
      {
        path: 'pet/:id',
        name: 'doctor-pet-detail',
        component: () => import('@/views/doctor/PetDetail.vue'),
        meta: { titleKey: 'nav.petDetail' },
      },
    ],
  },
]

/** 平台运营端（桌面） */
export const adminRoutes: RouteRecordRaw[] = [
  {
    path: '/admin',
    component: () => import('@/layouts/AdminLayout.vue'),
    meta: { role: 'admin' },
    children: [
      { path: '', redirect: '/admin/dashboard' },
      {
        path: 'dashboard',
        name: 'admin-dashboard',
        component: () => import('@/views/admin/Dashboard.vue'),
        meta: { titleKey: 'nav.admin.dashboard' },
      },
      {
        path: 'bi',
        meta: { titleKey: 'nav.admin.bi' },
        children: [
          { path: '', redirect: '/admin/bi/monitor' },
          {
            path: 'monitor',
            name: 'admin-bi-monitor',
            component: () => import('@/views/admin/bi/MonitorReport.vue'),
            meta: { titleKey: 'nav.admin.biMonitor' },
          },
          {
            path: 'device',
            name: 'admin-bi-device',
            component: () => import('@/views/admin/bi/DeviceReport.vue'),
            meta: { titleKey: 'nav.admin.biDevice' },
          },
          {
            path: 'pet',
            name: 'admin-bi-pet',
            component: () => import('@/views/admin/bi/PetReport.vue'),
            meta: { titleKey: 'nav.admin.biPet' },
          },
          {
            path: 'hospital',
            name: 'admin-bi-hospital',
            component: () => import('@/views/admin/bi/HospitalReport.vue'),
            meta: { titleKey: 'nav.admin.biHospital' },
          },
        ],
      },
      {
        path: 'devices',
        meta: { titleKey: 'nav.admin.devices' },
        children: [
          { path: '', redirect: '/admin/devices/archive' },
          {
            path: 'archive',
            name: 'admin-device-archive',
            component: () => import('@/views/admin/devices/DeviceArchive.vue'),
            meta: { titleKey: 'nav.admin.deviceArchive' },
          },
          {
            path: 'firmware',
            name: 'admin-device-firmware',
            component: () => import('@/views/admin/devices/Firmware.vue'),
            meta: { titleKey: 'nav.admin.deviceFirmware' },
          },
          {
            path: 'active',
            name: 'admin-device-active',
            component: () => import('@/views/admin/devices/ActiveDevices.vue'),
            meta: { titleKey: 'nav.admin.deviceActive' },
          },
        ],
      },
      {
        path: 'users',
        name: 'admin-users',
        component: () => import('@/views/admin/Users.vue'),
        meta: { titleKey: 'nav.admin.users' },
      },
      {
        path: 'pets',
        meta: { titleKey: 'nav.admin.pets' },
        children: [
          { path: '', redirect: '/admin/pets/archive' },
          {
            path: 'archive',
            name: 'admin-pets',
            component: () => import('@/views/admin/Pets.vue'),
            meta: { titleKey: 'nav.admin.petArchive' },
          },
          {
            path: 'health',
            name: 'admin-pet-health',
            component: () => import('@/views/admin/PetHealth.vue'),
            meta: { titleKey: 'nav.admin.petHealth' },
          },
          {
            path: 'reports',
            name: 'admin-pet-reports',
            component: () => import('@/views/admin/PetReports.vue'),
            meta: { titleKey: 'nav.admin.petReports' },
          },
          {
            path: 'reports/:id',
            name: 'admin-pet-report-detail',
            component: () => import('@/views/admin/ReportDetail.vue'),
            meta: { titleKey: 'nav.admin.reportDetail' },
          },
        ],
      },
      {
        path: 'vets',
        name: 'admin-vets',
        component: () => import('@/views/admin/Vets.vue'),
        meta: { titleKey: 'nav.admin.vets' },
      },
      {
        path: 'orders',
        name: 'admin-orders',
        component: () => import('@/views/admin/Orders.vue'),
        meta: { titleKey: 'nav.admin.orders' },
      },
      {
        path: 'subscriptions',
        name: 'admin-subscriptions',
        component: () => import('@/views/admin/Subscriptions.vue'),
        meta: { titleKey: 'nav.admin.subscriptions' },
      },
      {
        path: 'system',
        meta: { titleKey: 'nav.admin.system' },
        children: [
          { path: '', redirect: '/admin/system/users' },
          {
            path: 'users',
            name: 'admin-system-users',
            component: () => import('@/views/admin/system/Users.vue'),
            meta: { titleKey: 'nav.admin.systemUsers' },
          },
          {
            path: 'roles',
            name: 'admin-system-roles',
            component: () => import('@/views/admin/system/Roles.vue'),
            meta: { titleKey: 'nav.admin.roles' },
          },
          {
            path: 'menus',
            name: 'admin-system-menus',
            component: () => import('@/views/admin/system/Menus.vue'),
            meta: { titleKey: 'nav.admin.menus' },
          },
          {
            path: 'dicts',
            name: 'admin-system-dicts',
            component: () => import('@/views/admin/system/Dicts.vue'),
            meta: { titleKey: 'nav.admin.dicts' },
          },
          {
            path: 'logs',
            name: 'admin-system-logs',
            component: () => import('@/views/admin/system/Logs.vue'),
            meta: { titleKey: 'nav.admin.logs' },
          },
          {
            path: 'terminals',
            name: 'admin-system-terminals',
            component: () => import('@/views/admin/system/Terminals.vue'),
            meta: { titleKey: 'nav.admin.terminals' },
          },
          {
            path: 'i18n',
            name: 'admin-system-i18n',
            component: () => import('@/views/admin/I18n.vue'),
            meta: { titleKey: 'nav.admin.i18n' },
          },
        ],
      },
    ],
  },
]
