// js/ui-event-input.js
import {
  CARD_TYPE_OPTIONS,
  EVENT_TYPE_OPTIONS,
  FOIL_TYPE_OPTIONS,
} from "./config.js";
import { state } from "./state.js";
import {
  validateLogs,
  recalcCardStatsAllRoles,
  reprocessAll,
} from "./logic-core.js";
import { renderLogs } from "./ui-logs.js";

// =======================================
// 對外入口：初始化事件輸入 UI
// =======================================
export function setupEventInputUI() {
  // 建立所有 pill 群組
  buildPillGroup("eventType", EVENT_TYPE_OPTIONS);
  buildPillGroup("cardType", CARD_TYPE_OPTIONS);
  buildPillGroup("foilType", FOIL_TYPE_OPTIONS);
  buildPillGroup("srcCardType", CARD_TYPE_OPTIONS);
  buildPillGroup("srcFoilType", FOIL_TYPE_OPTIONS);

  // 綁定 pill 點擊、按鈕事件
  setupPillGroups();
  setupEventActions();

  // 初始一次 foil 可選狀態 & transform 區塊 visibility
  updateFoilAvailability();
}

// =======================================
// pill 群組建立與操作
// =======================================
function buildPillGroup(groupName, options) {
  const group = document.querySelector(
    `.pill-group[data-group="${groupName}"]`
  );
  if (!group) return;

  group.innerHTML = "";
  options.forEach((opt) => {
    const btn = document.createElement("button");
    btn.className = "pill-btn";
    btn.dataset.value = opt.id;
    btn.textContent = opt.label;
    group.appendChild(btn);
  });
}

function setupPillGroups() {
  document.querySelectorAll(".pill-group").forEach((group) => {
    group.addEventListener("click", (e) => {
      const btn = e.target.closest(".pill-btn");
      if (!btn || btn.dataset.disabled === "true") return;

      group
        .querySelectorAll(".pill-btn")
        .forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");

      if (group.dataset.group === "eventType") {
        updateFoilAvailability();
      }
    });
  });

  updateFoilAvailability();
}

// 取得某個 group 目前 active 的 value
function getActiveValue(groupName) {
  const btn = document.querySelector(
    `.pill-group[data-group="${groupName}"] .pill-btn.active`
  );
  return btn ? btn.dataset.value : "";
}

// =======================================
// 事件類型 → foil 可選狀態 & transform 區塊顯示
// =======================================
function updateTransformVisibility() {
  const eventType = getActiveValue("eventType");
  const block = document.querySelector(".transform-block");
  if (!block) return;
  block.style.display = eventType === "transform" ? "block" : "none";
}

function updateFoilAvailability() {
  const eventType = getActiveValue("eventType");
  const destFoils = document.querySelectorAll(
    '.pill-group[data-group="foilType"] .pill-btn'
  );

  destFoils.forEach((btn) => {
    const val = btn.dataset.value;
    let disable = false;

    if (eventType === "gain") {
      // 獲得：只能一般 / 移除，不可直接出現閃
      if (val === "foil" || val === "godfoil") disable = true;
    } else if (eventType === "flash") {
      // 靈閃：只會普通 → 閃，不能選普通 / 移除
      if (val === "normal" || val === "removed") disable = true;
    } else if (eventType === "transform") {
      // 轉化：結果只能一般 / 移除
      if (val !== "normal" && val !== "removed") disable = true;
    }

    if (disable) {
      btn.classList.add("pill-disabled");
      btn.dataset.disabled = "true";
      btn.classList.remove("active");
    } else {
      btn.classList.remove("pill-disabled");
      btn.removeAttribute("data-disabled");
    }
  });

  updateTransformVisibility();
}

// =======================================
// 事件操作（三顆按鈕）
// =======================================
function setupEventActions() {
  const confirmBtn = document.getElementById("confirmBtn");
  const undoBtn = document.getElementById("undoBtn");
  const clearBtn = document.getElementById("clearBtn");

  if (confirmBtn) confirmBtn.addEventListener("click", addEvent);
  if (undoBtn) undoBtn.addEventListener("click", undoEvent);
  if (clearBtn) clearBtn.addEventListener("click", clearEvents);
}

// 新增一筆事件
function addEvent() {
  if (!state.currentRole) {
    alert("請先選擇角色");
    return;
  }

  const eventType = getActiveValue("eventType");
  if (!eventType) {
    alert("請選擇事件類型");
    return;
  }

  const dstType = getActiveValue("cardType");
  const dstFoil = getActiveValue("foilType");
  if (!dstType || !dstFoil) {
    alert("請選擇卡片種類 / 狀態");
    return;
  }

  // 複製時先確認是否有卡可以複製
  if (eventType === "copy") {
    const stats = recalcCardStatsAllRoles();
    const count = stats[state.currentRole][dstType][dstFoil];
    if (count <= 0) {
      alert("無法複製：目前選擇的卡牌數量為 0。");
      return;
    }
  }

  const log = {
    id: Date.now(),
    targetRole: state.currentRole,
    eventType,
    cardType: dstType,
    foilType: dstFoil,
  };

  if (eventType === "transform") {
    const srcType = getActiveValue("srcCardType");
    const srcFoil = getActiveValue("srcFoilType");
    if (!srcType || !srcFoil) {
      alert("轉化需要：原卡種類 / 原卡狀態");
      return;
    }
    log.srcCardType = srcType;
    log.srcFoilType = srcFoil;
  }

  const newLogs = [...state.logs, log];
  if (!validateLogs(newLogs)) {
    alert("此操作會使某種卡牌數量變成負數，請確認選項。");
    return;
  }

  state.logs.push(log);
  reprocessAll();
  renderLogs();
}

// 還原最後一筆事件
function undoEvent() {
  if (state.logs.length === 0) return;
  state.logs.pop();
  reprocessAll();
  renderLogs();
}

// 清空所有事件
function clearEvents() {
  if (!confirm("確定要清空所有事件?")) return;

  state.logs = [];
  reprocessAll();
  renderLogs();
}
