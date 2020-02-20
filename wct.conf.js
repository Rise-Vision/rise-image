module.exports = {
  "verbose": true,
  "npm": true,
  "moduleResolution": "node",
  "plugins": {
    "local": {
      "browsers": [ "chrome" ]
    },
    "istanbul": {
      "reporters": [ "text", "text-summary", "lcov" ],
      "include": [
        "**/src/**/*.js"
      ],
      "exclude": [
        "**/test/**"
      ],
      "thresholds": {
        "global": {
          "branches": 90,
          "lines": 95,
          "functions": 90,
          "statements": 95
        }
      }
    }
  }
};
