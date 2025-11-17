// js/ui-logs.js
import {
  ROLE_LABEL_MAP,
  CARD_TYPE_LABEL_MAP,
  EVENT_TYPE_LABEL_MAP,
  FOIL_TYPE_LABEL_MAP,
} from "./config.js";
import { state } from "./state.js";
import { computeRoleScoreDeltas } from "./logic-core.js";

// 供其他模組呼叫：重繪右側事件紀錄
export function renderLogs() {
  const box = document.getElementById("logList");
  if (!box) return;

  box.innerHTML = "";
  box.classList.remove("empty");

  const role = state.currentRole;
  if (!role) {
    box.classList.add("empty");
    box.innerHTML = `<div class="log-empty">請先選擇角色。</div>`;
    return;
  }

  const logs = state.logs.filter((l) => l.targetRole === role);

  if (logs.length === 0) {
    box.classList.add("empty");
    box.innerHTML = `<div class="log-empty">此角色尚無記錄。</div>`;
    return;
  }

  // 計算每一步的分數差（只算這個角色的）
  const deltas = computeRoleScoreDeltas(role);

  // 要顯示時是「最新在最上面」
  const logsToShow = logs.slice().reverse();
  const deltasToShow = deltas.slice().reverse();

  // ===== 表頭 =====
  const header = document.createElement("div");
  header.className = "log-item log-item-header";
  header.innerHTML = `
    <div class="log-col-center">#</div>
    <div class="log-col-center">角色</div>
    <div class="log-col-center">事件</div>
    <div class="log-col-center">種類</div>
    <div class="log-col-center">卡牌狀態</div>
  `;
  box.appendChild(header);

  // ===== 每一列紀錄 =====
  logsToShow.forEach((log, i) => {
    const isTrans = log.eventType === "transform";

    // 角色名稱（用自訂名稱優先）
    const roleName =
      (state.roleNames && state.roleNames[log.targetRole]) ||
      ROLE_LABEL_MAP[log.targetRole] ||
      log.targetRole;

    // 卡片種類顯示：轉化時顯示「原 → 新」，其他只顯示一個
    const typeHtml = isTrans
      ? `
        <span class="tag tag-type-${log.srcCardType}">
          ${CARD_TYPE_LABEL_MAP[log.srcCardType] || log.srcCardType}
        </span>
        <span class="type-arrow">→</span>
        <span class="tag tag-type-${log.cardType}">
          ${CARD_TYPE_LABEL_MAP[log.cardType] || log.cardType}
        </span>
      `
      : `
        <span class="tag tag-type-${log.cardType}">
          ${CARD_TYPE_LABEL_MAP[log.cardType] || log.cardType}
        </span>
      `;

    // 卡牌狀態顯示：轉化時「原狀態 → 新狀態」
    const foilText = isTrans
      ? `${FOIL_TYPE_LABEL_MAP[log.srcFoilType]} → ${
          FOIL_TYPE_LABEL_MAP[log.foilType]
        }`
      : FOIL_TYPE_LABEL_MAP[log.foilType];

    // 行數（由 1 開始，越新的編號越大）
    const rowNumber = logsToShow.length - i;

    // 分數差 tooltip
    const d = deltasToShow[i]?.deltaTotal ?? 0;
    let deltaClass = "delta-zero";
    let deltaText = "0";
    if (d > 0) {
      deltaClass = "delta-positive";
      deltaText = `+${d}`;
    } else if (d < 0) {
      deltaClass = "delta-negative";
      deltaText = `${d}`;
    }

    const row = document.createElement("div");
    row.className = "log-item";

    row.innerHTML = `
      <div class="log-col-center">${rowNumber}</div>
      <div class="log-col-center">${roleName}</div>
      <div class="log-col-center">
        <span class="tag tag-${log.eventType}">
          ${EVENT_TYPE_LABEL_MAP[log.eventType] || log.eventType}
        </span>
      </div>
      <div class="log-col-center">
        ${typeHtml}
      </div>
      <div class="log-col-center">${foilText}</div>
      <div class="log-tooltip">
        <span class="delta ${deltaClass}">${deltaText}</span>
      </div>
    `;

    box.appendChild(row);
  });
}
