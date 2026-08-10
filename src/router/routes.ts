import type { RouteRecordRaw } from 'vue-router'

export const publicRoutes: RouteRecordRaw[] = [
  { path: '/', redirect: '/login' },
  {
    path: '/login',
    name: 'login',
    component: () => import('@/views/auth/Login.vue'),
    meta: { titleKey: 'login.title', public: true },
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
        path: 'health/trend/:petId/:metricType',
        name: 'user-health-trend',
        component: () => import('@/views/user/MetricTrend.vue'),
        meta: { titleKey: 'user.health.trendTitle' },
      },
      {
        path: 'health/fence/:petId',
        name: 'user-health-fence',
        component: () => import('@/views/user/FenceManage.vue'),
        meta: { titleKey: 'user.health.fenceManage' },
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
      // 首页功能占位页（在线问诊/爱宠食谱/宠语翻译/健康自检/萌宠相册/爱宠记账/待办记录）
      {
        path: 'consult',
        name: 'user-consult',
        component: () => import('@/views/user/Consult.vue'),
        meta: { titleKey: 'nav.consult' },
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
        meta: { titleKey: 'nav.me', tabbar: true },
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
        name: 'admin-bi',
        component: () => import('@/views/admin/Bi.vue'),
        meta: { titleKey: 'nav.admin.bi' },
      },
      {
        path: 'devices',
        name: 'admin-devices',
        component: () => import('@/views/admin/Devices.vue'),
        meta: { titleKey: 'nav.admin.devices' },
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
