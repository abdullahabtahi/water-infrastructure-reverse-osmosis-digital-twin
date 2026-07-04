"""Oceanus platform-healthcheck — minimal Cloud Run service (Feature 009 deploy-path proof).

Stdlib only, no dependencies. Listens on $PORT (Cloud Run's contract) and returns
200 {"status": "ok"} for any request. Not a permanent product surface — it exists solely to
prove infra/scripts/deploy_service.sh works end-to-end before any real feature has code
(see specs/009-cloud-platform/research.md §7).
"""

import json
import os
from http.server import BaseHTTPRequestHandler, HTTPServer


class HealthcheckHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        body = json.dumps({"status": "ok"}).encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, format, *args):  # noqa: A002 - quiet, structured-log-friendly
        pass


def main() -> None:
    port = int(os.environ.get("PORT", "8080"))
    server = HTTPServer(("0.0.0.0", port), HealthcheckHandler)  # noqa: S104 - Cloud Run requires binding all interfaces
    server.serve_forever()


if __name__ == "__main__":
    main()
