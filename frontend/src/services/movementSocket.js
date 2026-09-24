import { io } from 'socket.io-client';
import api from './api';
import { getStoredAuth } from '../utils/auth';

const STAFF_ROLES = new Set(['HOD', 'Sister', 'Warden']);
const MOVEMENT_EVENT = 'movement:updated';

let movementSocket = null;
let activeToken = null;

const getSocketUrl = () => {
  if (typeof window === 'undefined') return null;

  const apiBaseUrl = api.defaults.baseURL || '/api';
  const url = new URL(apiBaseUrl, window.location.origin);
  url.pathname = url.pathname.replace(/\/api\/?$/, '') || '/';
  url.search = '';
  url.hash = '';
  return url.toString();
};

export const connectMovementSocket = () => {
  const { token, user } = getStoredAuth();

  if (!token || !STAFF_ROLES.has(user?.role)) return null;

  if (movementSocket && activeToken === token) return movementSocket;
  if (movementSocket) disconnectMovementSocket();

  const url = getSocketUrl();
  if (!url) return null;

  movementSocket = io(url, {
    auth: { token },
  });
  activeToken = token;

  movementSocket.on('connect_error', () => {
    // Keep diagnostics free of token, event payloads, and server details.
    console.warn('[HOMS] Staff movement realtime connection failed');
  });

  return movementSocket;
};

export const subscribeToMovementUpdates = (callback) => {
  if (typeof callback !== 'function') return () => {};

  const socket = connectMovementSocket();
  if (!socket) return () => {};

  socket.on(MOVEMENT_EVENT, callback);
  return () => {
    socket.off(MOVEMENT_EVENT, callback);
  };
};

export const disconnectMovementSocket = () => {
  if (!movementSocket) {
    activeToken = null;
    return;
  }

  movementSocket.removeAllListeners();
  movementSocket.disconnect();
  movementSocket = null;
  activeToken = null;
};
