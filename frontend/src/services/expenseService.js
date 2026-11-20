import api from './api';

const unwrap = (response) => response.data;

export const expenseService = {
    getAll: (params = {}) =>
        api.get("/expenses", {
        params: {
            dateIni: params.dateInicial,
            dateFim: params.dateFinal,
            vlMin: params.valueMin,
            vlMax: params.valueMax,
        },
    }).then(unwrap),
    create: (payload) => api.post('/expenses', payload).then(unwrap),
    getById: (id) => api.get(`/expenses/${id}`).then(unwrap),
    update: (payload, id) => api.put(`/expenses/${id}`, payload).then(unwrap),
    getReceipt: (id, download = false) =>
        api.get(`/expenses/${id}/receipt`, {
            params: download ? { download: 'true' } : {},
            responseType: 'blob',
        }).then((response) => response.data),
    delete: (id) => api.delete(`/expenses/${id}`).then(unwrap),
};

export const dashboardService = expenseService; 