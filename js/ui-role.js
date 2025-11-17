// js/ui-role.js
import {
  ROLE_LABEL_MAP,
  ROLE_PRESET_GROUPS,
  ROLE_ELEMENT_LABEL_MAP,
} from "./config.js";
import { state, ROLES } from "./state.js";
import { renderLogs } from "./ui-logs.js";

let renameTargetRole = null;
let roleNameModalEl = null;

// =======================================
// 對外入口：初始化角色相關 UI
// =======================================
export function setupRoleUI() {
  roleNameModalEl = document.getElementById("roleNameModal");

  setupRoleSelection();
  setupRoleNameModal();
  setupCardStatsToggleAll();
  updateRoleNameUI();
  updateRoleCardBackgroundAll();
}

// =======================================
// 角色名稱 + 立繪
// =======================================
export function updateRoleNameUI() {
  ROLES.forEach((roleId, idx) => {
    const fallback = ROLE_LABEL_MAP[roleId] || `角色 ${idx + 1}`;
    const name = (state.roleNames && state.roleNames[roleId]) || fallback;

    const titleEl = document.getElementById(roleId + "Name");
    if (titleEl) titleEl.textContent = name;

    const statsEl = document.getElementById(roleId + "NameStats");
    if (statsEl) statsEl.textContent = name;
  });

  // 名稱改了，背景立繪也同步
  updateRoleCardBackgroundAll();
}

function updateRoleCardBackgroundAll() {
  ROLES.forEach((roleId) => updateRoleCardBackground(roleId));
}

function updateRoleCardBackground(roleId) {
  const card = document.querySelector(
    `.role-progress-item[data-role="${roleId}"]`
  );
  if (!card) return;

  // 確保有 .role-bg
  let bg = card.querySelector(".role-bg");
  if (!bg) {
    bg = document.createElement("div");
    bg.className = "role-bg";
    card.prepend(bg);
  }

  const name =
    (state.roleNames && state.roleNames[roleId]) || ROLE_LABEL_MAP[roleId];

  // 如果還是「角色 1 / 角色 2 / 角色 3」這種，就不要顯示立繪
  if (!name || /^角色\s*\d+$/.test(name)) {
    bg.style.backgroundImage = "";
    card.classList.remove("role-has-image", "role-expanded");
    return;
  }

  const fileName = encodeURIComponent(name) + ".jpg";
  const url = `image/Role/${fileName}`;

  bg.style.backgroundImage = `url("${url}")`;
  card.classList.add("role-has-image");
}

// 變更角色名稱
function renameRole(roleId, name) {
  const trimmed = (name || "").trim();
  if (!trimmed) return;

  if (!state.roleNames) state.roleNames = {};
  state.roleNames[roleId] = trimmed;

  updateRoleNameUI();
  renderLogs(); // 右側紀錄裡的「角色」欄也會顯示新名稱
}

// =======================================
// 角色選取（點選 / 雙擊改名）
// =======================================
function setupRoleSelection() {
  document.querySelectorAll(".role-progress-item").forEach((item) => {
    const roleId = item.dataset.role;

    // 單擊：切換目前角色
    item.addEventListener("click", () => {
      state.currentRole = roleId;
      updateRoleSelectionHighlight();
      renderLogs();
    });

    // 雙擊：開啟命名 modal
    item.addEventListener("dblclick", () => {
      openRoleNameModal(roleId);
    });
  });

  updateRoleSelectionHighlight();
}

export function updateRoleSelectionHighlight() {
  document.querySelectorAll(".role-progress-item").forEach((item) => {
    if (item.dataset.role === state.currentRole) {
      item.classList.add("role-selected");
    } else {
      item.classList.remove("role-selected");
    }
  });
}

// =======================================
// 角色命名 Modal
// =======================================
function openRoleNameModal(roleKey) {
  if (!roleNameModalEl) return;
  renameTargetRole = roleKey;

  roleNameModalEl.classList.remove("hidden");

  // 強制 reflow 讓 transition 確實生效
  void roleNameModalEl.offsetWidth;

  roleNameModalEl.classList.add("active");
}

function closeRoleNameModal() {
  if (!roleNameModalEl) return;

  roleNameModalEl.classList.remove("active");

  const handle = (e) => {
    if (e.target !== roleNameModalEl) return;

    roleNameModalEl.classList.add("hidden");
    renameTargetRole = null;
    roleNameModalEl.removeEventListener("transitionend", handle);
  };

  roleNameModalEl.addEventListener("transitionend", handle);
}

function setupRoleNameModal() {
  const modal = document.getElementById("roleNameModal");
  const optionsContainer = document.getElementById("roleNameOptions");
  const cancelBtn = document.getElementById("roleNameCancel");
  if (!modal || !optionsContainer || !cancelBtn) return;

  roleNameModalEl = modal;
  optionsContainer.innerHTML = "";

  // 依屬性顏色分組建立按鈕
  Object.entries(ROLE_PRESET_GROUPS).forEach(([elementKey, names]) => {
    const group = document.createElement("div");
    group.className = `role-name-group element-${elementKey}`;

    const title = document.createElement("div");
    title.className = "role-name-group-title";
    title.innerHTML = `
      <img class="role-attr-icon" src="image/Attr/${elementKey}.png" alt="${elementKey}">
      <span>${
        ROLE_ELEMENT_LABEL_MAP[elementKey] || elementKey.toUpperCase()
      }</span>
    `;

    group.appendChild(title);

    const body = document.createElement("div");
    body.className = "role-name-group-body";

    names.forEach((name) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = `role-name-option-btn element-${elementKey}`;
      btn.textContent = name;
      btn.addEventListener("click", () => {
        if (!renameTargetRole) return;
        renameRole(renameTargetRole, name);
        closeRoleNameModal();
      });
      body.appendChild(btn);
    });

    group.appendChild(body);
    optionsContainer.appendChild(group);
  });

  // 取消按鈕
  cancelBtn.addEventListener("click", () => {
    closeRoleNameModal();
  });

  // 點擊背景關閉
  modal.addEventListener("click", (e) => {
    if (e.target === modal) closeRoleNameModal();
  });
}

// =======================================
// 卡牌統計總開關（「卡牌數量統計」展開 / 收合）
// =======================================
function setupCardStatsToggleAll() {
  const btn = document.getElementById("cardStatsToggleAll");
  const arrow = document.getElementById("statsArrow");
  if (!btn || !arrow) return;

  btn.addEventListener("click", () => {
    const sections = document.querySelectorAll(".card-stats-section");
    if (!sections.length) return;

    const first = sections[0];
    const willExpand = first.classList.contains("collapsed");

    sections.forEach((sec) => {
      if (willExpand) {
        sec.classList.remove("collapsed");
      } else {
        sec.classList.add("collapsed");
      }
    });

    if (willExpand) {
      arrow.classList.add("rotated");
    } else {
      arrow.classList.remove("rotated");
    }

    // 立繪縮放效果：展開時加上 role-expanded
    document
      .querySelectorAll(".role-progress-item.role-has-image")
      .forEach((card) => {
        if (willExpand) {
          card.classList.add("role-expanded");
        } else {
          card.classList.remove("role-expanded");
        }
      });
  });
}
