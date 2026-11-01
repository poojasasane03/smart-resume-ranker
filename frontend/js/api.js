const API_BASE = "/api";

// One function that every page will use to talk to the backend
async function apiRequest(path, method = "GET", body = null) {
  const options = { method, headers: {} };

  // If the user is logged in, send their token with the request
  const token = localStorage.getItem("token");
  if (token) {
    options.headers["Authorization"] = `Bearer ${token}`;
  }

  if (body instanceof FormData) {
    // Files: let the browser set the Content-Type itself (it adds a boundary)
    options.body = body;
  } else if (body) {
    // Normal data: send as JSON
    options.headers["Content-Type"] = "application/json";
    options.body = JSON.stringify(body);
  }

  let response;
  try {
    response = await fetch(API_BASE + path, options);
  } catch (error) {
    throw new Error("Cannot reach the server. Is the backend running?");
  }

  let data = {};
  try {
    data = await response.json();
  } catch (error) {
    // response had no JSON body, keep data as {}
  }

  // Token missing/expired: clear it and send the user to the login page
  // (but not for /auth/ routes, where 401 just means "wrong password")
  if (response.status === 401 && !path.startsWith("/auth/")) {
    localStorage.removeItem("token");
    window.location.href = "/pages/login.html";
    throw new Error(data.message || "Please log in again.");
  }

  if (!response.ok) {
    throw new Error(data.message || `Request failed (${response.status})`);
  }

  return data;
}
