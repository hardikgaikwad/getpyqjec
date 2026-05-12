// Reads VITE_HOST_IP from .env at project root
// For local dev:  leave VITE_HOST_IP empty or remove it → falls back to localhost
// For mobile:     set VITE_HOST_IP="10.178.115.204" in .env
const HOST = import.meta.env.VITE_HOST_IP || "localhost";
export const API_BASE = `http://${HOST}:8000`;
