<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import {
  getSystemUsersApi,
  createSystemUserApi,
  updateSystemUserApi,
  deleteSystemUserApi,
  getSystemRolesApi,
  type SysUserRow,
} from '@/api/modules/system'
import type { SysRole } from '@/types'
import { formatDateTime } from '@/utils/format'

const { t } = useI18n()

const list = ref<SysUserRow[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(10)
const status = ref('all')
const keyword = ref('')
const loading = ref(false)

const roles = ref<SysRole[]>([])

async function load() {
  loading.value = true
  try {
    const res = await getSystemUsersApi({
      page: page.value,
      pageSize: pageSize.value,
      status: status.value,
      keyword: keyword.value,
    })
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

async function loadRoles() {
  const res = await getSystemRolesApi({ page: 1, pageSize: 100 })
  roles.value = res.list
}

// 新增 / 编辑
const dialogVisible = ref(false)
const isEdit = ref(false)
const editingId = ref('')
interface UserForm {
  username: string
  name: string
  roleId: string
  phone: string
  email: string
  status: 'active' | 'disabled'
}
const formRef = ref<FormInstance>()
const form = reactive<UserForm>({
  username: '',
  name: '',
  roleId: '',
  phone: '',
  email: '',
  status: 'active',
})
const rules = computed<FormRules>(() => ({
  username: [{ required: true, message: t('admin.systemUsers.usernameRequired'), trigger: 'blur' }],
  name: [{ required: true, message: t('admin.systemUsers.nameRequired'), trigger: 'blur' }],
  roleId: [{ required: true, message: t('admin.systemUsers.roleRequired'), trigger: 'change' }],
}))

function resetForm() {
  form.username = ''
  form.name = ''
  form.roleId = ''
  form.phone = ''
  form.email = ''
  form.status = 'active'
}

function openAdd() {
  isEdit.value = false
  editingId.value = ''
  resetForm()
  dialogVisible.value = true
}

function openEdit(row: SysUserRow) {
  isEdit.value = true
  editingId.value = row.id
  form.username = row.username
  form.name = row.name
  form.roleId = row.roleId
  form.phone = row.phone
  form.email = row.email
  form.status = row.status
  dialogVisible.value = true
}

async function submit() {
  if (!formRef.value) return
  try {
    await formRef.value.validate()
  } catch {
    return
  }
  try {
    if (isEdit.value) await updateSystemUserApi(editingId.value, { ...form })
    else await createSystemUserApi({ ...form })
    ElMessage.success(t('common.opSuccess'))
    dialogVisible.value = false
    load()
  } catch (e) {
    ElMessage.error((e as Error)?.message || t('common.opFailed'))
  }
}

async function toggleStatus(row: SysUserRow, val: string | number | boolean) {
  try {
    await updateSystemUserApi(row.id, { status: String(val) as SysUserRow['status'] })
    ElMessage.success(t('admin.systemUsers.statusUpdated', { name: row.name }))
    load()
  } catch {
    load()
  }
}

async function remove(row: SysUserRow) {
  try {
    await ElMessageBox.confirm(t('admin.systemUsers.deleteConfirm', { name: row.name }), t('common.confirm'), {
      type: 'warning',
      confirmButtonText: t('common.confirm'),
      cancelButtonText: t('common.cancel'),
    })
    await deleteSystemUserApi(row.id)
    ElMessage.success(t('common.opSuccess'))
    load()
  } catch (e) {
    if (e !== 'cancel' && e !== 'close') ElMessage.error((e as Error)?.message || t('common.opFailed'))
  }
}

onMounted(() => {
  load()
  loadRoles()
})
</script>

<template>
  <div class="page-container">
    <div class="page-header">
      <div class="page-title">{{ t('nav.admin.systemUsers') }}</div>
      <div class="page-desc">{{ t('admin.systemUsers.desc') }}</div>
    </div>

    <el-card shadow="never">
      <div class="filter-bar">
        <el-select v-model="status" style="width: 150px" @change="search">
          <el-option :label="t('common.all')" value="all" />
          <el-option :label="t('status.active')" value="active" />
          <el-option :label="t('status.disabled')" value="disabled" />
        </el-select>
        <el-input
          v-model="keyword"
          :placeholder="t('admin.systemUsers.searchPh')"
          style="width: 240px"
          clearable
          @keyup.enter="search"
          @clear="search"
        >
          <template #append><el-button icon="Search" @click="search" /></template>
        </el-input>
        <div class="spacer" />
        <el-button type="primary" icon="Plus" @click="openAdd">{{ t('common.add') }}</el-button>
      </div>

      <el-table v-loading="loading" :data="list" stripe>
        <el-table-column prop="username" :label="t('admin.systemUsers.username')" min-width="130" />
        <el-table-column prop="name" :label="t('admin.systemUsers.name')" min-width="100" />
        <el-table-column :label="t('admin.systemUsers.role')" width="130">
          <template #default="{ row }">
            <el-tag size="small" effect="plain">{{ row.roleName }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column :label="t('admin.common.phone')" width="140">
          <template #default="{ row }">{{ row.phone || '-' }}</template>
        </el-table-column>
        <el-table-column :label="t('admin.systemUsers.email')" min-width="170">
          <template #default="{ row }">{{ row.email || '-' }}</template>
        </el-table-column>
        <el-table-column :label="t('common.status')" width="80">
          <template #default="{ row }">
            <el-switch
              :model-value="row.status"
              :active-value="'active'"
              :inactive-value="'disabled'"
              @change="(v: string | number | boolean) => toggleStatus(row as SysUserRow, v)"
            />
          </template>
        </el-table-column>
        <el-table-column :label="t('admin.systemUsers.lastLoginAt')" min-width="150">
          <template #default="{ row }">{{ row.lastLoginAt ? formatDateTime(row.lastLoginAt) : '-' }}</template>
        </el-table-column>
        <el-table-column :label="t('admin.common.createdAt')" min-width="150">
          <template #default="{ row }">{{ formatDateTime(row.createdAt) }}</template>
        </el-table-column>
        <el-table-column :label="t('common.action')" width="130" fixed="right">
          <template #default="{ row }">
            <el-button size="small" type="primary" link @click="openEdit(row as SysUserRow)">{{ t('common.edit') }}</el-button>
            <el-button size="small" type="danger" link @click="remove(row as SysUserRow)">{{ t('common.delete') }}</el-button>
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

    <el-dialog
      v-model="dialogVisible"
      :title="isEdit ? t('admin.systemUsers.editTitle') : t('admin.systemUsers.addTitle')"
      width="480px"
      destroy-on-close
    >
      <el-form ref="formRef" :model="form" :rules="rules" label-width="88px">
        <el-form-item :label="t('admin.systemUsers.username')" prop="username">
          <el-input v-model="form.username" />
        </el-form-item>
        <el-form-item :label="t('admin.systemUsers.name')" prop="name">
          <el-input v-model="form.name" />
        </el-form-item>
        <el-form-item :label="t('admin.systemUsers.role')" prop="roleId">
          <el-select v-model="form.roleId" style="width: 100%">
            <el-option v-for="r in roles" :key="r.id" :label="r.name" :value="r.id" />
          </el-select>
        </el-form-item>
        <el-form-item :label="t('admin.common.phone')" prop="phone">
          <el-input v-model="form.phone" />
        </el-form-item>
        <el-form-item :label="t('admin.systemUsers.email')" prop="email">
          <el-input v-model="form.email" />
        </el-form-item>
        <el-form-item :label="t('common.status')" prop="status">
          <el-radio-group v-model="form.status">
            <el-radio value="active">{{ t('status.active') }}</el-radio>
            <el-radio value="disabled">{{ t('status.disabled') }}</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">{{ t('common.cancel') }}</el-button>
        <el-button type="primary" @click="submit">{{ t('common.confirm') }}</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.filter-bar {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
}
.spacer {
  flex: 1;
}
.pager {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}
</style>
