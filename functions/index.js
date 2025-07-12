const functions = require("firebase-functions");
const app = require("../backend/server"); // ✅ correct path from functions/
exports.api = functions.https.onRequest(app);
