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
// Downloads a file from a protected route. A normal link cannot send our login token.
async function apiDownload(path, fallbackName) {
  const token = localStorage.getItem("token");

  let response;
  try {
    response = await fetch(API_BASE + path, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  } catch (error) {
    throw new Error("Cannot reach the server. Is the backend running?");
  }

  if (response.status === 401) {
    localStorage.removeItem("token");
    window.location.href = "/pages/login.html";
    throw new Error("Please log in again.");
  }

  if (!response.ok) {
    let message = `Download failed (${response.status})`;
    try {
      message = (await response.json()).message || message;
    } catch (error) {
      // not JSON, keep the default message
    }
    throw new Error(message);
  }

  // The server names the file; use our own name if that header is missing
  const disposition = response.headers.get("Content-Disposition") || "";
  const match = disposition.match(/filename="?([^";]+)"?/i);
  const fileName = match ? match[1] : fallbackName;

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
