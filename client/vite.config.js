import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // uncomment this server obj in final version
  // server: {
  //   proxy: {
  //     "/api": {
  //       target: import.meta.env.VITE_SERVER_URL,
  //       changeOrigin: true,
  //     },
  //   },
  // },

  // todo: implement pwa(progressive web app) for add install app in your system
});
