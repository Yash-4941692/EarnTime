function applyGrayscaleFilters() {
  chrome.storage.local.get(["categories"], (res) => {
    if (chrome.runtime.lastError) return;
    const categories = res.categories || { halfUnproductive: [] };
    const host = window.location.hostname.toLowerCase().replace(/^www\./, "");
    
    const isHalfUnproductive = (categories.halfUnproductive || []).some(d => d === host || host.endsWith("." + d));
    if (isHalfUnproductive) {
      const styleId = "earntime-grayscale-override";
      if (!document.getElementById(styleId)) {
        const style = document.createElement("style");
        style.id = styleId;
        style.innerHTML = `
          html {
            filter: grayscale(100%) !important;
            transition: filter 0.5s ease-in-out;
          }
        `;
        document.documentElement.appendChild(style);
      }
    }
  });
}

// establish keep-alive port connection to hold worker awake
try {
  chrome.runtime.connect({ name: "earntime-keepalive" });
  applyGrayscaleFilters();
  document.addEventListener("DOMContentLoaded", applyGrayscaleFilters);
} catch (e) {
  // Gracefully absorb reload invalidate errors
}
