import http from "k6/http";
import { check, sleep } from "k6";

export const options = {
  stages: [
    { duration: "30s", target: 20 },
    { duration: "60s", target: 20 },
    { duration: "30s", target: 0 },
  ],
  thresholds: {
    http_req_failed: ["rate<0.01"],
    http_req_duration: ["p(95)<750"],
  },
};

const baseUrl = __ENV.BASE_URL || "http://localhost";

export default function () {
  const response = http.get(`${baseUrl}/api/health/live`, {
    headers: { "X-Request-ID": `k6-${__VU}-${__ITER}` },
  });
  check(response, { "health is 200": (result) => result.status === 200 });
  sleep(0.25);
}
