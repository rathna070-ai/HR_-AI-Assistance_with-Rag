import axios, { type AxiosError, type AxiosInstance } from "axios";
import toast from "react-hot-toast";
import { API_BASE_URL, API_TIMEOUT_MS } from "@/config/api.config";

declare module "axios" {
  interface AxiosRequestConfig {
    // For callers that show their own error UI (e.g. the ingestion card),
    // so the same failure is not also shown as a toast.
    suppressErrorToast?: boolean;
  }
}

// The one Axios instance shared by ingestion and retrieval. No default
// Content-Type: Axios sends JSON for objects and the browser sets the
// multipart boundary for FormData uploads.
export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT_MS,
});

// Request interceptor: a request id the backend echoes in X-Request-Id and logs.
apiClient.interceptors.request.use(
  (config) => {
    config.headers["X-Request-ID"] = crypto.randomUUID();
    return config;
  },
  (error) => Promise.reject(error),
);

// Response interceptor: toast errors. The backend reports failures as
// { success: false, message } (retrieval also adds errorCode).
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ message?: string; error?: string }>) => {
    if (!error.config?.suppressErrorToast) {
      if (error.response) {
        const status = error.response.status;
        const message = error.response.data?.message || error.response.data?.error || "An error occurred";
        if (status === 404) toast.error(`Not found: ${message}`);
        else if (status >= 500) toast.error("Server error. Please try again later.");
        else toast.error(message);
      } else if (error.request) {
        toast.error("Network error. Check your connection.");
      }
    }
    return Promise.reject(error);
  },
);

export default apiClient;
