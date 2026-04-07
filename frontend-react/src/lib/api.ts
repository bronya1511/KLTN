import axios from "axios";
export const API_BASE = import.meta.env.VITE_API_BASE || "http://127.0.0.1:8080/api";
const api = axios.create({ baseURL: API_BASE, timeout: 10000 });
export default api;
