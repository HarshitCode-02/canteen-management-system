const helmet = require("helmet");

module.exports = helmet({
  contentSecurityPolicy: {
    directives: {
      imgSrc: ["'self'", "https:"],
    },
  },
});
