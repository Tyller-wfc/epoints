// mockData.js - 转发至 NestJS + MySQL 8.0 实后台数据层

const API_BASE = 'http://localhost:3000/api';

const postJson = async (path, body = {}) => {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message || 'API 请求失败');
  }
  return res.json();
};

export const getAppState = async () => {
  const res = await fetch(`${API_BASE}/state`);
  return res.json();
};

export const resetAppState = async () => {
  return postJson('/system/reset');
};

export const setCurrentUser = async (userId) => {
  return postJson('/users/current', { userId });
};

export const claimMission = async (missionId, userId) => {
  return postJson('/missions/claim', { missionId, userId });
};

export const submitProof = async (missionId, proofText) => {
  return postJson('/missions/submit', { missionId, proofText });
};

export const verifyMission = async (missionId, isApproved, penalize = false) => {
  return postJson('/missions/verify', { missionId, isApproved, penalize });
};

export const updateMultiplier = async (missionId, newMultiplier) => {
  return postJson('/missions/multiplier', { missionId, newMultiplier });
};

export const createMission = async (missionData) => {
  return postJson('/missions/create', missionData);
};

export const purchaseReward = async (rewardId, userId) => {
  try {
    return await postJson('/rewards/purchase', { rewardId, userId });
  } catch (err) {
    return { error: err.message };
  }
};

export const deliverReward = async (txId) => {
  return postJson('/rewards/deliver', { txId });
};

export const raiseAlert = async (ticketData) => {
  return postJson('/tickets/raise', ticketData);
};

export const resolveTicket = async (ticketId, resolutionNote) => {
  return postJson('/tickets/resolve', { ticketId, resolutionNote });
};

export const setActiveDuty = async (dutyId) => {
  return postJson('/duty/active', { dutyId });
};

export const penalizeNegligence = async (ticketId) => {
  return postJson('/tickets/negligence', { ticketId });
};

export const flagSecondaryIncident = async (ticketId) => {
  return postJson('/tickets/secondary', { ticketId });
};

export const acknowledgeTicket = async (ticketId, userId) => {
  return postJson('/tickets/acknowledge', { ticketId, userId });
};

export const updateWebhookUrl = async (url) => {
  return postJson('/settings/webhook', { url });
};

// 备用导出，防止第三方引用
export const getTransactions = () => {
  return [];
};
