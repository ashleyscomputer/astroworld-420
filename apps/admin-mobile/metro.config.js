const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// expo-sqlite Web uses a WASM build.
config.resolver.assetExts.push("wasm");

// expo-sqlite Web needs cross-origin isolation for SharedArrayBuffer.
const upstream = config.server.enhanceMiddleware;
config.server.enhanceMiddleware = (middleware, server) => {
  const next = upstream ? upstream(middleware, server) : middleware;
  return (req, res, nextMiddleware) => {
    res.setHeader("Cross-Origin-Embedder-Policy", "credentialless");
    res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
    return next(req, res, nextMiddleware);
  };
};

module.exports = config;
