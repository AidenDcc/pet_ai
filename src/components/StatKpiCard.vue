<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { BiKpi } from '@/types'

const props = defineProps<{ kpi: BiKpi }>()
const { t } = useI18n()

/** 增量趋势：升 / 降 / 持平 */
const trend = computed<'up' | 'down' | 'flat'>(() => {
  if (props.kpi.deltaPct > 0.05) return 'up'
  if (props.kpi.deltaPct < -0.05) return 'down'
  return 'flat'
})

const deltaText = computed(() => {
  const pct = Math.abs(props.kpi.deltaPct)
  return `${props.kpi.period === 'month' ? t('admin.bi.vsMonth') : t('admin.bi.vsWeek')} ${props.kpi.deltaPct >= 0 ? '+' : '-'}${pct}%`
})

const valueText = computed(() => {
  const n = props.kpi.value.toLocaleString()
  return props.kpi.unit ? `${n} ${t(props.kpi.unit)}` : n
})
</script>

<template>
  <div class="stat-kpi-card">
    <div class="kpi-label">{{ t(kpi.labelKey) }}</div>
    <div class="kpi-value">{{ valueText }}</div>
    <div class="kpi-delta" :class="`is-${trend}`">
      <span class="delta-arrow">{{ trend === 'up' ? '▲' : trend === 'down' ? '▼' : '—' }}</span>
      <span>{{ deltaText }}</span>
    </div>
  </div>
</template>

<style scoped>
.stat-kpi-card {
  background: #fff;
  border: 1px solid #e5e8eb;
  border-radius: 10px;
  padding: 16px 18px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  transition: box-shadow 0.2s;
}
.stat-kpi-card:hover {
  box-shadow: 0 4px 14px rgba(60, 138, 108, 0.1);
}
.kpi-label {
  font-size: 13px;
  color: var(--sp-text-secondary, #777);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.kpi-value {
  font-size: 26px;
  font-weight: 800;
  color: #222;
  line-height: 1.1;
  letter-spacing: 0.3px;
}
.kpi-delta {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  font-weight: 600;
  border-radius: 20px;
  padding: 2px 10px;
  align-self: flex-start;
}
.delta-arrow {
  font-size: 10px;
}
.kpi-delta.is-up {
  color: #2f9e6e;
  background: rgba(114, 209, 168, 0.16);
}
.kpi-delta.is-down {
  color: #e05656;
  background: rgba(255, 107, 107, 0.12);
}
.kpi-delta.is-flat {
  color: #8a8f88;
  background: rgba(140, 150, 145, 0.12);
}
</style>
