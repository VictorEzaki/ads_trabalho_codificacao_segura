import api from './api';

const unwrap = (response) => response.data;

export const incomeService = {
    getAll: () => api.get('/incomes').then(unwrap),
    create: (payload) => api.post('/incomes', payload).then(unwrap),
    getById: (id) => api.get(`/incomes/${id}`).then(unwrap),
    update: (payload, id) => api.put(`/incomes/${id}`, payload).then(unwrap),
    getReceipt: (id, download = false) =>
        api
            .get(`/incomes/${id}/receipt`, {
                params: download ? { download: 'true' } : {},
                responseType: 'blob',
            })
            .then((response) => ({
                blob: response.data,
                contentType: response.headers['content-type'] || '',
            })),
    delete: (id) => api.delete(`/incomes/${id}`).then(unwrap),
};
