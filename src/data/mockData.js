// mockData.js - 转发至 NestJS + MySQL 8.0 实后台数据层

const API_BASE = '/api';
const API_ORIGIN = '';
const TOKEN_KEY = 'epoints_access_token';

const normalizeAvatar = (item) => item && typeof item === 'object' && typeof item.avatar === 'string' && item.avatar.startsWith('/api/')
  ? { ...item, avatar: `${API_ORIGIN}${item.avatar}` }
  : item;

const normalizeReward = (item) => item && typeof item === 'object' && typeof item.image === 'string' && item.image.startsWith('/api/')
  ? { ...item, image: `${API_ORIGIN}${item.image}` }
  : item;

const normalizePayload = (payload) => {
  if (Array.isArray(payload)) return payload.map(normalizeAvatar);
  if (!payload || typeof payload !== 'object') return payload;
  return {
    ...payload,
    ...(Array.isArray(payload.users) ? { users: payload.users.map(normalizeAvatar) } : {}),
    ...(Array.isArray(payload.rewards) ? { rewards: payload.rewards.map(normalizeReward) } : {}),
    ...(payload.user ? { user: normalizeAvatar(payload.user) } : {}),
  };
};

const authHeaders = () => {
  const token = localStorage.getItem(TOKEN_KEY);
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const parseResponse = async (res) => {
  if (res.status === 401) localStorage.removeItem(TOKEN_KEY);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(Array.isArray(err.message) ? err.message[0] : err.message || 'API 请求失败');
  }
  return normalizePayload(await res.json());
};

const postJson = async (path, body = {}) => {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(body)
  });
  return parseResponse(res);
};

const putJson = async (path, body = {}) => {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(body)
  });
  return parseResponse(res);
};

const deleteJson = async (path) => {
  const res = await fetch(`${API_BASE}${path}`, { method: 'DELETE', headers: authHeaders() });
  return parseResponse(res);
};

const postForm = async (path, fields, files = []) => {
  const form = new FormData();
  Object.entries(fields).forEach(([key, value]) => form.append(key, String(value ?? '')));
  files.forEach(file => form.append('files', file));
  const res = await fetch(`${API_BASE}${path}`, { method: 'POST', headers: authHeaders(), body: form });
  return parseResponse(res);
};

export const login = async (username, password) => {
  const result = await postJson('/auth/login', { username, password });
  localStorage.setItem(TOKEN_KEY, result.accessToken);
  return result;
};

export const restoreSession = async () => {
  if (!localStorage.getItem(TOKEN_KEY)) return null;
  const res = await fetch(`${API_BASE}/auth/me`, { headers: authHeaders() });
  return parseResponse(res);
};

export const logout = () => localStorage.removeItem(TOKEN_KEY);

export const getAppState = async () => {
  const res = await fetch(`${API_BASE}/state`, { headers: authHeaders() });
  return parseResponse(res);
};

export const resetAppState = async () => {
  return postJson('/system/reset');
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

export const createMission = async (missionData, files = []) => {
  return postForm('/missions/create', missionData, files);
};

export const getPersonnel = async () => {
  const res = await fetch(`${API_BASE}/personnel`, { headers: authHeaders() });
  return parseResponse(res);
};

export const updatePersonnel = async (userId, data) => putJson(`/personnel/${userId}`, data);
export const createPersonnel = async (data) => postJson('/personnel', data);
export const deletePersonnel = async (userId) => deleteJson(`/personnel/${userId}`);

export const updatePersonnelAvatar = async (userId, file) => {
  const form = new FormData();
  form.append('avatar', file);
  const res = await fetch(`${API_BASE}/personnel/${userId}/avatar`, { method: 'POST', headers: authHeaders(), body: form });
  return parseResponse(res);
};

export const resetPersonnelAvatar = async (userId) => deleteJson(`/personnel/${userId}/avatar`);

export const previewMissionRecipients = async (data) => postJson('/missions/notification-preview', data);

export const purchaseReward = async (rewardId, userId) => {
  try {
    return await postJson('/rewards/purchase', { rewardId, userId });
  } catch (err) {
    return { error: err.message };
  }
};

const saveReward = async (path, method, data, imageFile) => {
  const form = new FormData();
  Object.entries(data).forEach(([key, value]) => form.append(key, String(value ?? '')));
  if (imageFile) form.append('imageFile', imageFile);
  const res = await fetch(`${API_BASE}${path}`, { method, headers: authHeaders(), body: form });
  return parseResponse(res);
};

export const createReward = async (data, imageFile) => saveReward('/rewards', 'POST', data, imageFile);
export const updateReward = async (rewardId, data, imageFile) => saveReward(`/rewards/${rewardId}`, 'PUT', data, imageFile);
export const deleteReward = async (rewardId) => deleteJson(`/rewards/${rewardId}`);

export const deliverReward = async (txId) => {
  return postJson('/rewards/deliver', { txId });
};

export const raiseAlert = async (ticketData, files = []) => {
  return postForm('/tickets/raise', ticketData, files);
};

export const getAttachmentBlob = async (path) => {
  const res = await fetch(`${API_ORIGIN}${path}`, { headers: authHeaders() });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || '附件读取失败');
  }
  return res.blob();
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

export const updateWecomConfig = async (url, mentionMobiles) => {
  return postJson('/settings/wecom', { url, mentionMobiles });
};

export const testWecomWebhook = async (url, mentionMobiles) => {
  return postJson('/settings/wecom/test', { url, mentionMobiles });
};

// 备用导出，防止第三方引用
export const getTransactions = () => {
  return [];
};
