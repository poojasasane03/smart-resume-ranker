const API_BASE = "/api";

// One function that every page will use to talk to the backend
async function apiRequest(path, method = "GET", body = null) {
  const options = { method, headers: {} };

  // If the user is logged in, send their token with the request
  const token = localStorage.getItem("token");
  if (token) {
    options.headers["Authorization"] = `Bearer ${token}`;
  }

  // If we are sending data, tell the server it is JSON
  if (body) {
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

  if (!response.ok) {
    throw new Error(data.message || `Request failed (${response.status})`);
  }

  return data;
}
