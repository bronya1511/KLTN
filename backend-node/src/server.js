import http from "http";
import app from "./app.js";
import { env } from "./config/env.js";
import { initSocket } from "./sockets/live.js";
import { startAutoRecognizeJob } from "./jobs/autoRecognize.job.js";

const server = http.createServer(app);
initSocket(server);
startAutoRecognizeJob();

server.listen(env.PORT, () => {
  console.log(`[server] listening on http://127.0.0.1:${env.PORT}`);
});
