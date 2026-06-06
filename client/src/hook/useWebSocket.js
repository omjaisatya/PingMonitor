import { useEffect, useRef } from "react";
import { getAccessToken } from "../utils/csrf";

export function useWebSocket(onEvent) {
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  useEffect(() => {
    const token = getAccessToken();
    const apiUrl = import.meta.env.VITE_SERVER_URL?.replace(/\/api$/, "");
    if (!token || !apiUrl) return undefined;

    const wsUrl = `${apiUrl.replace(/^http/, "ws")}/ws?token=${encodeURIComponent(token)}`;
    let socket = null;
    let reconnectTimeout = null;
    let isClosed = false;

    function connect() {
      if (isClosed) return;
      socket = new WebSocket(wsUrl);

      socket.addEventListener("message", (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data && data.event && onEventRef.current) {
            onEventRef.current(data.event, data.payload);
          }
        } catch (err) {
          // Ignore malformed websocket messages
        }
      });

      socket.addEventListener("close", () => {
        if (!isClosed) {
          reconnectTimeout = setTimeout(connect, 5000);
        }
      });

      socket.addEventListener("error", () => {
        socket.close();
      });
    }

    connect();

    return () => {
      isClosed = true;
      if (socket) socket.close();
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
    };
  }, []);
}
