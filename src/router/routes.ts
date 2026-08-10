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
        meta: { titleKey: 'nav.home', tabbar: true },
      },
      {
        path: 'health',
        name: 'user-health',
        component: () => import('@/views/user/Health.vue'),
        meta: { titleKey: 'nav.healthMonitor', tabbar: true },
      },
      {
        path: 'location',
        name: 'user-location',
        component: () => import('@/views/user/Location.vue'),
        meta: { titleKey: 'nav.realtimeLoc', tabbar: true },
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
        path: 'i18n',
        name: 'admin-i18n',
        component: () => import('@/views/admin/I18n.vue'),
        meta: { titleKey: 'nav.admin.i18n' },
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
        name: 'admin-pets',
        component: () => import('@/views/admin/Pets.vue'),
        meta: { titleKey: 'nav.admin.pets' },
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
    ],
  },
]
