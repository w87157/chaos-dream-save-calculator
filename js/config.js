// 角色清單
export const ROLE_OPTIONS = [
  { id: "char1", label: "角色 1" },
  { id: "char2", label: "角色 2" },
  { id: "char3", label: "角色 3" },
];

// 卡片種類
export const CARD_TYPE_OPTIONS = [
  { id: "character", label: "角色" },
  { id: "neutral", label: "中立" },
  { id: "monster", label: "怪物" },
  { id: "forbidden", label: "禁忌" },
];

// 事件種類（順序：獲得 → 靈光一閃 → 轉化 → 刪除 → 複製）
export const EVENT_TYPE_OPTIONS = [
  { id: "gain", label: "獲得" },
  { id: "flash", label: "靈閃" },
  { id: "transform", label: "轉化" },
  { id: "delete", label: "刪除" },
  { id: "copy", label: "複製" },
];

// 卡牌狀態（含移除）
export const FOIL_TYPE_OPTIONS = [
  { id: "normal", label: "一般" },
  { id: "foil", label: "普閃" },
  { id: "godfoil", label: "神閃" },
  { id: "removed", label: "移除" },
];

// ---- 顯示用 label map ----
export const ROLE_LABEL_MAP = Object.fromEntries(
  ROLE_OPTIONS.map((o) => [o.id, o.label])
);

export const CARD_TYPE_LABEL_MAP = Object.fromEntries(
  CARD_TYPE_OPTIONS.map((o) => [o.id, o.label])
);

export const EVENT_TYPE_LABEL_MAP = Object.fromEntries(
  EVENT_TYPE_OPTIONS.map((o) => [o.id, o.label])
);

export const FOIL_TYPE_LABEL_MAP = Object.fromEntries(
  FOIL_TYPE_OPTIONS.map((o) => [o.id, o.label])
);

// =======================================
// 預設角色名稱：依屬性顏色分組
// =======================================

export const ROLE_PRESET_GROUPS = {
  red: ["梅鈴", "維若妮卡", "席琳娜", "盧卡斯", "瑪莉貝爾", "歐文"],
  purple: ["琳", "蕾歐娜", "凱隆", "德蕾莎", "蕾伊"],
  orange: ["卡莉佩", "奧爾萊亞", "妮雅", "凱西烏斯"],
  green: ["路克", "雨果", "友紀", "艾美"],
  blue: ["麥格納", "小春", "米卡", "百麗兒"],
};

// 每個顏色在 modal 裡顯示的組名
export const ROLE_ELEMENT_LABEL_MAP = {
  red: "熱情",
  purple: "虛無",
  orange: "本能",
  green: "秩序",
  blue: "正義",
};
