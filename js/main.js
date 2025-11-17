/*
js/
  config.js          // 選單、label、角色預設分組
  state.js           // 全域 state + ROLES/CARD_TYPES/FOIL_TYPES + TIER 輸入
  logic-core.js      // 卡牌統計、事件統計、分數、reprocessAll
  ui-logs.js         // 右側事件紀錄
  ui-role.js         // 上半部角色區 + 命名 modal + 卡牌統計總開關
  ui-event-input.js  // 左側事件輸入 + 三顆按鈕
  storage.js         // 存檔 / 載入 / 清除
  init.js            // 組裝所有 UI & 邏輯
  main.js            // 入口，DOMContentLoaded → initApp()
*/

// js/main.js
import { initApp } from "./init.js";

window.addEventListener("DOMContentLoaded", () => {
  initApp();
});
