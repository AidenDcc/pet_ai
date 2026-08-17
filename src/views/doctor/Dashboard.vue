<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@/stores/auth'
import { getDoctorMeApi, getDoctorConsultationsApi } from '@/api/modules/consultation'
import { getDoctorPatientsApi } from '@/api/modules/pet'
import { getUnreadCountApi } from '@/api/modules/notification'
import type { VetInfo } from '@/types'
import personalAvatar from '@/asset/image/个人头像.png'

const router = useRouter()
const { t } = useI18n()
const auth = useAuthStore()

const vet = ref<VetInfo | null>(null)
const unreadCount = ref(0)
const pendingConsults = ref(0)
const monitorCount = ref(0)

/** 头像 / 姓名：优先医生档案，回退登录态用户 */
const displayName = computed(() => vet.value?.name ?? auth.user?.name ?? t('role.doctor'))
const displayAvatar = computed(() => vet.value?.avatar ?? auth.user?.avatar ?? personalAvatar)
/** 机构与科室：安心宠物医院 · 内科 · 主任医师 */
const orgLine = computed(() => {
  if (!vet.value) return t('doctor.profile.noRecord')
  const parts = [vet.value.hospital, vet.value.department, vet.value.title].filter(Boolean)
  return parts.join(' · ')
})
const specialty = computed(() => vet.value?.specialty ?? '')

async function load() {
  try {
    const [me, consults, patientPage, unread] = await Promise.all([
      getDoctorMeApi(),
      getDoctorConsultationsApi(),
      getDoctorPatientsApi({ page: 1, pageSize: 1 }),
      getUnreadCountApi(),
    ])
    vet.value = me
    pendingConsults.value = consults.filter((c) => c.replies.length === 0).length
    monitorCount.value = patientPage.total
    unreadCount.value = unread.total
  } catch {
    // 单个接口失败不阻塞整页，保留已加载的数据
  }
}

/** 工作台：在线问诊 / 监护宠物 / 统计分析 / 实时监测（每行 2 个） */
const WORKBENCH = computed(() => [
  {
    key: 'consultation',
    labelKey: 'doctor.workbench.consultation',
    descKey: 'doctor.workbench.consultationDesc',
    icon: '💬',
    color: '#e0f5f2',
    path: '/doctor/consultations',
    badge: pendingConsults.value > 0 ? t('doctor.workbench.pending', { n: pendingConsults.value }) : '',
  },
  {
    key: 'monitor',
    labelKey: 'doctor.workbench.monitor',
    descKey: 'doctor.workbench.monitorDesc',
    icon: '🐾',
    color: '#e8f0fe',
    path: '/doctor/patients',
    badge: monitorCount.value > 0 ? t('doctor.workbench.monitorCount', { n: monitorCount.value }) : '',
  },
  {
    key: 'bi',
    labelKey: 'doctor.workbench.bi',
    descKey: 'doctor.workbench.biDesc',
    icon: '📊',
    color: '#f3e8ff',
    path: '/doctor/bi',
    badge: '',
  },
  {
    key: 'telemetry',
    labelKey: 'doctor.workbench.telemetry',
    descKey: 'doctor.workbench.telemetryDesc',
    icon: '📈',
    color: '#fff3e0',
    path: '/doctor/telemetry',
    badge: '',
  },
])

function go(path: string) {
  router.push(path)
}

onMounted(load)
</script>

<template>
  <div class="dashboard">
    <!-- 顶部青色渐变头部：医生档案 + 右上角消息/设置 -->
    <header class="dash-header">
      <div class="dash-actions">
        <button class="dash-action" type="button" aria-label="message" @click="go('/doctor/messages')">
          <van-icon name="bell" />
          <span v-if="unreadCount" class="dash-badge">{{ unreadCount > 99 ? '99+' : unreadCount }}</span>
        </button>
        <button class="dash-action" type="button" aria-label="settings" @click="go('/doctor/settings')">
          <van-icon name="setting-o" />
        </button>
      </div>

      <div class="dash-profile" @click="go('/doctor/profile')">
        <van-image round width="68" height="68" :src="displayAvatar" class="dash-avatar" />
        <div class="dash-user">
          <div class="dash-name">
            {{ displayName }}
            <van-tag v-if="vet?.title" round plain color="#14403c" text-color="#14403c" class="dash-title-tag">
              {{ vet.title }}
            </van-tag>
          </div>
          <div class="dash-org">{{ orgLine }}</div>
          <div v-if="specialty" class="dash-specialty">{{ t('doctor.profile.specialty') }}：{{ specialty }}</div>
        </div>
        <van-icon name="arrow" class="dash-arrow" />
      </div>
    </header>

    <!-- 工作台 -->
    <section class="workbench">
      <div class="workbench-title">{{ t('doctor.dashboard.title') }}</div>
      <div class="workbench-grid">
        <div
          v-for="item in WORKBENCH"
          :key="item.key"
          class="wb-card sp-card"
          @click="go(item.path)"
        >
          <div class="wb-icon" :style="{ background: item.color }">{{ item.icon }}</div>
          <div class="wb-main">
            <div class="wb-label">{{ t(item.labelKey) }}</div>
            <div class="wb-desc">{{ t(item.descKey) }}</div>
          </div>
          <span v-if="item.badge" class="wb-badge">{{ item.badge }}</span>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped lang="scss">
.dashboard {
  height: 100%;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  box-sizing: border-box;
  padding-bottom: 24px;
  background: #eef7f6;
}

/* ---- 顶部青色渐变头部 ---- */
.dash-header {
  position: relative;
  background: linear-gradient(165deg, #d6f5f1 0%, #7fdcd4 55%, #3ec6bb 100%);
  border-radius: 0 0 28px 28px;
  padding: 46px 18px 52px;
}

.dash-actions {
  position: absolute;
  top: 40px;
  right: 16px;
  display: flex;
  gap: 14px;

  .dash-action {
    position: relative;
    width: 38px;
    height: 38px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.55);
    color: #14403c;
    display: flex;
    align-items: center;
    justify-content: center;

    .van-icon {
      font-size: 20px;
    }
  }

  .dash-badge {
    position: absolute;
    top: -3px;
    right: -3px;
    min-width: 16px;
    height: 16px;
    padding: 0 4px;
    border-radius: 999px;
    background: #ff4d4f;
    border: 1.5px solid #fff;
    color: #fff;
    font-size: 10px;
    font-weight: 700;
    line-height: 16px;
    text-align: center;
    box-sizing: border-box;
  }
}

.dash-profile {
  display: flex;
  align-items: center;
  gap: 15px;
  margin-top: 40px;
  cursor: pointer;

  .dash-avatar {
    flex-shrink: 0;
    border: 3px solid #fff;
    background: #e8f5e9;
  }

  .dash-user {
    flex: 1;
    min-width: 0;

    .dash-name {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 21px;
      font-weight: 800;
      color: #14403c;

      .dash-title-tag {
        flex-shrink: 0;
        font-size: 10px;
      }
    }

    .dash-org {
      margin-top: 6px;
      font-size: 13px;
      font-weight: 600;
      color: #1d6a63;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .dash-specialty {
      margin-top: 3px;
      font-size: 12px;
      color: #2c7c75;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  }

  .dash-arrow {
    flex-shrink: 0;
    color: #2c7c75;
  }
}

/* ---- 工作台 ---- */
.workbench {
  position: relative;
  z-index: 1;
  margin: -28px 14px 0;
}

.workbench-title {
  padding: 0 4px 10px;
  font-size: 16px;
  font-weight: 800;
  color: #14403c;
}

.workbench-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.wb-card {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 12px;
  padding: 16px;
  cursor: pointer;
  position: relative;

  .wb-icon {
    width: 44px;
    height: 44px;
    border-radius: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 22px;
  }

  .wb-main {
    min-width: 0;

    .wb-label {
      font-size: 15px;
      font-weight: 700;
      color: #1f2d3d;
    }

    .wb-desc {
      margin-top: 3px;
      font-size: 12px;
      color: var(--sp-text-secondary);
    }
  }

  .wb-badge {
    position: absolute;
    top: 14px;
    right: 14px;
    font-size: 11px;
    font-weight: 600;
    color: #ff6b00;
    background: #fff3e0;
    border-radius: 999px;
    padding: 2px 8px;
  }
}
</style>
