const functions = require("firebase-functions");
const app = require("../src/routes/server"); // ✅ correct path from functions/
exports.api = functions.https.onRequest(app);
