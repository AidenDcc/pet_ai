<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import {
  getSystemMenusApi,
  createSystemMenuApi,
  updateSystemMenuApi,
  deleteSystemMenuApi,
} from '@/api/modules/system'
import type { MenuType, SysMenu } from '@/types'

const { t } = useI18n()

const tree = ref<SysMenu[]>([])
const fullTree = ref<SysMenu[]>([])
const type = ref('all')
const status = ref('all')
const keyword = ref('')
const loading = ref(false)

async function load() {
  loading.value = true
  try {
    tree.value = await getSystemMenusApi({ type: type.value, status: status.value, keyword: keyword.value })
  } finally {
    loading.value = false
  }
}

async function refreshFullTree() {
  fullTree.value = await getSystemMenusApi()
}

function search() {
  load()
}

function typeTag(tp: MenuType) {
  return tp === 'dir' ? 'warning' : tp === 'menu' ? 'primary' : 'danger'
}

// 新增 / 编辑
const dialogVisible = ref(false)
const isEdit = ref(false)
const editingId = ref('')
interface MenuForm {
  parentId: string
  name: string
  type: MenuType
  icon: string
  path: string
  perm: string
  sort: number
  visible: boolean
  status: 'active' | 'disabled'
}
const formRef = ref<FormInstance>()
const form = reactive<MenuForm>({
  parentId: '',
  name: '',
  type: 'menu',
  icon: '',
  path: '',
  perm: '',
  sort: 0,
  visible: true,
  status: 'active',
})
const rules = computed<FormRules>(() => ({
  name: [{ required: true, message: t('admin.menus.nameRequired'), trigger: 'blur' }],
}))

/** 排除指定节点及其子树，防止编辑时把父级设成自身/子级 */
function excludeNode(nodes: SysMenu[], id: string): SysMenu[] {
  return nodes
    .filter((n) => n.id !== id)
    .map((n) => ({ ...n, children: n.children ? excludeNode(n.children, id) : undefined }))
}

const parentOptions = computed<SysMenu[]>(() => {
  if (isEdit.value && editingId.value) return excludeNode(fullTree.value, editingId.value)
  return fullTree.value
})

function openAdd(parent?: SysMenu) {
  isEdit.value = false
  editingId.value = ''
  Object.assign(form, {
    parentId: parent?.id ?? '',
    name: '',
    type: 'menu' as MenuType,
    icon: '',
    path: '',
    perm: '',
    sort: 0,
    visible: true,
    status: 'active',
  })
  dialogVisible.value = true
}

function openEdit(row: SysMenu) {
  isEdit.value = true
  editingId.value = row.id
  Object.assign(form, {
    parentId: row.parentId ?? '',
    name: row.name,
    type: row.type,
    icon: row.icon,
    path: row.path,
    perm: row.perm,
    sort: row.sort,
    visible: row.visible,
    status: row.status,
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
  const payload = { ...form, parentId: form.parentId || null }
  try {
    if (isEdit.value) await updateSystemMenuApi(editingId.value, payload)
    else await createSystemMenuApi(payload)
    ElMessage.success(t('common.opSuccess'))
    dialogVisible.value = false
    load()
    refreshFullTree()
  } catch (e) {
    ElMessage.error((e as Error)?.message || t('common.opFailed'))
  }
}

async function toggleVisible(row: SysMenu, val: string | number | boolean) {
  try {
    await updateSystemMenuApi(row.id, { visible: Boolean(val) })
    ElMessage.success(t('common.opSuccess'))
    load()
  } catch {
    load()
  }
}

async function toggleStatus(row: SysMenu, val: string | number | boolean) {
  try {
    await updateSystemMenuApi(row.id, { status: String(val) as SysMenu['status'] })
    ElMessage.success(t('common.opSuccess'))
    load()
  } catch {
    load()
  }
}

async function remove(row: SysMenu) {
  try {
    await ElMessageBox.confirm(t('admin.menus.deleteConfirm', { name: row.name }), t('common.confirm'), {
      type: 'warning',
      confirmButtonText: t('common.confirm'),
      cancelButtonText: t('common.cancel'),
    })
    await deleteSystemMenuApi(row.id)
    ElMessage.success(t('common.opSuccess'))
    load()
    refreshFullTree()
  } catch (e) {
    if (e !== 'cancel' && e !== 'close') ElMessage.error((e as Error)?.message || t('common.opFailed'))
  }
}

onMounted(() => {
  load()
  refreshFullTree()
})
</script>

<template>
  <div class="page-container">
    <div class="page-header">
      <div class="page-title">{{ t('nav.admin.menus') }}</div>
      <div class="page-desc">{{ t('admin.menus.desc') }}</div>
    </div>

    <el-card shadow="never">
      <div class="filter-bar">
        <el-select v-model="type" style="width: 130px" @change="search">
          <el-option :label="t('common.all')" value="all" />
          <el-option :label="t('admin.menus.typeDir')" value="dir" />
          <el-option :label="t('admin.menus.typeMenu')" value="menu" />
          <el-option :label="t('admin.menus.typeButton')" value="button" />
        </el-select>
        <el-select v-model="status" style="width: 130px" @change="search">
          <el-option :label="t('common.all')" value="all" />
          <el-option :label="t('status.active')" value="active" />
          <el-option :label="t('status.disabled')" value="disabled" />
        </el-select>
        <el-input
          v-model="keyword"
          :placeholder="t('admin.menus.searchPh')"
          style="width: 240px"
          clearable
          @keyup.enter="search"
          @clear="search"
        >
          <template #append><el-button icon="Search" @click="search" /></template>
        </el-input>
        <div class="spacer" />
        <el-button icon="Refresh" @click="load">{{ t('common.refresh') }}</el-button>
        <el-button type="primary" icon="Plus" @click="openAdd()">{{ t('common.add') }}</el-button>
      </div>

      <el-table
        v-loading="loading"
        :data="tree"
        row-key="id"
        :tree-props="{ children: 'children' }"
        default-expand-all
        stripe
      >
        <el-table-column :label="t('admin.menus.name')" min-width="220">
          <template #default="{ row }">
            <span class="menu-name">
              <el-icon v-if="row.icon"><component :is="row.icon" /></el-icon>
              <span>{{ row.name }}</span>
            </span>
          </template>
        </el-table-column>
        <el-table-column :label="t('admin.menus.type')" width="90">
          <template #default="{ row }">
            <el-tag size="small" :type="typeTag(row.type)" effect="plain">
              {{ row.type === 'dir' ? t('admin.menus.typeDir') : row.type === 'menu' ? t('admin.menus.typeMenu') : t('admin.menus.typeButton') }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column :label="t('admin.menus.icon')" width="110">
          <template #default="{ row }">{{ row.icon || '-' }}</template>
        </el-table-column>
        <el-table-column prop="path" :label="t('admin.menus.path')" min-width="160">
          <template #default="{ row }">{{ row.path || '-' }}</template>
        </el-table-column>
        <el-table-column prop="perm" :label="t('admin.menus.perm')" min-width="170">
          <template #default="{ row }">{{ row.perm || '-' }}</template>
        </el-table-column>
        <el-table-column prop="sort" :label="t('admin.menus.sort')" width="70" />
        <el-table-column :label="t('admin.menus.visible')" width="80">
          <template #default="{ row }">
            <el-switch :model-value="row.visible" @change="(v: string | number | boolean) => toggleVisible(row as SysMenu, v)" />
          </template>
        </el-table-column>
        <el-table-column :label="t('common.status')" width="80">
          <template #default="{ row }">
            <el-switch
              :model-value="row.status"
              :active-value="'active'"
              :inactive-value="'disabled'"
              @change="(v: string | number | boolean) => toggleStatus(row as SysMenu, v)"
            />
          </template>
        </el-table-column>
        <el-table-column :label="t('common.action')" width="190" fixed="right">
          <template #default="{ row }">
            <el-button size="small" type="primary" link @click="openAdd(row as SysMenu)">{{ t('admin.menus.addChild') }}</el-button>
            <el-button size="small" type="primary" link @click="openEdit(row as SysMenu)">{{ t('common.edit') }}</el-button>
            <el-button size="small" type="danger" link @click="remove(row as SysMenu)">{{ t('common.delete') }}</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog
      v-model="dialogVisible"
      :title="isEdit ? t('admin.menus.editTitle') : t('admin.menus.addTitle')"
      width="520px"
      destroy-on-close
    >
      <el-form ref="formRef" :model="form" :rules="rules" label-width="88px">
        <el-form-item :label="t('admin.menus.parentId')" prop="parentId">
          <el-tree-select
            v-model="form.parentId"
            :data="parentOptions"
            node-key="id"
            :props="{ label: 'name', children: 'children' }"
            check-strictly
            clearable
            :render-after-expand="false"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item :label="t('admin.menus.name')" prop="name">
          <el-input v-model="form.name" />
        </el-form-item>
        <el-form-item :label="t('admin.menus.type')" prop="type">
          <el-radio-group v-model="form.type">
            <el-radio value="dir">{{ t('admin.menus.typeDir') }}</el-radio>
            <el-radio value="menu">{{ t('admin.menus.typeMenu') }}</el-radio>
            <el-radio value="button">{{ t('admin.menus.typeButton') }}</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item :label="t('admin.menus.icon')" prop="icon">
          <el-input v-model="form.icon" :placeholder="t('admin.menus.icon')" />
        </el-form-item>
        <el-form-item :label="t('admin.menus.path')" prop="path">
          <el-input v-model="form.path" />
        </el-form-item>
        <el-form-item :label="t('admin.menus.perm')" prop="perm">
          <el-input v-model="form.perm" />
        </el-form-item>
        <el-form-item :label="t('admin.menus.sort')" prop="sort">
          <el-input-number v-model="form.sort" :min="0" :max="999" />
        </el-form-item>
        <el-form-item :label="t('admin.menus.visible')" prop="visible">
          <el-switch v-model="form.visible" />
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
.menu-name {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-weight: 500;
}
</style>
