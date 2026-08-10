<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'

const route = useRoute()
const { t } = useI18n()

/** 通用「功能开发中」占位页：标题与图标由路由 meta 提供（titleKey / icon） */
const title = computed(() => (route.meta.titleKey ? t(route.meta.titleKey as string) : ''))
const icon = computed(() => (route.meta.icon as string) || 'apps-o')
</script>

<template>
  <div class="feature-placeholder">
    <div class="ph-icon">
      <van-icon :name="icon" size="44" color="#f0b429" />
    </div>
    <div class="ph-title">{{ title }}</div>
    <div class="ph-dev">{{ t('user.home.underDev') }}</div>
  </div>
</template>

<style scoped lang="scss">
.feature-placeholder {
  min-height: 60vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;

  .ph-icon {
    width: 96px;
    height: 96px;
    border-radius: 50%;
    background: #fff8e1;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .ph-title {
    font-size: 18px;
    font-weight: 700;
    color: var(--sp-text);
  }

  .ph-dev {
    font-size: 13px;
    color: var(--sp-text-secondary);
  }
}
</style>
