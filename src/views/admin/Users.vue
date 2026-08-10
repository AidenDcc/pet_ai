<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { getAdminUsersApi, type AdminUserRow } from '@/api/modules/admin'
import { formatDate } from '@/utils/format'

const { t } = useI18n()

const list = ref<AdminUserRow[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(10)
const status = ref('all')
const keyword = ref('')
const loading = ref(false)

async function load() {
  loading.value = true
  try {
    const res = await getAdminUsersApi({ page: page.value, pageSize: pageSize.value, status: status.value, keyword: keyword.value })
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

onMounted(load)
</script>

<template>
  <div class="page-container">
    <div class="page-header">
      <div class="page-title">{{ t('nav.admin.users') }}</div>
      <div class="page-desc">{{ t('admin.users.desc') }}</div>
    </div>

    <el-card shadow="never">
      <div class="filter-bar">
        <el-select v-model="status" style="width: 150px" @change="search">
          <el-option :label="t('common.all')" value="all" />
          <el-option :label="t('status.active')" value="active" />
          <el-option :label="t('status.disabled')" value="disabled" />
        </el-select>
        <el-input v-model="keyword" :placeholder="t('admin.users.searchPh')" style="width: 240px" clearable @keyup.enter="search" @clear="search">
          <template #append><el-button icon="Search" @click="search" /></template>
        </el-input>
      </div>

      <el-table v-loading="loading" :data="list" stripe>
        <el-table-column :label="t('admin.common.user')" min-width="180">
          <template #default="{ row }">
            <div class="flex gap-8">
              <el-avatar :src="row.avatar" :size="34">{{ row.name?.slice(0, 1) }}</el-avatar>
              <div>
                <div class="fw-600">{{ row.name }}</div>
                <div class="text-secondary fs-12">{{ row.id }}</div>
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="phone" :label="t('admin.common.phone')" width="140" />
        <el-table-column :label="t('user.me.currentPlan')" width="110">
          <template #default="{ row }">
            <el-tag size="small" effect="plain">
              {{ row.planId === 'premium' ? t('admin.users.planPremium') : row.planId === 'pro' ? t('admin.users.planPro') : t('admin.users.planBasic') }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="petCount" :label="t('admin.common.petCount')" width="80" />
        <el-table-column prop="deviceCount" :label="t('admin.common.deviceCount')" width="80" />
        <el-table-column :label="t('common.status')" width="90">
          <template #default="{ row }">
            <el-tag size="small" :type="row.status === 'active' ? 'success' : 'danger'">
              {{ row.status === 'active' ? t('status.active') : t('status.disabled') }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column :label="t('admin.common.createdAt')" width="120">
          <template #default="{ row }">{{ formatDate(row.registeredAt) }}</template>
        </el-table-column>
        <el-table-column :label="t('admin.common.expireAt')" min-width="120">
          <template #default="{ row }">{{ row.planExpireAt ? formatDate(row.planExpireAt) : '-' }}</template>
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
