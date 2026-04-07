export function errorHandler(err, _req, res, _next) {
  console.error(err);
  const code = err.status || 500;
  res.status(code).json({
    message: err.message || "Loi he thong",
    code
  });
}
