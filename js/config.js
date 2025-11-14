// 角色清單
export const ROLE_OPTIONS = [
  { id: "char1", label: "角色 1" },
  { id: "char2", label: "角色 2" },
  { id: "char3", label: "角色 3" },
];

// 卡片種類
export const CARD_TYPE_OPTIONS = [
  { id: "character", label: "角色卡" },
  { id: "neutral", label: "中立卡" },
  { id: "monster", label: "怪物卡" },
  { id: "forbidden", label: "禁忌卡" },
];

// 事件種類
export const EVENT_TYPE_OPTIONS = [
  { id: "gain", label: "獲得" },
  { id: "flash", label: "靈光一閃" },
  { id: "delete", label: "刪除" },
  { id: "transform", label: "轉化" },
  { id: "copy", label: "複製" },
];

// 閃卡狀態
export const FOIL_TYPE_OPTIONS = [
  { id: "normal", label: "一般" },
  { id: "foil", label: "普閃" },
  { id: "godfoil", label: "神閃" },
];

// 顯示用 label map（右側紀錄用）
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
