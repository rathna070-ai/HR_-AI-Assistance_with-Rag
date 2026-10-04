import axios, { type AxiosInstance } from "axios";
import { API_BASE_URL, API_TIMEOUT_MS } from "@/config/api.config";

// The one Axios instance shared by ingestion and retrieval.
export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT_MS,
});

export default apiClient;
