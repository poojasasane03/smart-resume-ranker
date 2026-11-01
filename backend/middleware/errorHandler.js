// Runs when no route matched the request
function notFound(req, res) {
  res.status(404).json({ message: "Route not found" });
}

// Runs whenever any controller passes an error with next(error)
// Express knows it is an error handler because it has FOUR parameters
function errorHandler(err, req, res, next) {
  let status = err.statusCode || err.status || 500;
  let message = err.message || "Server error";

  if (err.type === "entity.parse.failed") {
    status = 400;
    message = "Invalid JSON in request body";
  } else if (err.name === "CastError") {
    status = 400;
    message = "Invalid id";
  } else if (err.name === "ValidationError") {
    status = 400;
    message = Object.values(err.errors)
      .map((e) => e.message)
      .join(" ");
  } else if (err.code === 11000) {
    status = 409;
    message = "An account with this email already exists.";
  }

  if (status === 500) {
    console.error(err); // full details only in our terminal
    message = "Something went wrong on the server";
  }

  res.status(status).json({ message });
}

module.exports = { notFound, errorHandler };
