// js/init.js
import { initTierInput } from "./state.js";
import { reprocessAll } from "./logic-core.js";
import { setupRoleUI } from "./ui-role.js";
import { setupEventInputUI } from "./ui-event-input.js";
import { setupSaveLoad } from "./storage.js";
import { renderLogs } from "./ui-logs.js";

export function initApp() {
  // 1) 角色區（上半部）– 點角色、改名字、立繪、卡牌統計開關
  setupRoleUI();

  // 2) 左側事件輸入區 – pill、事件按鈕
  setupEventInputUI();

  // 3) 右側浮動存檔工具列 – 儲存 / 載入 / 清除
  setupSaveLoad();

  // 4) TIER 輸入 – 每次改動就重新計算分數與進度條＋重繪 log
  initTierInput(() => {
    reprocessAll();
    renderLogs();
  });

  // 5) 首次進入頁面：先算一遍 base 狀態 + 畫出空的 log（或載入後的狀態）
  reprocessAll();
  renderLogs();
}
