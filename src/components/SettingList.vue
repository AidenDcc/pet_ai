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
  /** 主题：user=宠物端（暖橙），doctor=医生端（青绿） */
  theme: { type: String as PropType<'user' | 'doctor'>, default: 'user' },
})
</script>

<template>
  <div class="setting-list" :class="`setting-list--${theme}`">
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
  /* 主题变量（默认宠物端暖橙，医生端青绿通过 --doctor 覆盖） */
  --sl-icon-bg: #fff6df;
  --sl-icon-color: #e8a21c;
  --sl-label: #2b2b2b;
  --sl-border: #f5efdf;
  --sl-right: #8a7a5a;
  --sl-arrow: #c9b98f;

  &--doctor {
    --sl-icon-bg: #e0f5f2;
    --sl-icon-color: #00b4a6;
    --sl-label: #14403c;
    --sl-border: #e6f2f0;
    --sl-right: #5e8580;
    --sl-arrow: #a0b8b4;
  }

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
      border-top: 1px solid var(--sl-border);
    }
  }

  &__icon {
    width: 36px;
    height: 36px;
    border-radius: 12px;
    background: var(--sl-icon-bg);
    color: var(--sl-icon-color);
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
    color: var(--sl-label);
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
    color: var(--sl-right);
  }

  &__arrow {
    flex-shrink: 0;
    color: var(--sl-arrow);
    font-size: 14px;
  }
}
</style>
