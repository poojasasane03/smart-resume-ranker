// Real login is now active, so this stays false.
const DEV_SKIP_AUTH = false;

function requireAuth() {
  if (DEV_SKIP_AUTH) return;

  const token = localStorage.getItem("token");
  if (!token) {
    window.location.href = "login.html";
  }
}

function logout() {
  localStorage.removeItem("token");
  window.location.href = "login.html";
}
