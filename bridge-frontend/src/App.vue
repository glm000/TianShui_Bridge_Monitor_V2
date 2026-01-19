<!-- src/App.vue -->
<script setup>
import { RouterView } from 'vue-router'
</script>

<template>
  <!-- 这里是所有页面的舞台，LoginView 和 DashboardView 都会显示在这里 -->
  <RouterView />
</template>

<style>
/* 全局样式初始化：去掉浏览器默认的白色边距，设为深色背景 */
body {
  margin: 0;
  padding: 0;
  background-color: #0b0f19; /* 科技感深蓝背景 */
  color: #fff;
  font-family: 'Helvetica Neue', Helvetica, 'PingFang SC', 'Microsoft YaHei', Arial, sans-serif;
  overflow: hidden; /* 防止大屏出现滚动条 */
}

#app {
  width: 100vw;
  height: 100vh;
}
</style>
