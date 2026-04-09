import { io } from 'socket.io-client';
const API = process.env.REACT_APP_API_URL || 'http://localhost:4000';
let socket = null;
export function getSocket() {
  if (!socket) socket = io(API, { transports: ['websocket', 'polling'] });
  return socket;
}
export default getSocket;
