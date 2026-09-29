import axios from "axios";
import { auth } from "./firebase";

const API = process.env.REACT_APP_API_URL || "http://localhost:5001";

export async function authFetch(input, init = {}) {
  const user = auth.currentUser;
  const headers = new Headers(init.headers || {});
  if (user) headers.set("Authorization", `Bearer ${await user.getIdToken()}`);
  const response = await window.fetch(input, { ...init, headers });
  return response;
}

let interceptorInstalled = false;
export function installAxiosAuth() {
  if (interceptorInstalled) return;
  interceptorInstalled = true;
  axios.interceptors.request.use(async (config) => {
    const url = String(config.url || "");
    if (auth.currentUser && (url.startsWith(API) || url.startsWith("/api/"))) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${await auth.currentUser.getIdToken()}`;
    }
    return config;
  });
}
