const fs = require("node:fs");
const path = require("node:path");
const express = require("express");

module.exports = (app, buildDirectory) => {
  const indexFile = path.join(buildDirectory, "index.html");
  if (!fs.existsSync(indexFile)) return false;

  app.use(express.static(buildDirectory));
  app.use((req, res, next) => {
    if (req.method !== "GET" || req.path.startsWith("/api/")) return next();
    res.sendFile(indexFile, (err) => {
      if (err) next(err);
    });
  });
  return true;
};
