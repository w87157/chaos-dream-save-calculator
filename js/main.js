import { TIER_MAX, CARD_COUNT_MAX, COPY_DELETE_MAX } from "./config.js";

const SAVE_KEY = "chaosDreamSaveV1";

// 依 max / unit 產生 0~max 的選項
function buildOptions(select, max, unit, zeroText) {
  select.innerHTML = "";

  const opt0 = document.createElement("option");
  opt0.value = "0";
  opt0.textContent = zeroText || (unit ? `0 ${unit}` : "0");
  select.appendChild(opt0);

  for (let i = 1; i <= max; i++) {
    const opt = document.createElement("option");
    opt.value = String(i);
    opt.textContent = unit ? `${i} ${unit}` : String(i);
    select.appendChild(opt);
  }
}

// 初始化某個角色底下所有 select 的選項
function initCharacterSelects(root) {
  const selects = root.querySelectorAll("select");
  selects.forEach((sel) => {
    const type = sel.dataset.maxType;
    let max;

    if (type === "card") {
      max = CARD_COUNT_MAX;
    } else if (type === "copydel") {
      max = COPY_DELETE_MAX;
    } else {
      max = 10; // 預設
    }

    const unit = sel.dataset.unit || "";
    const zeroText = sel.dataset.zeroText || "";
    buildOptions(sel, max, unit, zeroText);
  });
}

// 若未來要動態修改某個 select 的上限
export function updateSelectMax(select, newMax) {
  const unit = select.dataset.unit || "";
  const zeroText = select.dataset.zeroText || "";
  buildOptions(select, newMax, unit, zeroText);
}

// === 初始化 TIER 選單 ===
const tierSelect = document.getElementById("tier");
buildOptions(tierSelect, TIER_MAX, "", "請選擇");

// 將角色模板插入三個角色容器
const tpl = document.getElementById("character-template").innerHTML;
document.getElementById("char1").innerHTML += tpl;
document.getElementById("char2").innerHTML += tpl;
document.getElementById("char3").innerHTML += tpl;

// 插完 template 再初始化各角色的下拉選單
["char1", "char2", "char3"].forEach((id) => {
  const root = document.getElementById(id);
  initCharacterSelects(root);
});

function convertCountToScore(n) {
  const scoreList = [0, 0, 10, 30, 50, 70]; // 每一階的分數
  let sum = 0;
  for (let i = 1; i <= n; i++) {
    sum += scoreList[i];
  }
  return sum;
}

function getIntFrom(root, selector) {
  const el = root.querySelector(selector);
  if (!el) return 0;
  const v = parseInt(el.value, 10);
  return isNaN(v) ? 0 : v;
}

function calcCharacterScore(root) {
  const godFlash = getIntFrom(root, ".godFlash");
  const neutralCard = getIntFrom(root, ".neutralCard");
  const neutralFlash = getIntFrom(root, ".neutralFlash");
  const deleteCharExtra = getIntFrom(root, ".deleteCharExtra");
  const transformCard = getIntFrom(root, ".transformCard");
  const monsterCard = getIntFrom(root, ".monsterCard");
  const forbiddenCard = getIntFrom(root, ".forbiddenCard");

  const copyCount = getIntFrom(root, ".copyCount");
  const deleteCount = getIntFrom(root, ".deleteCount");

  const copyScore = convertCountToScore(copyCount);
  const deleteScore = convertCountToScore(deleteCount);

  return (
    godFlash * 20 +
    neutralCard * 20 +
    neutralFlash * 10 +
    deleteCharExtra * 20 +
    transformCard * 10 +
    monsterCard * 80 +
    forbiddenCard * 20 +
    copyScore +
    deleteScore
  );
}

function calcTierPoint(tier) {
  if (tier <= 0) return 0;
  return 20 + 10 * tier; // Tier1=30, Tier2=40...
}

function updateCharacterProgress(root, score, tierPt) {
  const label = root.querySelector(".progress-label");
  const fill = root.querySelector(".progress-fill");

  if (label) {
    label.textContent = `角色分數：${score} / ${tierPt} pt`;
  }

  if (fill) {
    if (tierPt <= 0) {
      fill.style.width = "0%";
      return;
    }
    const percent = Math.min((score / tierPt) * 100, 100);
    fill.style.width = percent + "%";
  }
}

// 重置單一角色（所有 select 歸 0）
function resetCharacter(root) {
  const selects = root.querySelectorAll(
    "select.godFlash, select.neutralCard, select.neutralFlash, select.deleteCharExtra, select.transformCard, select.monsterCard, select.forbiddenCard, select.copyCount, select.deleteCount"
  );
  selects.forEach((sel) => {
    sel.value = "0";
  });
}

function updateResult() {
  const tier = parseInt(document.getElementById("tier").value, 10) || 0;
  const tierPt = calcTierPoint(tier);

  const charWrapper = document.getElementById("charWrapper");
  const charSectionTitle = document.getElementById("charSectionTitle");
  const clearAllBtn = document.getElementById("clearAllBtn");

  // 未選擇 TIER → 隱藏角色、標題、重置按鈕，並重置顯示
  if (tierPt <= 0) {
    charWrapper.style.display = "none";
    charSectionTitle.style.display = "none";
    clearAllBtn.style.display = "none";

    ["char1", "char2", "char3"].forEach((id) => {
      const root = document.getElementById(id);
      const label = root.querySelector(".progress-label");
      const fill = root.querySelector(".progress-fill");
      if (label) label.textContent = "角色分數：0 / 0 pt";
      if (fill) fill.style.width = "0%";
    });

    return;
  }

  // 已選擇 TIER → 顯示角色區塊、標題、全部重置按鈕
  charWrapper.style.display = "flex";
  charSectionTitle.style.display = "flex";
  clearAllBtn.style.display = "inline-block";

  const charRoots = [
    document.getElementById("char1"),
    document.getElementById("char2"),
    document.getElementById("char3"),
  ];

  const scores = charRoots.map((root) => calcCharacterScore(root));

  scores.forEach((score, i) =>
    updateCharacterProgress(charRoots[i], score, tierPt)
  );
}

/* =======================
   存檔相關：儲存 / 載入 / 清除
   ======================= */

function showSaveStatus(message) {
  const el = document.getElementById("saveStatus");
  if (!el) return;

  el.textContent = message;
  el.classList.add("show");

  clearTimeout(showSaveStatus._timer);
  showSaveStatus._timer = setTimeout(() => {
    el.classList.remove("show");
  }, 1600);
}

function collectState() {
  const tier = tierSelect.value || "0";
  const charIds = ["char1", "char2", "char3"];

  const chars = charIds.map((id) => {
    const root = document.getElementById(id);
    const data = {};
    root.querySelectorAll("select").forEach((sel) => {
      const key = sel.className; // 每個 select 只有一個 class
      if (key) {
        data[key] = sel.value;
      }
    });
    return data;
  });

  return { tier, chars };
}

function applyState(state) {
  if (!state || typeof state !== "object") return;
  if (state.tier != null) {
    tierSelect.value = String(state.tier);
  }

  const charIds = ["char1", "char2", "char3"];
  charIds.forEach((id, idx) => {
    const root = document.getElementById(id);
    const charState = (state.chars && state.chars[idx]) || {};
    root.querySelectorAll("select").forEach((sel) => {
      const key = sel.className;
      if (key && charState[key] != null) {
        sel.value = String(charState[key]);
      }
    });
  });

  updateResult();
}

function saveCurrentState() {
  try {
    const state = collectState();
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
    showSaveStatus("已儲存目前配置");
  } catch (e) {
    console.error("無法儲存存檔", e);
    showSaveStatus("儲存失敗（瀏覽器不支援？）");
  }
}

function loadSavedState() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) {
      showSaveStatus("尚未有存檔");
      return;
    }
    const state = JSON.parse(raw);
    applyState(state);
    showSaveStatus("已載入存檔");
  } catch (e) {
    console.error("無法載入存檔", e);
    showSaveStatus("載入失敗");
  }
}

function clearSavedState() {
  try {
    localStorage.removeItem(SAVE_KEY);
    showSaveStatus("已清除存檔");
  } catch (e) {
    console.error("無法清除存檔", e);
    showSaveStatus("清除存檔失敗");
  }
}

/* =======================
   事件綁定
   ======================= */

// 綁定所有 select 的 change 事件（含 TIER 和角色）
document.querySelectorAll("select").forEach((sel) => {
  sel.addEventListener("change", updateResult);
});

// 個別角色「重置角色」按鈕
document.querySelectorAll(".char-reset-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    const targetId = btn.getAttribute("data-target");
    const root = document.getElementById(targetId);
    resetCharacter(root);
    updateResult();
  });
});

// 一鍵清除全部角色
document.getElementById("clearAllBtn").addEventListener("click", () => {
  ["char1", "char2", "char3"].forEach((id) => {
    const root = document.getElementById(id);
    resetCharacter(root);
  });
  updateResult();
});

// 存檔相關按鈕
const saveBtn = document.getElementById("saveBtn");
const loadBtn = document.getElementById("loadBtn");
const clearSaveBtn = document.getElementById("clearSaveBtn");

if (saveBtn) {
  saveBtn.addEventListener("click", saveCurrentState);
}
if (loadBtn) {
  loadBtn.addEventListener("click", loadSavedState);
}
if (clearSaveBtn) {
  clearSaveBtn.addEventListener("click", clearSavedState);
}

// 初始化
updateResult();

// 若有先前存檔，自動嘗試載入一次
try {
  const raw = localStorage.getItem(SAVE_KEY);
  if (raw) {
    const state = JSON.parse(raw);
    applyState(state);
    showSaveStatus("已自動載入上次存檔");
  }
} catch (e) {
  // 忽略錯誤，維持預設狀態
}
