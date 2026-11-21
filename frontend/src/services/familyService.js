import api from "./api";

const unwrap = (response) => response.data;

export const familyService = {
  getAll: () => api.get("/family/users").then(unwrap),
  create: (payload) => api.post("/family/users", payload).then(unwrap),
  update: (payload, id) => api.put(`/family/users/${id}`, payload).then(unwrap),
  delete: (id) => api.delete(`/family/users/${id}`).then(unwrap),
};
