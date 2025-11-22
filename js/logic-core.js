// js/logic-core.js
import { CARD_TYPE_OPTIONS, FOIL_TYPE_OPTIONS } from "./config.js";
import { state, ROLES, CARD_TYPES, FOIL_TYPES, getTierCap } from "./state.js";

// =======================================
// 基礎結構：卡牌 / 事件
// =======================================

// 單一角色的卡牌數量初始值
export function createBaseStatsForRole() {
  const stats = {};
  CARD_TYPES.forEach((ct) => {
    stats[ct] = { normal: 0, foil: 0, godfoil: 0, removed: 0 };
  });
  // 初始：4 張角色一般卡
  stats.character.normal = 4;
  return stats;
}

// 單一角色的事件統計初始值
function createBaseEventStats() {
  return {
    gain: 0,
    flash: 0,
    transform: 0,
    delete: 0,
    copy: 0,
    deleteCharacter: 0,
    // 有效 transform 次數（新卡片 foilType !== "removed"）
    validTransform: 0,
  };
}

// 把「某一筆 log 對卡牌數的影響」收斂到一個共用 helper
// apply(roleId, cardType, foilType, delta)
function forEachEventEffect(log, apply) {
  const { targetRole, eventType, cardType, foilType } = log;

  const use = (role, type, foil, delta) => {
    apply(role, type, foil, delta);
  };

  switch (eventType) {
    case "gain":
      use(targetRole, cardType, foilType, +1);
      break;
    case "flash":
      use(targetRole, cardType, "normal", -1);
      use(targetRole, cardType, foilType, +1);
      break;
    case "transform": {
      const fromType = log.srcCardType || "character";
      const fromFoil = log.srcFoilType || foilType;
      use(targetRole, fromType, fromFoil, -1);
      use(targetRole, cardType, foilType, +1);
      break;
    }
    case "delete":
      use(targetRole, cardType, foilType, -1);
      break;
    case "copy":
      use(targetRole, cardType, foilType, +1);
      break;
  }
}

// =======================================
// 驗證 log（不能讓卡片變成負數）
// =======================================

export function validateLogs(logs) {
  const stats = {};
  ROLES.forEach((roleId) => {
    stats[roleId] = createBaseStatsForRole();
  });

  const apply = (role, type, foil, delta) => {
    const s = stats[role][type];
    const next = s[foil] + delta;
    if (next < 0) return false;
    s[foil] = next;
    return true;
  };

  for (const log of logs) {
    let ok = true;

    forEachEventEffect(log, (role, type, foil, delta) => {
      if (!ok) return;
      ok = apply(role, type, foil, delta);
    });

    if (!ok) return false;
  }

  return true;
}

// =======================================
// 卡牌統計（所有角色）
// =======================================

export function recalcCardStatsAllRoles() {
  const stats = {};
  ROLES.forEach((roleId) => {
    stats[roleId] = createBaseStatsForRole();
  });

  const clamp = (n) => Math.max(0, n);

  state.logs.forEach((log) => {
    forEachEventEffect(log, (role, type, foil, delta) => {
      const now = stats[role][type][foil];
      stats[role][type][foil] = clamp(now + delta);
    });
  });

  updateCardStatsUI(stats);
  return stats;
}

// 把 stats 更新到畫面（下方「卡牌數量統計」那坨表格）
export function updateCardStatsUI(stats) {
  const set = (id, v) => {
    const el = document.getElementById(id);
    if (el) el.textContent = v;
  };

  ROLES.forEach((role) => {
    CARD_TYPES.forEach((type) => {
      FOIL_TYPES.forEach((foil) => {
        set(`${role}_cardCount_${type}_${foil}`, stats[role][type][foil]);
      });
    });
  });
}

// =======================================
// 事件統計（gain/flash/transform/...）
// =======================================

export function recalcEventStatsAllRoles() {
  const result = {};
  ROLES.forEach((roleId) => {
    result[roleId] = createBaseEventStats();
  });

  state.logs.forEach((log) => {
    const r = result[log.targetRole];
    if (!r) return;

    // 基本事件次數
    r[log.eventType] = (r[log.eventType] || 0) + 1;

    // 有效 transform：新卡片不是 removed 才算
    if (log.eventType === "transform" && log.foilType !== "removed") {
      r.validTransform++;
    }

    // 刪除角色卡
    if (log.eventType === "delete" && log.cardType === "character") {
      r.deleteCharacter++;
    }
  });

  state.eventStats = result;
}

// =======================================
// 分數計算
// =======================================

// 卡牌分
function calcCardScoreForRole(s) {
  let score = 0;
  // 神閃角色
  score += (s.character.godfoil || 0) * 20;

  // 中立 / 禁忌
  ["neutral", "forbidden"].forEach((t) => {
    const v = s[t];
    if (!v) return;
    score += (v.normal || 0) * 20;
    score += (v.foil || 0) * 30;
    score += (v.godfoil || 0) * 50;
  });

  // 怪物
  const m = s.monster || {};
  score += (m.normal || 0) * 80;
  score += (m.foil || 0) * 80;
  score += (m.godfoil || 0) * 100;

  return score;
}

// 事件次數額外分數（刪除/複製用）
function calcComboScore(n) {
  if (n <= 1) return 0;
  if (n === 2) return 10;
  if (n === 3) return 30;
  if (n === 4) return 50;
  return 70;
}

// 事件分
// 🔸 這裡只根據「某角色自己的事件統計 ev」計算，不再掃 state.logs
function calcEventScoreForRole(ev) {
  let t = 0;

  // transform（若新卡片為 removed → 不給分）
  const validTransforms = ev.validTransform || 0;
  t += validTransforms * 10;

  // 複製 combo 分
  let copyScore = 0;
  for (let i = 1; i <= (ev.copy || 0); i++) {
    copyScore += calcComboScore(i);
  }

  // 刪除 combo 分
  let deleteScore = 0;
  for (let i = 1; i <= (ev.delete || 0); i++) {
    deleteScore += calcComboScore(i);
  }

  t += copyScore + deleteScore;
  t += (ev.deleteCharacter || 0) * 20;

  return t;
}

// 重新計算所有角色的卡牌分 / 事件分 / 總分
export function recalcScores(statsByRole) {
  const results = {};

  ROLES.forEach((role) => {
    const c = calcCardScoreForRole(statsByRole[role]);
    const e = calcEventScoreForRole(
      state.eventStats[role] || createBaseEventStats()
    );
    results[role] = { cardScore: c, eventScore: e, total: c + e };
  });

  state.scores = results;
  updateScoresUI(results);
}

// 更新上半部三個角色底下「分數：X / cap」
export function updateScoresUI(scores) {
  const cap = getTierCap();

  ROLES.forEach((role) => {
    const el = document.getElementById(role + "Score");
    if (!el) return;

    const s = scores[role];

    if (cap > 0) el.textContent = `分數：${s.total} / ${cap}`;
    else el.textContent = `分數：${s.total}`;

    if (cap > 0 && s.total > cap) el.classList.add("score-over");
    else el.classList.remove("score-over");
  });
}

// =======================================
// 單步分數差（右側 log tooltip 用）
// =======================================

export function computeRoleScoreDeltas(role) {
  const baseCard = createBaseStatsForRole();
  const baseEv = createBaseEventStats();

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

// 單一事件對「某角色卡牌統計」的影響
export function applyEventToCardStatsSingle(stats, log) {
  forEachEventEffect(log, (_role, ct, ft, d) => {
    stats[ct][ft] = (stats[ct][ft] || 0) + d;
  });
}

// 單一事件對「某角色事件統計」的影響
export function applyEventToEventStatsSingle(ev, log) {
  ev[log.eventType] = (ev[log.eventType] || 0) + 1;

  // 有效 transform：新卡片不是 removed
  if (log.eventType === "transform" && log.foilType !== "removed") {
    ev.validTransform = (ev.validTransform || 0) + 1;
  }

  if (log.eventType === "delete" && log.cardType === "character") {
    ev.deleteCharacter = (ev.deleteCharacter || 0) + 1;
  }
}

// =======================================
// 角色進度條（上半部）
// =======================================

export function updateCharacterProgressAll() {
  const totalCap = getTierCap();

  if (totalCap > 0) {
    // 有 TIER 上限：用總分 / cap
    ROLES.forEach((role) => {
      const score = state.scores[role]?.total ?? 0;
      const pct = Math.min((score / totalCap) * 100, 100);
      updateCharacterProgress(role, pct, score > totalCap);
    });
  } else {
    // 沒有 TIER：用三角色之間相對百分比
    const totals = ROLES.map((r) => state.scores[r]?.total ?? 0);
    const max = Math.max(1, ...totals);
    ROLES.forEach((role, i) => {
      updateCharacterProgress(role, (totals[i] / max) * 100, false);
    });
  }
}

export function updateCharacterProgress(role, pct, isOverCap) {
  const fill = document.getElementById(role + "Fill");
  if (!fill) return;
  fill.style.width = pct + "%";
  if (isOverCap) fill.classList.add("progress-over");
  else fill.classList.remove("progress-over");
}

// =======================================
// reprocessAll：重算一輪（不畫 log）
// =======================================

export function reprocessAll() {
  const stats = recalcCardStatsAllRoles();
  recalcEventStatsAllRoles();
  recalcScores(stats);
  updateCharacterProgressAll();
}
