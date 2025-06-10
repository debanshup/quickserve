export const RELOADER_SCRIPT = `<script>
                          const ws = new WebSocket('ws://localhost:__WSS_PORT');         
                          ws.onmessage = (event) => {
                            const msg = JSON.parse(event.data);
                            if (msg.action === "reload") {
                              location.reload();
                            }
                          };
                        </script>`;
