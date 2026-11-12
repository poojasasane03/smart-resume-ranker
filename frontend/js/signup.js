const form = document.getElementById("signup-form");
const messageBox = document.getElementById("form-message");
const submitBtn = document.getElementById("submit-btn");

function showMessage(text, type) {
  messageBox.textContent = text;
  messageBox.className = `form-message ${type}`;
}

function validateSignup(data) {
  if (data.name.length < 2) return "Please enter your full name.";
  if (data.company.length < 2) return "Please enter your company name.";

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailPattern.test(data.email))
    return "Please enter a valid email address.";

  if (data.password.length < 8)
    return "Password must be at least 8 characters.";
  if (!/[A-Za-z]/.test(data.password) || !/[0-9]/.test(data.password)) {
    return "Password must contain at least one letter and one number.";
  }
  if (data.password !== data.confirmPassword) return "Passwords do not match.";

  return null; // null means: no error
}

form.addEventListener("submit", async (event) => {
  event.preventDefault(); // stop the page from reloading

  const data = {
    name: document.getElementById("name").value.trim(),
    company: document.getElementById("company").value.trim(),
    email: document.getElementById("email").value.trim(),
    password: document.getElementById("password").value,
    confirmPassword: document.getElementById("confirm-password").value,
    inviteCode: document.getElementById("invite-code").value.trim(),
  };

  const error = validateSignup(data);
  if (error) {
    showMessage(error, "error");
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = "Creating account...";

  try {
    const result = await apiRequest("/auth/register", "POST", {
      name: data.name,
      company: data.company,
      email: data.email,
      password: data.password,
      inviteCode: data.inviteCode,
    });

    if (result.token) localStorage.setItem("token", result.token);
    showMessage("Account created! Redirecting...", "success");
    setTimeout(() => (window.location.href = "dashboard.html"), 1000);
  } catch (err) {
    showMessage(err.message, "error");
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Create account";
  }
});
