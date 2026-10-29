import axios from "axios";

/** All API calls go through this server's /api proxy (see next.config.ts). */
export const http = axios.create({
  baseURL: "/api",
  headers: { Accept: "application/json" },
});
