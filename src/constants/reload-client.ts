export const HMR_CLIENT = `
(function () {
  // Automatically switch between secure and standard WebSockets
  const proto = location.protocol === "https:" ? "wss" : "ws";
  const ws = new WebSocket(
    \`\${proto}://\${location.host}/hmr?page=\${location.pathname}\`,
  );

  ws.onopen = () => console.log("[HMR] Connected to Dev Server");
  ws.onerror = (err) => console.error("[HMR] WebSocket Error:", err);

  ws.onmessage = (event) => {
    try {
      const msg = JSON.parse(event.data);

      // Action 1: Full Page Reload
      if (msg.action === "reload") {
        console.log("[HMR] Full reload triggered.");
        location.reload();
      } 
      
      // Action 2: Hot DOM & Style Injection
      else if (msg.action === "inject") {
        console.log("[HMR] Hot injecting changes...");

        if (msg.body !== undefined) {
          document.body.innerHTML = msg.body;
        }

        if (msg.style !== undefined) {
          // Remove old styles to prevent collision
          document
            .querySelectorAll("style:not(#hmr-injected-styles)")
            .forEach((el) => el.remove());
            
          let styleTag = document.getElementById("hmr-injected-styles");
          if (!styleTag) {
            styleTag = document.createElement("style");
            styleTag.id = "hmr-injected-styles";
            document.head.appendChild(styleTag);
          }

          // Apply the fresh CSS
          styleTag.innerHTML = msg.style;
        }
      }

      // Action 3: CSS Link Refreshing (Cache Busting)
      if (msg.action === "css-update") {
      // console.info("css update")
      console.info(msg)
      const links = document.querySelectorAll("link[rel='stylesheet']");
      links.forEach((link) => {
        const url = new URL(link.href);
          if (link.href.includes(msg.path)) {
            // Append timestamp to bypass browser cache
            const newHref = msg.path + "?t=" + Date.now();
            link.href = newHref;
          }
        });
      }
    } catch (e) {
      console.error("[HMR] Failed to process message:", e);
    }
  };
})();
`;
