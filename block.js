document.addEventListener("DOMContentLoaded", () => {
  const balanceDisplay = document.getElementById("block-remaining-balance");
  const studyButton = document.getElementById("btn-block-study");

  function formatBalanceWithSeconds(minutesFloat) {
    const totalSecs = Math.max(0, Math.ceil(minutesFloat * 60));
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins}m ${String(secs).padStart(2, "0")}s`;
  }

  // Read current balance
  chrome.storage.local.get(["wallet"], (res) => {
    const balance = (res.wallet && res.wallet.balance) || 0.0;
    balanceDisplay.textContent = `Wallet Balance: ${formatBalanceWithSeconds(balance)}`;
  });

  studyButton.addEventListener("click", () => {
    chrome.tabs.create({ url: "chrome://extensions" });
  });
});
