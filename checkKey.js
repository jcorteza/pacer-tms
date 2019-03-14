const randomToken = require("random-token").create(
    "abcdefghijklmnopqrstuvwxzyABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
);

function checkKeys(batchObject) {
    const token = randomToken(10);
    const keys = Object.keys(batchObject);
    // eslint-disable-next-line curly
    if (!keys.includes(token)) return token;
    return checkKeys(batchObject);
}

module.exports = checkKeys;
