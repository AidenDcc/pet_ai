<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getAdminVetsApi, reviewVetApi } from '@/api/modules/admin'
import type { VetInfo } from '@/types'
import { CERT_STATUS } from '@/utils/consts'

const { t } = useI18n()

const list = ref<VetInfo[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(10)
const status = ref('all')
const loading = ref(false)

async function load() {
  loading.value = true
  try {
    const res = await getAdminVetsApi({ page: page.value, pageSize: pageSize.value, status: status.value })
    list.value = res.list
    total.value = res.total
  } finally {
    loading.value = false
  }
}

function search() {
  page.value = 1
  load()
}

async function review(vet: VetInfo, action: 'approve' | 'reject') {
  try {
    const verb = action === 'approve' ? t('admin.common.approve') : t('admin.common.reject')
    await ElMessageBox.confirm(
      t('admin.vets.confirm', { action: verb, name: vet.name }),
      verb,
      { type: action === 'approve' ? 'success' : 'warning' },
    )
  } catch {
    return
  }
  await reviewVetApi(vet.id, action)
  ElMessage.success(action === 'approve' ? t('admin.vets.approvedMsg') : t('admin.vets.rejectedMsg'))
  await load()
}

// 详情
const detailVisible = ref(false)
const detailRow = ref<VetInfo | null>(null)

function openDetail(row: VetInfo) {
  detailRow.value = row
  detailVisible.value = true
}

onMounted(load)
</script>

<template>
  <div class="page-container">
    <div class="page-header">
      <div class="page-title">{{ t('nav.admin.vets') }}</div>
      <div class="page-desc">{{ t('admin.vets.desc') }}</div>
    </div>

    <el-card shadow="never">
      <div class="filter-bar">
        <el-select v-model="status" style="width: 150px" @change="search">
          <el-option :label="t('common.all')" value="all" />
          <el-option :label="t('status.pendingReview')" value="pending" />
          <el-option :label="t('status.certified')" value="approved" />
          <el-option :label="t('status.rejected')" value="rejected" />
        </el-select>
      </div>

      <el-table v-loading="loading" :data="list" stripe>
        <el-table-column :label="t('role.doctor')" min-width="180">
          <template #default="{ row }">
            <div class="flex gap-8">
              <el-avatar :src="row.avatar" :size="34" />
              <div>
                <div class="fw-600">{{ row.name }}</div>
                <div class="text-secondary fs-12">{{ row.title }}</div>
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="hospital" :label="t('admin.common.hospital')" min-width="170" />
        <el-table-column prop="specialty" :label="t('admin.common.specialty')" min-width="150" />
        <el-table-column prop="phone" :label="t('admin.common.phone')" width="140" />
        <el-table-column :label="t('admin.common.certStatus')" width="110">
          <template #default="{ row }">
            <el-tag size="small" :type="CERT_STATUS[row.certStatus].tag">{{ t(CERT_STATUS[row.certStatus].labelKey) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column :label="t('common.action')" width="230" fixed="right">
          <template #default="{ row }">
            <el-button size="small" type="primary" link @click="openDetail(row as VetInfo)">{{ t('admin.common.viewDetail') }}</el-button>
            <template v-if="row.certStatus === 'pending'">
              <el-button size="small" type="success" @click="review(row as VetInfo, 'approve')">{{ t('admin.common.approve') }}</el-button>
              <el-button size="small" type="danger" plain @click="review(row as VetInfo, 'reject')">{{ t('admin.common.reject') }}</el-button>
            </template>
            <el-tag v-else size="small" type="info">{{ t('admin.vets.handled') }}</el-tag>
          </template>
        </el-table-column>
      </el-table>

      <div class="pager">
        <el-pagination
          v-model:current-page="page"
          v-model:page-size="pageSize"
          :total="total"
          :page-sizes="[10, 20, 50]"
          layout="total, sizes, prev, pager, next"
          background
          @current-change="load"
          @size-change="search"
        />
      </div>
    </el-card>

    <el-dialog v-model="detailVisible" :title="t('admin.common.viewDetail')" width="680px" destroy-on-close>
      <div v-if="detailRow" class="vet-detail">
        <!-- 头部：头像 + 基础信息 + 认证状态 -->
        <div class="vet-head">
          <el-avatar :src="detailRow.avatar" :size="64" class="vet-head-avatar" />
          <div class="vet-head-info">
            <div class="vet-head-name">
              {{ detailRow.name }}
              <el-tag size="small" :type="CERT_STATUS[detailRow.certStatus].tag">
                {{ t(CERT_STATUS[detailRow.certStatus].labelKey) }}
              </el-tag>
            </div>
            <div class="vet-head-sub">
              {{ detailRow.title }} · {{ detailRow.department }} · {{ detailRow.hospital }}
            </div>
            <div class="vet-head-sub">{{ detailRow.phone }}</div>
          </div>
        </div>

        <!-- 统计指标：好评 / 接诊数 / 平均等待时间 -->
        <div class="vet-stats">
          <div class="vet-stat">
            <div class="vet-stat-num">
              {{ detailRow.rating }}<span class="vet-stat-unit">%</span>
            </div>
            <div class="vet-stat-label">{{ t('admin.vets.detail.rating') }}</div>
          </div>
          <div class="vet-stat">
            <div class="vet-stat-num">{{ detailRow.consultCount }}</div>
            <div class="vet-stat-label">{{ t('admin.vets.detail.consultCount') }}</div>
          </div>
          <div class="vet-stat">
            <div class="vet-stat-num">
              {{ detailRow.avgWaitTime }}<span class="vet-stat-unit">{{ t('admin.vets.detail.unitMin') }}</span>
            </div>
            <div class="vet-stat-label">{{ t('admin.vets.detail.avgWaitTime') }}</div>
          </div>
        </div>

        <el-descriptions :column="1" border>
          <el-descriptions-item :label="t('admin.vets.detail.department')">
            {{ detailRow.department || '-' }}
          </el-descriptions-item>
          <el-descriptions-item :label="t('admin.vets.detail.specialty')">
            {{ detailRow.specialty || '-' }}
          </el-descriptions-item>
          <el-descriptions-item :label="t('admin.vets.detail.bio')">
            {{ detailRow.bio || '-' }}
          </el-descriptions-item>
          <el-descriptions-item :label="t('admin.vets.detail.realNameAuth')">
            {{ detailRow.certNo || '-' }}
          </el-descriptions-item>
        </el-descriptions>
      </div>
    </el-dialog>
  </div>
</template>

<style scoped>
.filter-bar {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
}
.pager {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}

/* 医生详情 */
.vet-detail {
  display: flex;
  flex-direction: column;
  gap: 20px;
}
.vet-head {
  display: flex;
  align-items: center;
  gap: 16px;
}
.vet-head-avatar {
  flex-shrink: 0;
  background: var(--el-color-primary-light-8);
}
.vet-head-name {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 6px;
}
.vet-head-sub {
  font-size: 13px;
  color: var(--el-text-color-secondary);
  line-height: 1.7;
}
.vet-stats {
  display: flex;
  background: var(--el-fill-color-lighter);
  border-radius: 8px;
  padding: 14px 0;
}
.vet-stat {
  flex: 1;
  text-align: center;
}
.vet-stat + .vet-stat {
  border-left: 1px solid var(--el-border-color-lighter);
}
.vet-stat-num {
  font-size: 22px;
  font-weight: 700;
  color: var(--el-color-primary);
}
.vet-stat-unit {
  font-size: 12px;
  font-weight: 400;
  color: var(--el-text-color-secondary);
  margin-left: 2px;
}
.vet-stat-label {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  margin-top: 4px;
}
</style>
