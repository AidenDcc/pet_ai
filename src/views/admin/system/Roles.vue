<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { ElTree, FormInstance, FormRules } from 'element-plus'
import {
  getSystemRolesApi,
  createSystemRoleApi,
  updateSystemRoleApi,
  deleteSystemRoleApi,
  getSystemMenusApi,
  type SysRoleRow,
} from '@/api/modules/system'
import type { SysMenu } from '@/types'
import { formatDateTime } from '@/utils/format'

const { t } = useI18n()

const list = ref<SysRoleRow[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(10)
const status = ref('all')
const keyword = ref('')
const loading = ref(false)

async function load() {
  loading.value = true
  try {
    const res = await getSystemRolesApi({
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

// 新增 / 编辑
const dialogVisible = ref(false)
const isEdit = ref(false)
const editingId = ref('')
interface RoleForm {
  name: string
  code: string
  sort: number
  status: 'active' | 'disabled'
  remark: string
}
const formRef = ref<FormInstance>()
const form = reactive<RoleForm>({
  name: '',
  code: '',
  sort: 0,
  status: 'active',
  remark: '',
})
const rules = computed<FormRules>(() => ({
  name: [{ required: true, message: t('admin.roles.nameRequired'), trigger: 'blur' }],
  code: [{ required: true, message: t('admin.roles.codeRequired'), trigger: 'blur' }],
}))

function openAdd() {
  isEdit.value = false
  editingId.value = ''
  Object.assign(form, { name: '', code: '', sort: 0, status: 'active', remark: '' })
  dialogVisible.value = true
}

function openEdit(row: SysRoleRow) {
  isEdit.value = true
  editingId.value = row.id
  Object.assign(form, {
    name: row.name,
    code: row.code,
    sort: row.sort,
    status: row.status,
    remark: row.remark,
  })
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
    if (isEdit.value) await updateSystemRoleApi(editingId.value, { ...form })
    else await createSystemRoleApi({ ...form })
    ElMessage.success(t('common.opSuccess'))
    dialogVisible.value = false
    load()
  } catch (e) {
    ElMessage.error((e as Error)?.message || t('common.opFailed'))
  }
}

async function toggleStatus(row: SysRoleRow, val: string | number | boolean) {
  try {
    await updateSystemRoleApi(row.id, { status: String(val) as SysRoleRow['status'] })
    ElMessage.success(t('common.opSuccess'))
    load()
  } catch {
    load()
  }
}

async function remove(row: SysRoleRow) {
  try {
    await ElMessageBox.confirm(t('admin.roles.deleteConfirm', { name: row.name }), t('common.confirm'), {
      type: 'warning',
      confirmButtonText: t('common.confirm'),
      cancelButtonText: t('common.cancel'),
    })
    await deleteSystemRoleApi(row.id)
    ElMessage.success(t('common.opSuccess'))
    load()
  } catch (e) {
    if (e !== 'cancel' && e !== 'close') ElMessage.error((e as Error)?.message || t('common.opFailed'))
  }
}

// 分配权限
const permVisible = ref(false)
const permRole = ref<SysRoleRow | null>(null)
const treeRef = ref<InstanceType<typeof ElTree>>()
const menuTree = ref<SysMenu[]>([])
const permCheckedKeys = computed(() => permRole.value?.menuIds ?? [])

async function openPerm(row: SysRoleRow) {
  permRole.value = row
  menuTree.value = await getSystemMenusApi()
  permVisible.value = true
}

async function savePerm() {
  if (!permRole.value || !treeRef.value) return
  const menuIds = [...(treeRef.value.getCheckedKeys() as string[]), ...(treeRef.value.getHalfCheckedKeys() as string[])]
  try {
    await updateSystemRoleApi(permRole.value.id, { menuIds })
    ElMessage.success(t('admin.roles.permSaved'))
    permVisible.value = false
    load()
  } catch (e) {
    ElMessage.error((e as Error)?.message || t('common.opFailed'))
  }
}

onMounted(load)
</script>

<template>
  <div class="page-container">
    <div class="page-header">
      <div class="page-title">{{ t('nav.admin.roles') }}</div>
      <div class="page-desc">{{ t('admin.roles.desc') }}</div>
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
          :placeholder="t('admin.roles.searchPh')"
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
        <el-table-column prop="name" :label="t('admin.roles.name')" min-width="140" />
        <el-table-column prop="code" :label="t('admin.roles.code')" min-width="120">
          <template #default="{ row }">
            <el-tag size="small" effect="plain">{{ row.code }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="menuCount" :label="t('admin.roles.menuCount')" width="110">
          <template #default="{ row }">{{ row.menuCount }} 项</template>
        </el-table-column>
        <el-table-column prop="sort" :label="t('admin.roles.sort')" width="80" />
        <el-table-column :label="t('common.status')" width="80">
          <template #default="{ row }">
            <el-switch
              :model-value="row.status"
              :active-value="'active'"
              :inactive-value="'disabled'"
              @change="(v: string | number | boolean) => toggleStatus(row as SysRoleRow, v)"
            />
          </template>
        </el-table-column>
        <el-table-column prop="remark" :label="t('admin.roles.remark')" min-width="160">
          <template #default="{ row }">{{ row.remark || '-' }}</template>
        </el-table-column>
        <el-table-column :label="t('admin.common.createdAt')" min-width="150">
          <template #default="{ row }">{{ formatDateTime(row.createdAt) }}</template>
        </el-table-column>
        <el-table-column :label="t('common.action')" width="180" fixed="right">
          <template #default="{ row }">
            <el-button size="small" type="primary" link @click="openEdit(row as SysRoleRow)">{{ t('common.edit') }}</el-button>
            <el-button size="small" type="warning" link @click="openPerm(row as SysRoleRow)">{{ t('admin.roles.assignPerm') }}</el-button>
            <el-button size="small" type="danger" link @click="remove(row as SysRoleRow)">{{ t('common.delete') }}</el-button>
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
      :title="isEdit ? t('admin.roles.editTitle') : t('admin.roles.addTitle')"
      width="480px"
      destroy-on-close
    >
      <el-form ref="formRef" :model="form" :rules="rules" label-width="88px">
        <el-form-item :label="t('admin.roles.name')" prop="name">
          <el-input v-model="form.name" />
        </el-form-item>
        <el-form-item :label="t('admin.roles.code')" prop="code">
          <el-input v-model="form.code" />
        </el-form-item>
        <el-form-item :label="t('admin.roles.sort')" prop="sort">
          <el-input-number v-model="form.sort" :min="0" :max="999" />
        </el-form-item>
        <el-form-item :label="t('common.status')" prop="status">
          <el-radio-group v-model="form.status">
            <el-radio value="active">{{ t('status.active') }}</el-radio>
            <el-radio value="disabled">{{ t('status.disabled') }}</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item :label="t('admin.roles.remark')" prop="remark">
          <el-input v-model="form.remark" type="textarea" :rows="2" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">{{ t('common.cancel') }}</el-button>
        <el-button type="primary" @click="submit">{{ t('common.confirm') }}</el-button>
      </template>
    </el-dialog>

    <el-dialog
      v-model="permVisible"
      :title="t('admin.roles.permTitle')"
      width="420px"
      destroy-on-close
    >
      <div class="perm-role">
        {{ t('admin.roles.name') }}：<b>{{ permRole?.name }}</b>
      </div>
      <el-tree
        ref="treeRef"
        :data="menuTree"
        node-key="id"
        show-checkbox
        :props="{ label: 'name', children: 'children' }"
        :default-checked-keys="permCheckedKeys"
        default-expand-all
      />
      <template #footer>
        <el-button @click="permVisible = false">{{ t('common.cancel') }}</el-button>
        <el-button type="primary" @click="savePerm">{{ t('common.confirm') }}</el-button>
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
.perm-role {
  margin-bottom: 10px;
  font-size: 13px;
  color: var(--sp-text, #303133);
}
</style>
