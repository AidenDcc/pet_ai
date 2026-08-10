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
        <el-table-column :label="t('common.action')" width="160">
          <template #default="{ row }">
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
</style>
