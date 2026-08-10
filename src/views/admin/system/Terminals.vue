<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import {
  getTerminalsApi,
  createTerminalApi,
  updateTerminalApi,
  deleteTerminalApi,
} from '@/api/modules/system'
import type { Terminal, TerminalType } from '@/types'
import { formatDateTime } from '@/utils/format'

const { t } = useI18n()

const list = ref<Terminal[]>([])
const keyword = ref('')
const loading = ref(false)

async function load() {
  loading.value = true
  try {
    list.value = await getTerminalsApi()
  } finally {
    loading.value = false
  }
}

const filtered = computed(() => {
  const kw = keyword.value.trim().toLowerCase()
  if (!kw) return list.value
  return list.value.filter((item) => item.name.toLowerCase().includes(kw) || item.code.toLowerCase().includes(kw))
})

function typeTag(tp: TerminalType) {
  return tp === 'app' ? 'primary' : tp === 'h5' ? 'info' : tp === 'mini' ? 'success' : 'warning'
}

function typeLabel(tp: TerminalType) {
  return tp === 'app'
    ? t('admin.terminals.typeApp')
    : tp === 'h5'
      ? t('admin.terminals.typeH5')
      : tp === 'mini'
        ? t('admin.terminals.typeMini')
        : t('admin.terminals.typePc')
}

// 新增 / 编辑
const dialogVisible = ref(false)
const isEdit = ref(false)
const editingId = ref('')
interface TerminalForm {
  name: string
  code: string
  type: TerminalType
  latestVersion: string
  downloadUrl: string
  status: 'active' | 'disabled'
  remark: string
}
const formRef = ref<FormInstance>()
const form = reactive<TerminalForm>({
  name: '',
  code: '',
  type: 'app',
  latestVersion: '',
  downloadUrl: '',
  status: 'active',
  remark: '',
})
const rules = computed<FormRules>(() => ({
  name: [{ required: true, message: t('admin.terminals.nameRequired'), trigger: 'blur' }],
  code: [{ required: true, message: t('admin.terminals.codeRequired'), trigger: 'blur' }],
}))

function openAdd() {
  isEdit.value = false
  editingId.value = ''
  Object.assign(form, { name: '', code: '', type: 'app', latestVersion: '', downloadUrl: '', status: 'active', remark: '' })
  dialogVisible.value = true
}

function openEdit(row: Terminal) {
  isEdit.value = true
  editingId.value = row.id
  Object.assign(form, {
    name: row.name,
    code: row.code,
    type: row.type,
    latestVersion: row.latestVersion,
    downloadUrl: row.downloadUrl,
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
    if (isEdit.value) await updateTerminalApi(editingId.value, { ...form })
    else await createTerminalApi({ ...form })
    ElMessage.success(t('common.opSuccess'))
    dialogVisible.value = false
    load()
  } catch (e) {
    ElMessage.error((e as Error)?.message || t('common.opFailed'))
  }
}

async function toggleStatus(row: Terminal, val: string | number | boolean) {
  try {
    await updateTerminalApi(row.id, { status: String(val) as Terminal['status'] })
    ElMessage.success(t('common.opSuccess'))
    load()
  } catch {
    load()
  }
}

async function remove(row: Terminal) {
  try {
    await ElMessageBox.confirm(t('admin.terminals.deleteConfirm', { name: row.name }), t('common.confirm'), {
      type: 'warning',
      confirmButtonText: t('common.confirm'),
      cancelButtonText: t('common.cancel'),
    })
    await deleteTerminalApi(row.id)
    ElMessage.success(t('common.opSuccess'))
    load()
  } catch (e) {
    if (e !== 'cancel' && e !== 'close') ElMessage.error((e as Error)?.message || t('common.opFailed'))
  }
}

onMounted(load)
</script>

<template>
  <div class="page-container">
    <div class="page-header">
      <div class="page-title">{{ t('nav.admin.terminals') }}</div>
      <div class="page-desc">{{ t('admin.terminals.desc') }}</div>
    </div>

    <el-card shadow="never">
      <div class="filter-bar">
        <el-input
          v-model="keyword"
          :placeholder="t('admin.terminals.searchPh')"
          style="width: 240px"
          clearable
        />
        <div class="spacer" />
        <el-button icon="Refresh" @click="load">{{ t('common.refresh') }}</el-button>
        <el-button type="primary" icon="Plus" @click="openAdd">{{ t('common.add') }}</el-button>
      </div>

      <el-table v-loading="loading" :data="filtered" stripe>
        <el-table-column prop="name" :label="t('admin.terminals.name')" min-width="140" />
        <el-table-column prop="code" :label="t('admin.terminals.code')" min-width="120">
          <template #default="{ row }">
            <el-tag size="small" effect="plain">{{ row.code }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column :label="t('admin.terminals.type')" width="110">
          <template #default="{ row }">
            <el-tag size="small" :type="typeTag(row.type)" effect="plain">{{ typeLabel(row.type) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="latestVersion" :label="t('admin.terminals.latestVersion')" width="110">
          <template #default="{ row }">{{ row.latestVersion || '-' }}</template>
        </el-table-column>
        <el-table-column :label="t('admin.terminals.downloadUrl')" min-width="220">
          <template #default="{ row }">
            <el-link v-if="row.downloadUrl" type="primary" :href="row.downloadUrl" :underline="false" target="_blank">
              {{ row.downloadUrl }}
            </el-link>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column :label="t('common.status')" width="80">
          <template #default="{ row }">
            <el-switch
              :model-value="row.status"
              :active-value="'active'"
              :inactive-value="'disabled'"
              @change="(v: string | number | boolean) => toggleStatus(row as Terminal, v)"
            />
          </template>
        </el-table-column>
        <el-table-column :label="t('admin.terminals.remark')" min-width="140">
          <template #default="{ row }">{{ row.remark || '-' }}</template>
        </el-table-column>
        <el-table-column :label="t('admin.terminals.updatedAt')" min-width="150">
          <template #default="{ row }">{{ formatDateTime(row.updatedAt) }}</template>
        </el-table-column>
        <el-table-column :label="t('common.action')" width="130" fixed="right">
          <template #default="{ row }">
            <el-button size="small" type="primary" link @click="openEdit(row as Terminal)">{{ t('common.edit') }}</el-button>
            <el-button size="small" type="danger" link @click="remove(row as Terminal)">{{ t('common.delete') }}</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog
      v-model="dialogVisible"
      :title="isEdit ? t('admin.terminals.editTitle') : t('admin.terminals.addTitle')"
      width="480px"
      destroy-on-close
    >
      <el-form ref="formRef" :model="form" :rules="rules" label-width="88px">
        <el-form-item :label="t('admin.terminals.name')" prop="name">
          <el-input v-model="form.name" />
        </el-form-item>
        <el-form-item :label="t('admin.terminals.code')" prop="code">
          <el-input v-model="form.code" />
        </el-form-item>
        <el-form-item :label="t('admin.terminals.type')" prop="type">
          <el-select v-model="form.type" style="width: 100%">
            <el-option :label="t('admin.terminals.typeApp')" value="app" />
            <el-option :label="t('admin.terminals.typeH5')" value="h5" />
            <el-option :label="t('admin.terminals.typeMini')" value="mini" />
            <el-option :label="t('admin.terminals.typePc')" value="pc" />
          </el-select>
        </el-form-item>
        <el-form-item :label="t('admin.terminals.latestVersion')" prop="latestVersion">
          <el-input v-model="form.latestVersion" />
        </el-form-item>
        <el-form-item :label="t('admin.terminals.downloadUrl')" prop="downloadUrl">
          <el-input v-model="form.downloadUrl" />
        </el-form-item>
        <el-form-item :label="t('common.status')" prop="status">
          <el-radio-group v-model="form.status">
            <el-radio value="active">{{ t('status.active') }}</el-radio>
            <el-radio value="disabled">{{ t('status.disabled') }}</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item :label="t('admin.terminals.remark')" prop="remark">
          <el-input v-model="form.remark" type="textarea" :rows="2" />
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
</style>
