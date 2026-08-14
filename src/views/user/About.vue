<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import logoUrl from '@/asset/image/logo-rectangle.png'

const { t } = useI18n()
</script>

<template>
  <div class="about-page">
    <div class="about-card">
      <img class="about-card__logo" :src="logoUrl" alt="logo" />
      <div class="about-card__brand">{{ t('user.about.brandName') }}</div>
    </div>

    <div class="about-intro">
      <p>{{ t('user.about.intro1') }}</p>
      <p>{{ t('user.about.intro2') }}</p>
      <p class="about-intro__hope">{{ t('user.about.intro3') }}</p>
    </div>

    <div class="about-copyright">{{ t('user.about.copyright') }}</div>
  </div>
</template>

<style scoped lang="scss">
.about-page {
  min-height: 100%;
  box-sizing: border-box;
  padding: 48px 28px 40px;
  background: #fbf3e3;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.about-card {
  display: flex;
  flex-direction: column;
  align-items: center;

  &__logo {
    width: 96px;
    height: 96px;
    border-radius: 24px;
    object-fit: contain;
    background: #fff;
  }

  &__brand {
    margin-top: 16px;
    font-size: 22px;
    font-weight: 800;
    color: #2b2b2b;
  }
}

.about-intro {
  margin-top: 32px;
  width: 100%;
  background: #fff;
  border-radius: 20px;
  padding: 20px 18px;
  box-sizing: border-box;

  p {
    margin: 0 0 12px;
    font-size: 14px;
    line-height: 1.8;
    color: #555;

    &:last-child {
      margin-bottom: 0;
    }
  }

  &__hope {
    color: #e8a21c !important;
    font-weight: 600;
  }
}

.about-copyright {
  margin-top: auto;
  padding-top: 40px;
  font-size: 11px;
  color: #c4b48c;
}
</style>
