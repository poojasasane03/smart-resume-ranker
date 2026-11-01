// TEMPORARY: lets you open protected pages before real login exists.
// In Phase 4 we will change this to false.
const DEV_SKIP_AUTH = true;

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
