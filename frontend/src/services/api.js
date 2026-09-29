import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const schemeAPI = {
  generate: async (data) => {
    const response = await api.post('/schemes/generate', data);
    return response.data;
  },
  research: async (data) => {
    const response = await api.post('/schemes/research', data);
    return response.data;
  },
  generateContent: async (data) => {
    const response = await api.post('/schemes/content', data);
    return response.data;
  },
  exportDocx: async (data) => {
    const response = await api.post('/export/docx', data, { responseType: 'blob' });
    return response;
  },
  getSanityStatus: async () => {
    const response = await api.get('/sanity/status');
    return response.data;
  },
  getSanityCategories: async () => {
    const response = await api.get('/sanity/categories');
    return response.data;
  },
  previewSanity: async (data, categoryId) => {
    const response = await api.post('/sanity/preview', { content: data, categoryId });
    return response.data;
  },
  pushSanity: async (data, categoryId) => {
    const response = await api.post('/sanity/draft', { content: data, categoryId });
    return response.data;
  },
  healthCheck: async () => {
    const response = await api.get('/health');
    return response.data;
  },
  getProviderStatus: async () => {
    const response = await api.get('/providers/status');
    return response.data;
  }
};
