import axios from 'axios';

const api = axios.create({
  baseURL: 'http://10.0.48.24:8080/api/v1', // 👈 paste your actual IP here
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export default api;