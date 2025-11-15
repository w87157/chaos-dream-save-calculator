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
  logs: [],
  currentRole: "char1",
  eventStats: {
    char1: null,
    char2: null,
    char3: null,
  },
  scores: {
    char1: { cardScore: 0, eventScore: 0, total: 0 },
    char2: { cardScore: 0, eventScore: 0, total: 0 },
    char3: { cardScore: 0, eventScore: 0, total: 0 },
  },
};

const CARD_TYPES = ["character", "neutral", "monster", "forbidden"];
const FOIL_TYPES = ["normal", "foil", "godfoil", "removed"];

// ===== TIER「輸入框」初始化 =====
function initTierInput() {
  const tierInput = document.getElementById("tierInput");

  tierInput.addEventListener("input", () => {
    const val = Number(tierInput.value) || 0;
    if (val < 0) tierInput.value = 0;
    if (val > 15) tierInput.value = 15;
    reprocessAll();
  });
}

function getTierCap() {
  const input = document.getElementById("tierInput");
  const tier = input ? Number(input.value) || 0 : 0;
  if (!tier) return 0;
  return 30 + 10 * (tier - 1);
}

// ===== 角色進度條 =====
function updateCharacterProgressAll() {
  const roles = ["char1", "char2", "char3"];
  const totalCap = getTierCap();

  if (totalCap > 0) {
    roles.forEach((role) => {
      const score = state.scores[role]?.total ?? 0;
      const pct = Math.min((score / totalCap) * 100, 100);
      updateCharacterProgress(role, pct, score > totalCap);
    });
  } else {
    const totals = roles.map((r) => state.scores[r]?.total ?? 0);
    const max = Math.max(1, ...totals);
    roles.forEach((role, i) => {
      updateCharacterProgress(role, (totals[i] / max) * 100, false);
    });
  }
}

function updateCharacterProgress(role, pct, isOverCap) {
  const fill = document.getElementById(role + "Fill");
  if (!fill) return;

  fill.style.width = pct + "%";

  if (isOverCap) fill.classList.add("progress-over");
  else fill.classList.remove("progress-over");
}

// ===== 角色選取 =====
function setupRoleSelection() {
  document.querySelectorAll(".role-progress-item").forEach((item) => {
    item.addEventListener("click", () => {
      state.currentRole = item.dataset.role;
      updateRoleSelectionHighlight();
      renderLogs();
    });
  });

  updateRoleSelectionHighlight();
}

function updateRoleSelectionHighlight() {
  document.querySelectorAll(".role-progress-item").forEach((item) => {
    if (item.dataset.role === state.currentRole)
      item.classList.add("role-selected");
    else item.classList.remove("role-selected");
  });
}

// ===== pill 群組 =====
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
      if (val === "foil" || val === "godfoil") disable = true;
    } else if (eventType === "flash") {
      if (val === "normal" || val === "removed") disable = true;
    } else if (eventType === "transform") {
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

function setupPillGroups() {
  document.querySelectorAll(".pill-group").forEach((group) => {
    group.addEventListener("click", (e) => {
      const btn = e.target.closest(".pill-btn");
      if (!btn || btn.dataset.disabled === "true") return;

      group
        .querySelectorAll(".pill-btn")
        .forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");

      if (group.dataset.group === "eventType") updateFoilAvailability();
    });
  });

  updateFoilAvailability();
}

function getActiveValue(groupName) {
  const btn = document.querySelector(
    `.pill-group[data-group="${groupName}"] .pill-btn.active`
  );
  return btn ? btn.dataset.value : "";
}

// ===== 卡牌統計 =====
function createBaseStatsForRole() {
  const stats = {};
  CARD_TYPES.forEach((ct) => {
    stats[ct] = { normal: 0, foil: 0, godfoil: 0, removed: 0 };
  });
  stats.character.normal = 4;
  return stats;
}

function validateLogs(logs) {
  const stats = {
    char1: createBaseStatsForRole(),
    char2: createBaseStatsForRole(),
    char3: createBaseStatsForRole(),
  };

  const apply = (role, type, foil, delta) => {
    const s = stats[role][type];
    const next = s[foil] + delta;
    if (next < 0) return false;
    s[foil] = next;
    return true;
  };

  for (const log of logs) {
    const { targetRole, eventType, cardType, foilType } = log;
    let ok = true;

    switch (eventType) {
      case "gain":
        ok = apply(targetRole, cardType, foilType, +1);
        break;

      case "flash":
        ok =
          apply(targetRole, cardType, "normal", -1) &&
          apply(targetRole, cardType, foilType, +1);
        break;

      case "transform":
        const fromType = log.srcCardType || "character";
        const fromFoil = log.srcFoilType || foilType;
        ok =
          apply(targetRole, fromType, fromFoil, -1) &&
          apply(targetRole, cardType, foilType, +1);
        break;

      case "delete":
        ok = apply(targetRole, cardType, foilType, -1);
        break;

      case "copy":
        ok = apply(targetRole, cardType, foilType, +1);
        break;
    }

    if (!ok) return false;
  }

  return true;
}

function recalcCardStatsAllRoles() {
  const stats = {
    char1: createBaseStatsForRole(),
    char2: createBaseStatsForRole(),
    char3: createBaseStatsForRole(),
  };

  const clamp = (n) => Math.max(0, n);
  const apply = (role, type, foil, delta) => {
    const now = stats[role][type][foil];
    stats[role][type][foil] = clamp(now + delta);
  };

  state.logs.forEach((log) => {
    const { targetRole, eventType, cardType, foilType } = log;

    switch (eventType) {
      case "gain":
        apply(targetRole, cardType, foilType, +1);
        break;

      case "flash":
        apply(targetRole, cardType, "normal", -1);
        apply(targetRole, cardType, foilType, +1);
        break;

      case "transform":
        const fromType = log.srcCardType || "character";
        const fromFoil = log.srcFoilType || foilType;
        apply(targetRole, fromType, fromFoil, -1);
        apply(targetRole, cardType, foilType, +1);
        break;

      case "delete":
        apply(targetRole, cardType, foilType, -1);
        break;

      case "copy":
        apply(targetRole, cardType, foilType, +1);
        break;
    }
  });

  updateCardStatsUI(stats);
  return stats;
}

function updateCardStatsUI(stats) {
  const set = (id, v) => {
    const el = document.getElementById(id);
    if (el) el.textContent = v;
  };

  ["char1", "char2", "char3"].forEach((role) => {
    CARD_TYPES.forEach((type) => {
      FOIL_TYPES.forEach((foil) => {
        set(`${role}_cardCount_${type}_${foil}`, stats[role][type][foil]);
      });
    });
  });
}

// ===== 事件統計 =====
function recalcEventStatsAllRoles() {
  const base = () => ({
    gain: 0,
    flash: 0,
    transform: 0,
    delete: 0,
    copy: 0,
    deleteCharacter: 0,
  });

  const result = {
    char1: base(),
    char2: base(),
    char3: base(),
  };

  state.logs.forEach((log) => {
    const r = result[log.targetRole];
    r[log.eventType]++;
    if (log.eventType === "delete" && log.cardType === "character")
      r.deleteCharacter++;
  });

  state.eventStats = result;
}

// ===== 計算分數 =====
function calcCardScoreForRole(s) {
  let score = 0;

  score += (s.character.godfoil || 0) * 20;

  ["neutral", "forbidden"].forEach((t) => {
    const v = s[t];
    score += (v.normal || 0) * 20;
    score += (v.foil || 0) * 30;
    score += (v.godfoil || 0) * 50;
  });

  const m = s.monster;
  score += (m.normal || 0) * 80;
  score += (m.foil || 0) * 90;
  score += (m.godfoil || 0) * 110;

  return score;
}

function calcComboScore(n) {
  if (n <= 1) return 0; // 第一次：0 分
  if (n === 2) return 10; // 第二次：10 分
  if (n === 3) return 30; // 第三次：30 分
  if (n === 4) return 50; // 第四次：50 分
  return 70; // 第五次起：70 分
}

function calcEventScoreForRole(ev) {
  let t = 0;

  // 轉化：10n
  t += (ev.transform || 0) * 10;

  // 複製：0,10,30,50,70,70 ...
  let copyScore = 0;
  for (let i = 1; i <= (ev.copy || 0); i++) {
    copyScore += calcComboScore(i);
  }

  // 刪除：0,10,30,50,70,70 ...
  let deleteScore = 0;
  for (let i = 1; i <= (ev.delete || 0); i++) {
    deleteScore += calcComboScore(i);
  }

  t += copyScore + deleteScore;

  // 刪除角色卡額外 +20
  t += (ev.deleteCharacter || 0) * 20;

  return t;
}

function recalcScores(statsByRole) {
  const roles = ["char1", "char2", "char3"];
  const results = {};

  roles.forEach((role) => {
    const c = calcCardScoreForRole(statsByRole[role]);
    const e = calcEventScoreForRole(state.eventStats[role]);
    results[role] = { cardScore: c, eventScore: e, total: c + e };
  });

  state.scores = results;
  updateScoresUI(results);
}

function updateScoresUI(scores) {
  const cap = getTierCap();

  ["char1", "char2", "char3"].forEach((role) => {
    const el = document.getElementById(role + "Score");
    const s = scores[role];

    if (cap > 0) el.textContent = `分數：${s.total} / ${cap}`;
    else el.textContent = `分數：${s.total}`;

    if (cap > 0 && s.total > cap) el.classList.add("score-over");
    else el.classList.remove("score-over");
  });
}

// ===== 單步計算 hover 差分 =====
function computeRoleScoreDeltas(role) {
  const baseCard = createBaseStatsForRole();
  const baseEv = {
    gain: 0,
    flash: 0,
    transform: 0,
    delete: 0,
    copy: 0,
    deleteCharacter: 0,
  };

  const deltas = [];

  state.logs.forEach((log) => {
    if (log.targetRole !== role) return;

    const preCard = calcCardScoreForRole(baseCard);
    const preEv = calcEventScoreForRole(baseEv);
    const pre = preCard + preEv;

    applyEventToCardStatsSingle(baseCard, log);
    applyEventToEventStatsSingle(baseEv, log);

    const postCard = calcCardScoreForRole(baseCard);
    const postEv = calcEventScoreForRole(baseEv);
    const post = postCard + postEv;

    deltas.push({ deltaTotal: post - pre });
  });

  return deltas;
}

function applyEventToCardStatsSingle(stats, log) {
  const { cardType, foilType, eventType } = log;

  const apply = (ct, ft, d) => {
    stats[ct][ft] = (stats[ct][ft] || 0) + d;
  };

  switch (eventType) {
    case "gain":
      apply(cardType, foilType, +1);
      break;

    case "flash":
      apply(cardType, "normal", -1);
      apply(cardType, foilType, +1);
      break;

    case "transform":
      const fromType = log.srcCardType || "character";
      const fromFoil = log.srcFoilType || foilType;
      apply(fromType, fromFoil, -1);
      apply(cardType, foilType, +1);
      break;

    case "delete":
      apply(cardType, foilType, -1);
      break;

    case "copy":
      apply(cardType, foilType, +1);
      break;
  }
}

function applyEventToEventStatsSingle(ev, log) {
  ev[log.eventType]++;
  if (log.eventType === "delete" && log.cardType === "character")
    ev.deleteCharacter++;
}

// ===== 事件操作 =====
function setupEventActions() {
  document.getElementById("confirmBtn").addEventListener("click", addEvent);
  document.getElementById("undoBtn").addEventListener("click", undoEvent);
  document.getElementById("clearBtn").addEventListener("click", clearEvents);
}

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

  // 這段要獨立放在外面
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
      alert("轉化需要:原卡種類 / 原卡狀態");
      return;
    }

    log.srcCardType = srcType;
    log.srcFoilType = srcFoil;
  }

  const newLogs = [...state.logs, log];
  if (!validateLogs(newLogs)) {
    alert("此操作會使某種卡片數量變成負數,請確認選項。");
    return;
  }

  state.logs.push(log);
  reprocessAll();
}

function undoEvent() {
  state.logs.pop();
  reprocessAll();
}

function clearEvents() {
  if (confirm("確定要清空所有事件?")) {
    state.logs = [];
    reprocessAll();
  }
}

function reprocessAll() {
  const stats = recalcCardStatsAllRoles();
  recalcEventStatsAllRoles();
  recalcScores(stats);
  updateCharacterProgressAll();
  renderLogs();
}

// ===== 右側紀錄 =====
function renderLogs() {
  const box = document.getElementById("logList");
  box.innerHTML = "";
  box.classList.remove("empty");

  const role = state.currentRole;
  if (!role) {
    box.classList.add("empty");
    box.innerHTML = `<div class="log-empty">請先選擇角色。</div>`;
    return;
  }

  // 原始（正序）同角色事件
  const logs = state.logs.filter((l) => l.targetRole === role);

  if (logs.length === 0) {
    box.classList.add("empty");
    box.innerHTML = `<div class="log-empty">此角色尚無記錄。</div>`;
    return;
  }

  // 原本就有的 delta，順序同 logs（正序）
  const deltas = computeRoleScoreDeltas(role);

  // 🔥 顯示用資料：全部倒序
  const logsToShow = logs.slice().reverse();
  const deltasToShow = deltas.slice().reverse();

  const header = document.createElement("div");
  header.className = "log-item log-item-header";
  header.innerHTML = `
    <div class="log-col-center"></div>
    <div class="log-col-center">角色</div>
    <div class="log-col-center">事件</div>
    <div class="log-col-center">種類</div>
    <div class="log-col-center">卡牌狀態</div>
  `;
  box.appendChild(header);

  logsToShow.forEach((log, i) => {
    const isTrans = log.eventType === "transform";

    const typeText = isTrans
      ? `${CARD_TYPE_LABEL_MAP[log.srcCardType]} → ${
          CARD_TYPE_LABEL_MAP[log.cardType]
        }`
      : CARD_TYPE_LABEL_MAP[log.cardType];

    const foilText = isTrans
      ? `${FOIL_TYPE_LABEL_MAP[log.srcFoilType]} → ${
          FOIL_TYPE_LABEL_MAP[log.foilType]
        }`
      : FOIL_TYPE_LABEL_MAP[log.foilType];

    const row = document.createElement("div");
    row.className = "log-item";

    // 🔥 序號：最大的在最上面（完全倒敘）
    const rowNumber = logsToShow.length - i;

    // 🔥 delta：跟著一起反轉後用同一個 index，保證對得上
    const d = deltasToShow[i]?.deltaTotal ?? 0;
    const dText = d > 0 ? `+${d}` : `${d}`;
    const dClass =
      d > 0 ? "delta-positive" : d < 0 ? "delta-negative" : "delta-zero";

    row.innerHTML = `
      <div class="log-col-center">${rowNumber}</div>
      <div class="log-col-center">${ROLE_LABEL_MAP[log.targetRole]}</div>
      <div class="log-col-center">${EVENT_TYPE_LABEL_MAP[log.eventType]}</div>
      <div class="log-col-center">${typeText}</div>
      <div class="log-col-center">${foilText}</div>
      <div class="log-tooltip"><span class="delta ${dClass}">${dText}</span></div>
    `;

    box.appendChild(row);
  });
}

// ===== 存檔 / 載入 =====
function setupSaveLoad() {
  const saveBtn = document.getElementById("saveBtn");
  const loadBtn = document.getElementById("loadBtn");
  const clearBtn = document.getElementById("clearSaveBtn");
  const status = document.getElementById("saveStatus");

  saveBtn.addEventListener("click", () => {
    const data = {
      logs: state.logs,
      currentRole: state.currentRole,
      tier: document.getElementById("tierInput").value,
    };
    localStorage.setItem("chaosSave_v3", JSON.stringify(data));
    status.textContent = "已儲存";
    setTimeout(() => (status.textContent = ""), 1500);
  });

  loadBtn.addEventListener("click", () => {
    const raw =
      localStorage.getItem("chaosSave_v3") ||
      localStorage.getItem("chaosSave_v2");
    if (!raw) return;

    const data = JSON.parse(raw);
    document.getElementById("tierInput").value = data.tier || 0;

    state.logs = data.logs || [];
    state.currentRole = data.currentRole || "char1";

    reprocessAll();
    updateRoleSelectionHighlight();

    status.textContent = "已載入";
    setTimeout(() => (status.textContent = ""), 1500);
  });

  clearBtn.addEventListener("click", () => {
    localStorage.removeItem("chaosSave_v3");
    localStorage.removeItem("chaosSave_v2");
    status.textContent = "已清除";
    setTimeout(() => (status.textContent = ""), 1500);
  });
}

// ===== 卡牌統計全展開 / 收合 =====
function setupCardStatsToggleAll() {
  const btn = document.getElementById("cardStatsToggleAll");
  let collapsed = true;

  const apply = () => {
    document.querySelectorAll(".card-stats-section").forEach((sec) => {
      if (collapsed) sec.classList.add("collapsed");
      else sec.classList.remove("collapsed");
    });
    btn.textContent = collapsed ? "▶ 卡牌數量統計" : "▼ 卡牌數量統計";
  };

  apply();

  btn.addEventListener("click", () => {
    collapsed = !collapsed;
    apply();
  });
}

// ===== 初始化 =====
function init() {
  initTierInput();

  buildPillGroup("eventType", EVENT_TYPE_OPTIONS);
  buildPillGroup("srcCardType", CARD_TYPE_OPTIONS);
  buildPillGroup("srcFoilType", FOIL_TYPE_OPTIONS);
  buildPillGroup("cardType", CARD_TYPE_OPTIONS);
  buildPillGroup("foilType", FOIL_TYPE_OPTIONS);

  setupPillGroups();
  setupEventActions();
  setupSaveLoad();

  setupRoleSelection();
  setupCardStatsToggleAll();

  reprocessAll();
}

init();
