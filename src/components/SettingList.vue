<script setup lang="ts">
import type { PropType } from 'vue'

/** 设置列表行配置 */
export interface SettingItem {
  /** 唯一标识，用于命名右侧插槽 `#right-{key}` */
  key: string
  /** 行标题（调用方已翻译的文本） */
  label: string
  /** vant 图标名 */
  icon: string
  /** 右侧值文本（有自定义插槽时不生效） */
  right?: string
  /** 是否显示右侧箭头，默认 true */
  showArrow?: boolean
  /** 点击整行（不设置则点击无动作，用于开关行） */
  onClick?: () => void
  /** 危险操作（如注销账号）：图标与文字改为红色 */
  danger?: boolean
}

defineProps({
  items: { type: Array as PropType<SettingItem[]>, required: true },
})
</script>

<template>
  <div class="setting-list">
    <div
      v-for="item in items"
      :key="item.key"
      class="setting-list__item"
      :class="{ 'setting-list__item--danger': item.danger }"
      @click="item.onClick"
    >
      <span class="setting-list__icon">
        <van-icon :name="item.icon" />
      </span>
      <span class="setting-list__label">{{ item.label }}</span>
      <!-- 右侧自定义插槽（如语言开关）：`#right-{key}`，替换默认值 + 箭头 -->
      <slot :name="'right-' + item.key" :item="item">
        <span v-if="item.right" class="setting-list__right">{{ item.right }}</span>
        <van-icon v-if="item.showArrow !== false" name="arrow" class="setting-list__arrow" />
      </slot>
    </div>
  </div>
</template>

<style scoped lang="scss">
/* 设置列表：白色圆角卡，风格与「我的」页 .me-menu 一致 */
.setting-list {
  background: #fff;
  border-radius: 20px;
  margin: 14px 14px 0;
  overflow: hidden;

  &__item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 14px 16px;
    cursor: pointer;

    & + & {
      border-top: 1px solid #f5efdf;
    }
  }

  &__icon {
    width: 36px;
    height: 36px;
    border-radius: 12px;
    background: #fff6df;
    color: #e8a21c;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;

    .van-icon {
      font-size: 20px;
    }
  }

  &__label {
    flex: 1;
    min-width: 0;
    font-size: 15px;
    color: #2b2b2b;
  }

  /* 危险操作（注销账号等）：图标与文字红色 */
  &__item--danger {
    .setting-list__icon {
      background: #ffecec;
      color: #ff3b30;
    }

    .setting-list__label {
      color: #ff3b30;
      font-weight: 600;
    }

    .setting-list__arrow {
      color: #f2b0a8;
    }
  }

  &__right {
    flex-shrink: 0;
    font-size: 13px;
    color: #8a7a5a;
  }

  &__arrow {
    flex-shrink: 0;
    color: #c9b98f;
    font-size: 14px;
  }
}
</style>
