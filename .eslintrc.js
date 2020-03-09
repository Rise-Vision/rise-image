module.exports = {
  "env": {
    "browser": true,
    "es6": true,
    "node": true
  },
  "extends": [
    "eslint:recommended"
  ],
  "parserOptions": {
    "sourceType": "module"
  },
  "rules": {
    "quotes": [
      "error",
      "double"
    ],
    "newline-after-var": [
      "error",
      "always"
    ]
  },
  "globals": {
    "RisePlayerConfiguration": false
  }
};
