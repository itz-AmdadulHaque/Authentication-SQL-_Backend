// handling asycn operation and error, now we don't need to use try...catch
const asyncHandler = (requestHandler) => {
  return (req, res, next) => {
    Promise.resolve(requestHandler(req, res, next)).catch((err) => next(err));
  };
};


export { asyncHandler };
