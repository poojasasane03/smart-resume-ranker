const form = document.getElementById("login-form");
const messageBox = document.getElementById("form-message");
const submitBtn = document.getElementById("submit-btn");

function showMessage(text, type) {
  messageBox.textContent = text;
  messageBox.className = `form-message ${type}`;
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  if (!email || !password) {
    showMessage("Please enter your email and password.", "error");
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = "Logging in...";

  try {
    const result = await apiRequest("/auth/login", "POST", { email, password });

    if (result.token) localStorage.setItem("token", result.token);
    window.location.href = "dashboard.html";
  } catch (err) {
    showMessage(err.message, "error");
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Log in";
  }
});
