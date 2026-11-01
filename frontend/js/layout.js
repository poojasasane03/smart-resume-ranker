function initLayout() {
  const sidebarEl = document.getElementById("sidebar");
  const toggleBtn = document.getElementById("sidebar-toggle");
  const logoutBtn = document.getElementById("logout-btn");

  if (toggleBtn && sidebarEl) {
    toggleBtn.addEventListener("click", () =>
      sidebarEl.classList.toggle("open"),
    );
  }
  if (logoutBtn) {
    logoutBtn.addEventListener("click", logout);
  }
}

initLayout();
