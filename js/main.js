import {
  ROLE_OPTIONS,
  CARD_TYPE_OPTIONS,
  EVENT_TYPE_OPTIONS,
  FOIL_TYPE_OPTIONS,
  ROLE_LABEL_MAP,
  CARD_TYPE_LABEL_MAP,
  EVENT_TYPE_LABEL_MAP,
  FOIL_TYPE_LABEL_MAP,
} from "./config.js";

// ===== 全域狀態 =====
const state = {
  limit: 0, // TIER 上限
  total: 0, // 三角色總分
  logs: [],
  roleScore: {
    char1: 0,
    char2: 0,
    char3: 0,
  },
  currentRole: "char1", // 目前選取角色（預設角色 1）
};

// ===== TIER 選單與上限計算 =====

function initTierSelect() {
  const tierSelect = document.getElementById("tier");
  tierSelect.innerHTML = "";

  // 0 = 請選擇，1~15 有效 Tier
  const opt0 = document.createElement("option");
  opt0.value = 0;
  opt0.textContent = "請選擇";
  tierSelect.appendChild(opt0);

  for (let i = 1; i <= 15; i++) {
    const opt = document.createElement("option");
    opt.value = i;
    opt.textContent = `T${i}`;
    tierSelect.appendChild(opt);
  }

  tierSelect.addEventListener("change", () => {
    updateTierLimit();
    updateCharacterProgressAll();
    updateSummary();
  });
}

// ⭐ 1 Tier = 30pt，每提升 1 Tier +10pt
function updateTierLimit() {
  const tier = parseInt(document.getElementById("tier").value, 10);

  if (!tier || tier < 1) {
    state.limit = 0;
  } else {
    state.limit = 30 + (tier - 1) * 10;
  }
}

// ===== 角色進度條 =====

function updateCharacterProgressAll() {
  ["char1", "char2", "char3"].forEach((role) => {
    updateCharacterProgress(role);
  });
}

function updateCharacterProgress(roleKey) {
  const score = state.roleScore[roleKey];
  const limit = state.limit;
  const label = document.getElementById(roleKey + "Label");
  const fill = document.getElementById(roleKey + "Fill");

  if (!label || !fill) return;

  const pct = limit ? Math.min((score / limit) * 100, 100) : 0;
  label.textContent = `角色分數：${score} / ${limit} pt`;
  fill.style.width = pct + "%";
}

// ===== 右側角色點選（決定 currentRole） =====

function setupRoleSelection() {
  const items = document.querySelectorAll(".role-progress-item");

  items.forEach((item) => {
    const roleId = item.dataset.role;
    if (!roleId) return;

    item.addEventListener("click", () => {
      state.currentRole = roleId;
      updateRoleSelectionHighlight();
      renderLogs(); // 切角色時重刷紀錄
    });
  });

  updateRoleSelectionHighlight();
}

function updateRoleSelectionHighlight() {
  const items = document.querySelectorAll(".role-progress-item");
  items.forEach((item) => {
    const roleId = item.dataset.role;
    if (roleId === state.currentRole) {
      item.classList.add("role-selected");
    } else {
      item.classList.remove("role-selected");
    }
  });
}

// ===== pill 群組：動態建立 + 點選 =====

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

// 根據目前事件類型，限制可選的閃卡按鈕
function updateFoilAvailability() {
  const eventType = getActiveValue("eventType");
  const foilGroup = document.querySelector(
    '.pill-group[data-group="foilType"]'
  );
  if (!foilGroup) return;

  foilGroup.querySelectorAll(".pill-btn").forEach((btn) => {
    const val = btn.dataset.value;
    let shouldDisable = false;

    // 事件 = 獲得：禁止 普閃/神閃，只能選 一般
    if (eventType === "gain") {
      if (val === "foil" || val === "godfoil") {
        shouldDisable = true;
      }
    }

    // 事件 = 靈光一閃：禁止 一般，只能選 普閃/神閃
    if (eventType === "flash") {
      if (val === "normal") {
        shouldDisable = true;
      }
    }

    if (shouldDisable) {
      btn.classList.add("pill-disabled");
      btn.dataset.disabled = "true";
      btn.classList.remove("active");
    } else {
      btn.classList.remove("pill-disabled");
      btn.removeAttribute("data-disabled");
    }
  });
}

function setupPillGroups() {
  document.querySelectorAll(".pill-group").forEach((group) => {
    group.addEventListener("click", (e) => {
      const btn = e.target.closest(".pill-btn");
      if (!btn) return;

      // 被禁用的按鈕不能點
      if (btn.dataset.disabled === "true") return;

      group
        .querySelectorAll(".pill-btn")
        .forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");

      // 切換事件類型時，更新閃卡可選狀態
      if (group.dataset.group === "eventType") {
        updateFoilAvailability();
      }
    });
  });

  // 初始化時也跑一次
  updateFoilAvailability();
}

function getActiveValue(groupName) {
  const group = document.querySelector(
    `.pill-group[data-group="${groupName}"]`
  );
  if (!group) return "";
  const active = group.querySelector(".pill-btn.active");
  return active ? active.dataset.value : "";
}

// ===== 計分輔助函式 =====

// 各卡片「獲得」的基本分（不含閃卡）
function getBaseGainByCardType(cardType) {
  switch (cardType) {
    case "neutral":
      return 20;
    case "monster":
      return 80;
    case "forbidden":
      return 20;
    case "character":
    default:
      return 0;
  }
}

// 閃卡加成（基本版：普閃 10，神閃 20）
function getFoilBonus(foilType) {
  if (foilType === "foil") return 10;
  if (foilType === "godfoil") return 20;
  return 0;
}

// 刪除 / 複製用的階梯分數
// n = 第幾次（同一角色）
function getStepScore(n) {
  if (n <= 1) return 0;
  if (n === 2) return 10;
  if (n === 3) return 30;
  if (n === 4) return 50;
  if (n === 5) return 70;
  // 第 6 次起，每次 +20
  return 70 + (n - 5) * 20;
}

// ===== 事件分數計算 =====

function calcEventScore(sel) {
  const { targetRole, cardType, eventType, foilType } = sel;

  // 方便取得：該角色目前已有多少次某事件
  const countForEvent = (type) =>
    state.logs.filter(
      (log) => log.targetRole === targetRole && log.eventType === type
    ).length;

  let score = 0;

  switch (eventType) {
    // --- 獲得 ---
    case "gain": {
      // 目前 UI 限制：gain 只能選 一般，所以忽略閃卡
      score = getBaseGainByCardType(cardType);
      break;
    }

    // --- 轉化 ---
    case "transform": {
      // 目前全部一律 10pt
      score = 10;
      break;
    }

    // --- 靈光一閃 ---
    case "flash": {
      const foilBonus = getFoilBonus(foilType); // 普閃 10 / 神閃 20

      // 特例：角色卡 + 普閃 → 0pt
      if (cardType === "character" && foilType === "foil") {
        score = 0;
      } else {
        score = foilBonus;
      }
      break;
    }

    // --- 刪除 ---
    case "delete": {
      const nth = countForEvent("delete") + 1;
      let base = getStepScore(nth); // 0,10,30,50,70,90...

      // 額外 +20：角色卡 or 普閃 or 神閃（第一次也會加）
      const isCharacterCard = cardType === "character";
      const isFlashCard = foilType === "foil" || foilType === "godfoil";
      const bonus = isCharacterCard || isFlashCard ? 20 : 0;

      // 額外扣分
      let penalty = 0;
      if (cardType === "neutral") penalty = -20;
      if (cardType === "forbidden") penalty = -20;
      if (cardType === "monster") penalty = -80;

      score = base + bonus + penalty;
      break;
    }

    // --- 複製 ---
    case "copy": {
      const nth = countForEvent("copy") + 1;
      let base = getStepScore(nth); // 0,10,30,50,70,90...

      // 卡片種類額外加分
      let typeBonus = 0;
      switch (cardType) {
        case "neutral":
          typeBonus = 20;
          break;
        case "forbidden":
          typeBonus = 20;
          break;
        case "monster":
          typeBonus = 80;
          break;
        case "character":
          typeBonus = 0;
          break;
      }

      // 閃卡加分
      let foilBonus = 0;
      if (foilType === "foil") {
        // 角色卡 + 普閃 = 0，其餘 +10
        foilBonus = cardType === "character" ? 0 : 10;
      } else if (foilType === "godfoil") {
        foilBonus = 20;
      }

      score = base + typeBonus + foilBonus;
      break;
    }

    default:
      score = 0;
  }

  return score;
}

// ===== 事件操作：新增 / 還原 / 清空 =====

function setupEventActions() {
  document.getElementById("confirmBtn").addEventListener("click", addEvent);
  document.getElementById("undoBtn").addEventListener("click", undoEvent);
  document.getElementById("clearBtn").addEventListener("click", clearEvents);
}

function addEvent() {
  if (!state.currentRole) {
    alert("請先點擊右側的角色，再輸入事件");
    return;
  }

  const sel = {
    targetRole: state.currentRole,
    cardType: getActiveValue("cardType"),
    eventType: getActiveValue("eventType"),
    foilType: getActiveValue("foilType"),
  };

  if (!sel.eventType || !sel.cardType || !sel.foilType) {
    alert("請完成三項選擇：事件 / 卡片種類 / 閃卡狀態");
    return;
  }

  const score = calcEventScore(sel);

  const log = {
    id: Date.now(),
    ...sel,
    score,
  };

  state.logs.push(log);
  state.roleScore[sel.targetRole] += score;

  updateAfterEventChange();
}

function undoEvent() {
  if (state.logs.length === 0) return;
  const last = state.logs.pop();
  state.roleScore[last.targetRole] -= last.score;
  updateAfterEventChange();
}

function clearEvents() {
  if (!confirm("確定要清空所有事件紀錄？")) return;
  state.logs = [];
  state.roleScore = { char1: 0, char2: 0, char3: 0 };
  updateAfterEventChange();
}

function updateAfterEventChange() {
  updateCharacterProgressAll();
  renderLogs();
  updateSummary();
}

// ===== 右側紀錄列表（只顯示目前角色） =====

function renderLogs() {
  const list = document.getElementById("logList");
  list.innerHTML = "";

  const activeRole = state.currentRole;
  if (!activeRole) {
    const empty = document.createElement("div");
    empty.className = "log-empty";
    empty.textContent = "請先在右上選擇角色。";
    list.appendChild(empty);
    return;
  }

  const logsForRole = state.logs.filter((log) => log.targetRole === activeRole);

  if (logsForRole.length === 0) {
    const empty = document.createElement("div");
    empty.className = "log-empty";
    empty.textContent = "此角色尚無記錄。";
    list.appendChild(empty);
    return;
  }

  const header = document.createElement("div");
  header.className = "log-item log-item-header";
  header.innerHTML = `
    <div class="log-col-center">角色</div>
    <div class="log-col-center">事件</div>
    <div class="log-col-center">種類</div>
    <div class="log-col-center">閃卡</div>
    <div class="log-score">分數</div>
  `;
  list.appendChild(header);

  logsForRole.forEach((log) => {
    const row = document.createElement("div");
    row.className = "log-item";
    row.innerHTML = `
      <div class="log-col-center">${ROLE_LABEL_MAP[log.targetRole]}</div>
      <div class="log-col-center">${EVENT_TYPE_LABEL_MAP[log.eventType]}</div>
      <div class="log-col-center">${CARD_TYPE_LABEL_MAP[log.cardType]}</div>
      <div class="log-col-center">${FOIL_TYPE_LABEL_MAP[log.foilType]}</div>
      <div class="log-score">${log.score} pt</div>
    `;
    list.appendChild(row);
  });
}

// ===== Summary =====

function updateSummary() {
  state.total =
    state.roleScore.char1 + state.roleScore.char2 + state.roleScore.char3;

  document.getElementById("limitPt").textContent = state.limit;
  document.getElementById("totalPt").textContent = state.total;
  const remain = state.limit - state.total;
  document.getElementById("remainPt").textContent = remain >= 0 ? remain : 0;
}

// ===== 存檔 / 載入 =====

function setupSaveLoad() {
  const saveBtn = document.getElementById("saveBtn");
  const loadBtn = document.getElementById("loadBtn");
  const clearBtn = document.getElementById("clearSaveBtn");
  const saveStatus = document.getElementById("saveStatus");

  saveBtn.addEventListener("click", () => {
    const data = {
      state,
      tier: document.getElementById("tier").value,
    };
    localStorage.setItem("chaosSave_v2", JSON.stringify(data));
    saveStatus.textContent = "已儲存";
    setTimeout(() => (saveStatus.textContent = ""), 1500);
  });

  loadBtn.addEventListener("click", () => {
    const raw = localStorage.getItem("chaosSave_v2");
    if (!raw) return;
    const data = JSON.parse(raw);

    document.getElementById("tier").value = data.tier || 0;
    updateTierLimit();

    state.limit = data.state.limit ?? 0;
    state.total = data.state.total ?? 0;
    state.logs = data.state.logs || [];
    state.roleScore = data.state.roleScore || { char1: 0, char2: 0, char3: 0 };
    state.currentRole = data.state.currentRole || "char1";

    updateCharacterProgressAll();
    updateRoleSelectionHighlight();
    renderLogs();
    updateSummary();

    saveStatus.textContent = "已載入";
    setTimeout(() => (saveStatus.textContent = ""), 1500);
  });

  clearBtn.addEventListener("click", () => {
    localStorage.removeItem("chaosSave_v2");
    saveStatus.textContent = "已清除";
    setTimeout(() => (saveStatus.textContent = ""), 1500);
  });
}

// ===== 初始化 =====

function init() {
  initTierSelect();
  updateTierLimit();

  // 左側事件選項
  buildPillGroup("eventType", EVENT_TYPE_OPTIONS);
  buildPillGroup("cardType", CARD_TYPE_OPTIONS);
  buildPillGroup("foilType", FOIL_TYPE_OPTIONS);

  setupPillGroups();
  setupEventActions();
  setupSaveLoad();

  setupRoleSelection(); // 右側角色點選

  updateCharacterProgressAll();
  renderLogs();
  updateSummary();
}

init();
