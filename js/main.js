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
  logs: [], // 所有角色的事件紀錄
  currentRole: "char1", // 目前選取角色
  // 各角色事件統計：會由 recalcEventStatsAllRoles() 自動重算
  eventStats: {
    char1: null,
    char2: null,
    char3: null,
  },
};

const CARD_TYPES = ["character", "neutral", "monster", "forbidden"];
const FOIL_TYPES = ["normal", "foil", "godfoil", "removed"];

// ===== TIER 選單（目前只當備註用） =====

function initTierSelect() {
  const tierSelect = document.getElementById("tier");
  tierSelect.innerHTML = "";

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
    // 目前只是備註，不影響計算
  });
}

// ===== 角色進度條：顯示「事件數」 =====

function getRoleEventCount(roleKey) {
  return state.logs.filter((log) => log.targetRole === roleKey).length;
}

function updateCharacterProgressAll() {
  const roles = ["char1", "char2", "char3"];
  const counts = roles.map(getRoleEventCount);
  const max = Math.max(1, ...counts); // 避免除以 0

  roles.forEach((role, idx) => {
    updateCharacterProgress(role, counts[idx], max);
  });
}

function updateCharacterProgress(roleKey, count, max) {
  const label = document.getElementById(roleKey + "Label");
  const fill = document.getElementById(roleKey + "Fill");
  if (!label || !fill) return;

  label.textContent = `事件數：${count} 筆`;
  const pct = max ? Math.min((count / max) * 100, 100) : 0;
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

function updateTransformVisibility() {
  const eventType = getActiveValue("eventType");
  const block = document.querySelector(".card-block.transform-block");
  if (!block) return;

  if (eventType === "transform") {
    // 轉化時顯示「原卡片」這塊（上下排）
    block.style.display = "block";
  } else {
    block.style.display = "none";
  }
}

// 根據目前事件類型，限制「目標卡牌狀態」的可選項目
function updateFoilAvailability() {
  const eventType = getActiveValue("eventType");

  const destFoilGroup = document.querySelector(
    '.pill-group[data-group="foilType"]'
  );
  const srcFoilGroup = document.querySelector(
    '.pill-group[data-group="srcFoilType"]'
  );

  // 目標卡片狀態：依事件限制
  if (destFoilGroup) {
    destFoilGroup.querySelectorAll(".pill-btn").forEach((btn) => {
      const val = btn.dataset.value;
      let shouldDisable = false;

      if (eventType === "gain") {
        // 獲得：NN → BY
        // 允許：一般 / 移除； 禁用：普閃 / 神閃
        if (val === "foil" || val === "godfoil") {
          shouldDisable = true;
        }
      } else if (eventType === "flash") {
        // 靈光一閃：AW → AX，只允許變成普閃 / 神閃
        if (val === "normal" || val === "removed") {
          shouldDisable = true;
        }
      } else if (eventType === "transform") {
        // 轉化：AX → BY
        // 目標狀態不允許直接選普閃 / 神閃，只能選 一般 / 移除
        if (val === "foil" || val === "godfoil") {
          shouldDisable = true;
        }
      } else {
        // 刪除 / 複製 或尚未選事件：全部開放
        shouldDisable = false;
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

  // 原卡片狀態：只是描述現有卡，全部都可以選
  if (srcFoilGroup) {
    srcFoilGroup.querySelectorAll(".pill-btn").forEach((btn) => {
      btn.classList.remove("pill-disabled");
      btn.removeAttribute("data-disabled");
    });
  }

  // 控制「原卡片」區塊顯示 / 隱藏
  updateTransformVisibility();
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

      // 切換事件類型時，更新卡牌狀態可選狀態 & 轉化區塊顯示
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

// ===== 卡牌統計（每角色一份） =====

function createBaseStatsForRole() {
  const stats = {};
  CARD_TYPES.forEach((ct) => {
    stats[ct] = { normal: 0, foil: 0, godfoil: 0, removed: 0 };
  });
  // 初始角色卡 4 張（一般）
  stats.character.normal = 4;
  return stats;
}

// 檢查一組 logs 套用後，卡片數量會不會變成負值
function validateLogs(logs) {
  const statsByRole = {
    char1: createBaseStatsForRole(),
    char2: createBaseStatsForRole(),
    char3: createBaseStatsForRole(),
  };

  const applyDelta = (role, cardType, foilType, delta) => {
    const roleStats = statsByRole[role];
    if (!roleStats) return true;
    const typeStat = roleStats[cardType];
    if (!typeStat || !(foilType in typeStat)) return true;

    const current = typeStat[foilType] ?? 0;
    const next = current + delta;

    // 如果會變成負數，直接判定失敗
    if (next < 0) {
      return false;
    }

    typeStat[foilType] = next;
    return true;
  };

  for (const log of logs) {
    const {
      targetRole,
      cardType, // 目標卡片種類（B）
      foilType, // 目標卡片狀態（Y）
      srcCardType, // 原卡片種類（A）-- 只在 transform 有
      srcFoilType, // 原卡片狀態（X）
      eventType,
    } = log;

    if (!targetRole || !cardType || !foilType || !eventType) {
      continue;
    }

    let ok = true;

    switch (eventType) {
      // 獲得：NN → BY
      case "gain": {
        ok = applyDelta(targetRole, cardType, foilType, +1);
        break;
      }

      // 靈光一閃：AW → AX（同種類，狀態變化）
      case "flash": {
        ok =
          applyDelta(targetRole, cardType, "normal", -1) &&
          applyDelta(targetRole, cardType, foilType, +1);
        break;
      }

      // 轉化：AX → BY
      case "transform": {
        const fromType = srcCardType || "character"; // 舊存檔 fallback
        const fromFoil = srcFoilType || foilType; // 舊存檔 fallback
        ok =
          applyDelta(targetRole, fromType, fromFoil, -1) &&
          applyDelta(targetRole, cardType, foilType, +1);
        break;
      }

      // 刪除：AW → NN
      case "delete": {
        ok = applyDelta(targetRole, cardType, foilType, -1);
        break;
      }

      // 複製：AW → AW
      case "copy": {
        ok = applyDelta(targetRole, cardType, foilType, +1);
        break;
      }

      default:
        ok = true;
        break;
    }

    if (!ok) {
      return false;
    }
  }

  return true;
}

// 真正用來重算畫面統計（正常情況不會有負值，這裡只是保險 clamp 一次）
function recalcCardStatsAllRoles() {
  const statsByRole = {
    char1: createBaseStatsForRole(),
    char2: createBaseStatsForRole(),
    char3: createBaseStatsForRole(),
  };

  const clamp = (n) => (n < 0 ? 0 : n);

  const applyDelta = (role, cardType, foilType, delta) => {
    const roleStats = statsByRole[role];
    if (!roleStats) return;
    const typeStat = roleStats[cardType];
    if (!typeStat || !(foilType in typeStat)) return;

    const current = typeStat[foilType] ?? 0;
    const next = current + delta;
    typeStat[foilType] = clamp(next);
  };

  state.logs.forEach((log) => {
    const {
      targetRole,
      cardType,
      foilType,
      srcCardType,
      srcFoilType,
      eventType,
    } = log;

    if (!targetRole || !cardType || !foilType || !eventType) return;

    switch (eventType) {
      case "gain": {
        applyDelta(targetRole, cardType, foilType, +1);
        break;
      }

      case "flash": {
        applyDelta(targetRole, cardType, "normal", -1);
        applyDelta(targetRole, cardType, foilType, +1);
        break;
      }

      case "transform": {
        const fromType = srcCardType || "character";
        const fromFoil = srcFoilType || foilType;
        applyDelta(targetRole, fromType, fromFoil, -1);
        applyDelta(targetRole, cardType, foilType, +1);
        break;
      }

      case "delete": {
        applyDelta(targetRole, cardType, foilType, -1);
        break;
      }

      case "copy": {
        applyDelta(targetRole, cardType, foilType, +1);
        break;
      }

      default:
        break;
    }
  });

  updateCardStatsUI(statsByRole);
}

function updateCardStatsUI(statsByRole) {
  const setText = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  };

  ["char1", "char2", "char3"].forEach((role) => {
    CARD_TYPES.forEach((cardType) => {
      FOIL_TYPES.forEach((foilType) => {
        const val = statsByRole[role][cardType][foilType] ?? 0;
        setText(`${role}_cardCount_${cardType}_${foilType}`, val);
      });
    });
  });
}

// ===== 事件統計（各事件次數 / 刪除角色卡次數） =====

function recalcEventStatsAllRoles() {
  const roles = ["char1", "char2", "char3"];

  const base = () => ({
    gain: 0,
    flash: 0,
    transform: 0,
    delete: 0,
    copy: 0,
    deleteCharacter: 0, // 另外統計「刪除角色卡」次數
  });

  const stats = {
    char1: base(),
    char2: base(),
    char3: base(),
  };

  state.logs.forEach((log) => {
    const role = log.targetRole;
    const s = stats[role];
    if (!s) return;

    if (s.hasOwnProperty(log.eventType)) {
      s[log.eventType]++;
    }
    if (log.eventType === "delete" && log.cardType === "character") {
      s.deleteCharacter++;
    }
  });

  state.eventStats = stats;
}

// ===== 事件操作：新增 / 還原 / 清空 =====

function setupEventActions() {
  document.getElementById("confirmBtn").addEventListener("click", addEvent);
  document.getElementById("undoBtn").addEventListener("click", undoEvent);
  document.getElementById("clearBtn").addEventListener("click", clearEvents);
}

function addEvent() {
  if (!state.currentRole) {
    alert("請先點擊上方的角色，再輸入事件");
    return;
  }

  const eventType = getActiveValue("eventType");
  if (!eventType) {
    alert("請先選擇事件類型");
    return;
  }

  // 目標卡片（所有事件都需要）
  const dstCardType = getActiveValue("cardType");
  const dstFoilType = getActiveValue("foilType");

  if (!dstCardType || !dstFoilType) {
    alert("請完成：卡片種類 / 卡牌狀態 的選擇");
    return;
  }

  const log = {
    id: Date.now(),
    targetRole: state.currentRole,
    eventType,
    cardType: dstCardType,
    foilType: dstFoilType,
  };

  // 若是轉化事件，再要求「原卡片種類 / 狀態」
  if (eventType === "transform") {
    const srcCardType = getActiveValue("srcCardType");
    const srcFoilType = getActiveValue("srcFoilType");

    if (!srcCardType || !srcFoilType) {
      alert("轉化事件需要選擇：原卡片種類 / 原卡牌狀態");
      return;
    }

    log.srcCardType = srcCardType;
    log.srcFoilType = srcFoilType;
  }

  // 先模擬：如果加入這筆 log 後會讓某一種卡變成負數，就擋下來
  const hypotheticalLogs = [...state.logs, log];
  const ok = validateLogs(hypotheticalLogs);

  if (!ok) {
    alert(
      "此操作會讓某種卡片的數量變成負數，請檢查事件類型或原卡片 / 目標卡片的選擇是否正確。"
    );
    return;
  }

  // ✅ 驗證通過才正式寫入
  state.logs.push(log);
  updateAfterEventChange();
}

function undoEvent() {
  if (state.logs.length === 0) return;
  state.logs.pop();
  updateAfterEventChange();
}

function clearEvents() {
  if (!confirm("確定要清空所有事件紀錄？")) return;
  state.logs = [];
  updateAfterEventChange();
}

function updateAfterEventChange() {
  updateCharacterProgressAll();
  recalcCardStatsAllRoles();
  recalcEventStatsAllRoles(); // 每次變動都順便重算事件統計
  renderLogs();
}

// ===== 右側紀錄列表（只顯示目前角色，轉化顯示 AX→BY） =====

function renderLogs() {
  const list = document.getElementById("logList");
  list.innerHTML = "";

  list.classList.remove("empty");

  const activeRole = state.currentRole;

  if (!activeRole) {
    list.classList.add("empty");
    const empty = document.createElement("div");
    empty.className = "log-empty";
    empty.textContent = "請先在上方選擇角色。";
    list.appendChild(empty);
    return;
  }

  const logsForRole = state.logs.filter((log) => log.targetRole === activeRole);

  if (logsForRole.length === 0) {
    list.classList.add("empty");
    const empty = document.createElement("div");
    empty.className = "log-empty";
    empty.textContent = "此角色尚無記錄。";
    list.appendChild(empty);
    return;
  }

  list.classList.remove("empty");

  // 表頭：# / 角色 / 事件 / 種類 / 卡牌狀態
  const header = document.createElement("div");
  header.className = "log-item log-item-header";
  header.innerHTML = `
    <div class="log-col-center">#</div>
    <div class="log-col-center">角色</div>
    <div class="log-col-center">事件</div>
    <div class="log-col-center">種類</div>
    <div class="log-col-center">卡牌狀態</div>
  `;
  list.appendChild(header);

  // 每一筆記錄
  logsForRole.forEach((log, idx) => {
    // 轉化事件：種類、狀態顯示「A → B」
    const isTransform = log.eventType === "transform";

    const typeText = isTransform && log.srcCardType
      ? `${CARD_TYPE_LABEL_MAP[log.srcCardType]} → ${
          CARD_TYPE_LABEL_MAP[log.cardType]
        }`
      : CARD_TYPE_LABEL_MAP[log.cardType];

    const foilText = isTransform && log.srcFoilType
      ? `${FOIL_TYPE_LABEL_MAP[log.srcFoilType]} → ${
          FOIL_TYPE_LABEL_MAP[log.foilType]
        }`
      : FOIL_TYPE_LABEL_MAP[log.foilType];

    const row = document.createElement("div");
    row.className = "log-item";
    row.innerHTML = `
      <div class="log-col-center">${idx + 1}</div>
      <div class="log-col-center">${ROLE_LABEL_MAP[log.targetRole]}</div>
      <div class="log-col-center">${EVENT_TYPE_LABEL_MAP[log.eventType]}</div>
      <div class="log-col-center">${typeText}</div>
      <div class="log-col-center">${foilText}</div>
    `;

    list.appendChild(row);
  });
}

// ===== 存檔 / 載入（只存事件 / 角色 / tier）=====

function setupSaveLoad() {
  const saveBtn = document.getElementById("saveBtn");
  const loadBtn = document.getElementById("loadBtn");
  const clearBtn = document.getElementById("clearSaveBtn");
  const saveStatus = document.getElementById("saveStatus");

  saveBtn.addEventListener("click", () => {
    const data = {
      logs: state.logs,
      currentRole: state.currentRole,
      tier: document.getElementById("tier").value,
    };
    localStorage.setItem("chaosSave_v3", JSON.stringify(data));
    saveStatus.textContent = "已儲存";
    setTimeout(() => (saveStatus.textContent = ""), 1500);
  });

  loadBtn.addEventListener("click", () => {
    const raw =
      localStorage.getItem("chaosSave_v3") ||
      localStorage.getItem("chaosSave_v2");
    if (!raw) return;
    const data = JSON.parse(raw);

    document.getElementById("tier").value = data.tier || 0;

    state.logs = data.logs || data.state?.logs || [];
    state.currentRole = data.currentRole || data.state?.currentRole || "char1";

    updateCharacterProgressAll();
    updateRoleSelectionHighlight();
    recalcCardStatsAllRoles();
    recalcEventStatsAllRoles();
    renderLogs();

    saveStatus.textContent = "已載入";
    setTimeout(() => (saveStatus.textContent = ""), 1500);
  });

  clearBtn.addEventListener("click", () => {
    localStorage.removeItem("chaosSave_v3");
    localStorage.removeItem("chaosSave_v2");
    saveStatus.textContent = "已清除";
    setTimeout(() => (saveStatus.textContent = ""), 1500);
  });
}

// ===== 統一收合 / 展開卡牌統計 =====

function setupCardStatsToggleAll() {
  const btn = document.getElementById("cardStatsToggleAll");
  if (!btn) return;

  let collapsed = true; // 預設收起
  btn.textContent = "▶ 卡牌數量統計";

  const applyToSections = () => {
    const sections = document.querySelectorAll(".card-stats-section");
    sections.forEach((sec) => {
      if (collapsed) sec.classList.add("collapsed");
      else sec.classList.remove("collapsed");
    });
  };

  applyToSections();

  btn.addEventListener("click", () => {
    collapsed = !collapsed;
    applyToSections();
    btn.textContent = collapsed ? "▶ 卡牌數量統計" : "▼ 卡牌數量統計";
  });
}

// ===== 初始化 =====

function init() {
  initTierSelect();

  // 左側事件選項
  buildPillGroup("eventType", EVENT_TYPE_OPTIONS);
  // 原卡片（轉化用）
  buildPillGroup("srcCardType", CARD_TYPE_OPTIONS);
  buildPillGroup("srcFoilType", FOIL_TYPE_OPTIONS);
  // 目標卡片
  buildPillGroup("cardType", CARD_TYPE_OPTIONS);
  buildPillGroup("foilType", FOIL_TYPE_OPTIONS);

  setupPillGroups();
  setupEventActions();
  setupSaveLoad();

  setupRoleSelection();
  setupCardStatsToggleAll();

  updateCharacterProgressAll();
  recalcCardStatsAllRoles();
  recalcEventStatsAllRoles();
  renderLogs();
}

init();
