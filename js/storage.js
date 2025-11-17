// js/storage.js
import { state } from "./state.js";
import { reprocessAll } from "./logic-core.js";
import { updateRoleNameUI, updateRoleSelectionHighlight } from "./ui-role.js";

const STORAGE_KEY_V3 = "chaosSave_v3";
const STORAGE_KEY_V2 = "chaosSave_v2"; // 舊版相容

export function setupSaveLoad() {
  const saveBtn = document.getElementById("saveBtn");
  const loadBtn = document.getElementById("loadBtn");
  const clearBtn = document.getElementById("clearSaveBtn");
  const status = document.getElementById("saveStatus");

  if (!saveBtn || !loadBtn || !clearBtn || !status) return;

  // ===== 儲存 =====
  saveBtn.addEventListener("click", () => {
    const data = {
      logs: state.logs,
      currentRole: state.currentRole,
      tier: document.getElementById("tierInput")?.value ?? 0,
      roleNames: state.roleNames,
    };

    try {
      localStorage.setItem(STORAGE_KEY_V3, JSON.stringify(data));
      status.textContent = "已儲存";
    } catch (e) {
      console.error("儲存失敗：", e);
      status.textContent = "儲存失敗";
    }

    setTimeout(() => (status.textContent = ""), 1500);
  });

  // ===== 載入 =====
  loadBtn.addEventListener("click", () => {
    const raw =
      localStorage.getItem(STORAGE_KEY_V3) ||
      localStorage.getItem(STORAGE_KEY_V2);

    if (!raw) {
      status.textContent = "沒有可載入的存檔";
      setTimeout(() => (status.textContent = ""), 1500);
      return;
    }

    let data;
    try {
      data = JSON.parse(raw);
    } catch (e) {
      console.error("讀取存檔失敗：", e);
      status.textContent = "存檔格式錯誤";
      setTimeout(() => (status.textContent = ""), 1500);
      return;
    }

    const tierInput = document.getElementById("tierInput");
    if (tierInput) tierInput.value = data.tier || 0;

    state.logs = data.logs || [];
    state.currentRole = data.currentRole || "char1";

    if (data.roleNames) {
      state.roleNames = data.roleNames;
    }

    reprocessAll();
    updateRoleSelectionHighlight();
    updateRoleNameUI();

    status.textContent = "已載入";
    setTimeout(() => (status.textContent = ""), 1500);
  });

  // ===== 清除存檔 =====
  clearBtn.addEventListener("click", () => {
    localStorage.removeItem(STORAGE_KEY_V3);
    localStorage.removeItem(STORAGE_KEY_V2);

    status.textContent = "已清除";
    setTimeout(() => (status.textContent = ""), 1500);
  });
}
