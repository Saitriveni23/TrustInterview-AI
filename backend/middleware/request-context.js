const crypto = require("crypto");

function requestContext(req, res, next) {
  const incoming = req.get("x-request-id");
  req.id = incoming && /^[A-Za-z0-9._-]{8,128}$/.test(incoming)
    ? incoming
    : crypto.randomUUID();
  res.set("x-request-id", req.id);
  const startedAt = Date.now();
  res.on("finish", () => {
    console.log(JSON.stringify({
      level: "info",
      event: "http_request",
      requestId: req.id,
      method: req.method,
      path: req.originalUrl,
      status: res.statusCode,
      durationMs: Date.now() - startedAt,
      uid: req.auth?.uid,
    }));
  });
  next();
}

module.exports = { requestContext };
