// js/state.js
import {
  ROLE_OPTIONS,
  CARD_TYPE_OPTIONS,
  FOIL_TYPE_OPTIONS,
} from "./config.js";

// 統一從 config.js 產生 id 清單，之後不要再手打 "char1" / "char2" / "char3"
export const ROLES = ROLE_OPTIONS.map((o) => o.id);
export const CARD_TYPES = CARD_TYPE_OPTIONS.map((o) => o.id);
export const FOIL_TYPES = FOIL_TYPE_OPTIONS.map((o) => o.id);

// ===== 全域狀態 =====
// 之後所有模組都從這裡 import / 操作同一份 state
export const state = {
  // 事件紀錄
  logs: [],

  // 目前選取中的角色
  currentRole: "char1",

  // 各角色事件統計（init 時會被邏輯重算填滿）
  eventStats: Object.fromEntries(ROLES.map((roleId) => [roleId, null])),

  // 各角色分數（init 或 reprocessAll 時重算）
  scores: Object.fromEntries(
    ROLES.map((roleId) => [roleId, { cardScore: 0, eventScore: 0, total: 0 }])
  ),

  // 角色顯示名稱（預設用 ROLE_OPTIONS 的 label）
  roleNames: Object.fromEntries(ROLE_OPTIONS.map((o) => [o.id, o.label])),
};

// ===== TIER 輸入 =====
// 提供一個可選的 onChange callback，讓外面決定「TIER 改變時要不要 reprocessAll」
export function initTierInput(onChange) {
  const tierInput = document.getElementById("tierInput");
  if (!tierInput) return;

  tierInput.addEventListener("input", () => {
    const val = Number(tierInput.value) || 0;

    if (val < 0) tierInput.value = 0;
    if (val > 15) tierInput.value = 15;

    if (typeof onChange === "function") {
      onChange();
    }
  });
}

// 依目前輸入的 TIER 算出總分上限
export function getTierCap() {
  const input = document.getElementById("tierInput");
  const tier = input ? Number(input.value) || 0 : 0;
  if (!tier) return 0;
  return 30 + 10 * (tier - 1);
}
