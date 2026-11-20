import api from "./api";

const unwrap = (response) => response.data;

export const authService = {
  create: (payload) => api.post("/users", payload).then(unwrap),
  login: (payload) => api.post("/auth/login", payload).then(unwrap),
  me: () => api.get("/auth/me").then(unwrap),
  refresh: () => api.post("/auth/refresh").then(unwrap),
  logout: () => api.post("/auth/logout").then(unwrap),
};
