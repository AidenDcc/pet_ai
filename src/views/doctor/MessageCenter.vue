<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { showToast, showDialog } from 'vant'
import {
  getMessageListApi,
  getUnreadCountApi,
  batchReadNotificationsApi,
  batchDeleteNotificationsApi,
} from '@/api/modules/notification'
import { relativeTime } from '@/utils/format'
import type { MessageCategory, MessageItem, MessageUnread } from '@/types'

const router = useRouter()
const { t } = useI18n()

/** 医生端消息分两类：问诊消息 / 系统消息 */
const TABS: { key: MessageCategory; titleKey: string }[] = [
  { key: 'consultation', titleKey: 'doctor.message.tabConsultation' },
  { key: 'system', titleKey: 'doctor.message.tabSystem' },
]

const active = ref<MessageCategory>('consultation')
const list = ref<MessageItem[]>([])
const loading = ref(false)
const unread = ref<MessageUnread>({ total: 0, health: 0, community: 0, system: 0, consultation: 0 })

/* ---------- 批量管理 ---------- */
const manageMode = ref(false)
const selectedIds = ref<string[]>([])
const selectedCount = computed(() => selectedIds.value.length)
const allSelected = computed(() => list.value.length > 0 && list.value.every((m) => selectedIds.value.includes(m.id)))

async function loadUnread() {
  try {
    unread.value = await getUnreadCountApi()
  } catch {
    // 忽略未读数加载失败
  }
}

async function loadList() {
  loading.value = true
  try {
    list.value = await getMessageListApi(active.value)
  } catch (e) {
    showToast((e as Error).message || t('common.loadFailed'))
  } finally {
    loading.value = false
  }
}

function onTabChange(name: string | number) {
  active.value = name as MessageCategory
  exitManage()
  loadList()
}

function openDetail(msg: MessageItem) {
  router.push(`/doctor/messages/${msg.id}`)
}

function onItemClick(msg: MessageItem) {
  if (manageMode.value) toggleSelect(msg.id)
  else openDetail(msg)
}

function toggleManage() {
  manageMode.value ? exitManage() : (manageMode.value = true)
}

function exitManage() {
  manageMode.value = false
  selectedIds.value = []
}

function toggleSelect(id: string) {
  const idx = selectedIds.value.indexOf(id)
  if (idx >= 0) selectedIds.value.splice(idx, 1)
  else selectedIds.value.push(id)
}

function toggleSelectAll() {
  selectedIds.value = allSelected.value ? [] : list.value.map((m) => m.id)
}

async function batchRead() {
  if (!selectedCount.value) {
    showToast(t('doctor.message.noSelection'))
    return
  }
  try {
    await batchReadNotificationsApi(selectedIds.value)
    showToast(t('doctor.message.batchReadSuccess'))
    exitManage()
    await Promise.all([loadList(), loadUnread()])
  } catch (e) {
    showToast((e as Error).message || t('common.opFailed'))
  }
}

async function batchDelete() {
  if (!selectedCount.value) {
    showToast(t('doctor.message.noSelection'))
    return
  }
  try {
    await showDialog({
      title: t('common.confirmDelete'),
      message: t('doctor.message.batchDeleteConfirm', { n: selectedCount.value }),
      confirmButtonText: t('common.delete'),
      cancelButtonText: t('common.cancel'),
      confirmButtonColor: '#ff6b6b',
    })
  } catch {
    return
  }
  try {
    await batchDeleteNotificationsApi(selectedIds.value)
    showToast(t('doctor.message.batchDeleteSuccess'))
    exitManage()
    await Promise.all([loadList(), loadUnread()])
  } catch (e) {
    showToast((e as Error).message || t('common.opFailed'))
  }
}

onMounted(() => {
  loadUnread()
  loadList()
})
</script>

<template>
  <div class="msg-center">
    <!-- 问诊消息 / 系统消息（含未读角标）+ 管理切换 -->
    <div class="msg-head">
      <van-tabs v-model:active="active" class="msg-tabs" color="#00b4a6" @change="onTabChange">
        <van-tab v-for="tab in TABS" :key="tab.key" :name="tab.key">
          <template #title>
            <span class="tab-title">
              {{ t(tab.titleKey) }}
              <span v-if="unread[tab.key]" class="tab-badge">{{ unread[tab.key] > 99 ? '99+' : unread[tab.key] }}</span>
            </span>
          </template>
        </van-tab>
      </van-tabs>
      <button class="manage-btn" type="button" @click="toggleManage">
        {{ manageMode ? t('common.done') : t('common.manage') }}
      </button>
    </div>

    <!-- 消息列表 -->
    <div class="msg-list">
      <van-skeleton v-if="loading" title :row="4" />

      <template v-else-if="list.length">
        <div
          v-for="msg in list"
          :key="msg.id"
          class="msg-item sp-card"
          :class="{ 'msg-item--unread': msg.readAt === null }"
          @click="onItemClick(msg)"
        >
          <van-checkbox
            v-if="manageMode"
            class="msg-check"
            :model-value="selectedIds.includes(msg.id)"
            icon-size="18px"
            @click.stop
            @change="toggleSelect(msg.id)"
          />
          <div class="msg-content">
            <div class="msg-head-row">
              <span class="msg-dot"></span>
              <span class="msg-title">{{ msg.title }}</span>
              <span class="msg-time">{{ relativeTime(msg.createdAt) }}</span>
            </div>
            <div class="msg-summary">{{ msg.summary }}</div>
          </div>
        </div>
      </template>

      <van-empty v-else :description="t('doctor.message.empty')" />
    </div>

    <!-- 批量操作栏 -->
    <div v-if="manageMode" class="batch-bar">
      <div class="batch-select" @click="toggleSelectAll">
        <van-checkbox :model-value="allSelected" icon-size="18px" @click.stop />
        <span>{{ t('doctor.message.selectAll') }}</span>
      </div>
      <span class="batch-count">{{ t('doctor.message.selectedCount', { n: selectedCount }) }}</span>
      <button class="batch-btn" type="button" @click="batchRead">{{ t('doctor.message.batchRead') }}</button>
      <button class="batch-btn batch-btn--danger" type="button" @click="batchDelete">{{ t('doctor.message.batchDelete') }}</button>
    </div>
  </div>
</template>

<style scoped lang="scss">
.msg-center {
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: #eef7f6;
}

.msg-head {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  background: #fff;

  .msg-tabs {
    flex: 1;
    min-width: 0;
  }

  .manage-btn {
    flex-shrink: 0;
    padding: 0 14px;
    border: none;
    background: none;
    font-size: 13px;
    color: #00b4a6;
    cursor: pointer;
  }
}

.tab-title {
  display: inline-flex;
  align-items: center;
  gap: 5px;

  .tab-badge {
    min-width: 16px;
    height: 16px;
    padding: 0 4px;
    border-radius: 999px;
    background: #ff4d4f;
    color: #fff;
    font-size: 10px;
    font-weight: 700;
    line-height: 16px;
    text-align: center;
    box-sizing: border-box;
  }
}

.msg-list {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  padding-bottom: 16px;
}

.msg-list .msg-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 13px 14px;
  margin: 12px 14px 0;

  .msg-check {
    flex-shrink: 0;
  }

  .msg-content {
    flex: 1;
    min-width: 0;
  }

  .msg-head-row {
    display: flex;
    align-items: center;
    gap: 8px;

    .msg-dot {
      flex-shrink: 0;
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: transparent;
    }

    .msg-title {
      flex: 1;
      min-width: 0;
      font-size: 15px;
      font-weight: 600;
      color: #2b2b2b;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .msg-time {
      flex-shrink: 0;
      font-size: 11px;
      color: #a0b8b4;
    }
  }

  .msg-summary {
    margin-top: 7px;
    padding-left: 16px;
    font-size: 13px;
    line-height: 1.5;
    color: #5e8580;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &.msg-item--unread {
    background: #f2fcfb;

    .msg-dot {
      background: #ff4d4f;
    }

    .msg-title {
      font-weight: 800;
      color: #1f1f1f;
    }
  }
}

/* ---- 批量操作栏 ---- */
.batch-bar {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  padding-bottom: calc(12px + env(safe-area-inset-bottom));
  background: #fff;
  border-top: 1px solid var(--sp-border);

  .batch-select {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    color: var(--sp-text-secondary);
    cursor: pointer;
  }

  .batch-count {
    flex: 1;
    text-align: center;
    font-size: 12px;
    color: var(--sp-text-placeholder);
  }

  .batch-btn {
    border: 1px solid #00b4a6;
    background: #fff;
    color: #00b4a6;
    font-size: 13px;
    padding: 7px 14px;
    border-radius: 999px;
    cursor: pointer;

    &--danger {
      border-color: #ff6b6b;
      color: #ff6b6b;
    }
  }
}
</style>
