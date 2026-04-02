import axios from 'axios';

// Base instance of axios to be used across all feature services
export const apiClient = axios.create({
  baseURL: 'http://localhost:3000/api', // Pointing to your existing backend
  headers: {
    'Content-Type': 'application/json',
  },
});

// Puedes añadir interceptores aquí después (e.g., tokens)
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // Si la API devuelve un error legible, lo mostramos
    if (error.response && error.response.data && error.response.data.error) {
      console.error("API Error: ", error.response.data.error);
    }
    return Promise.reject(error);
  }
);
