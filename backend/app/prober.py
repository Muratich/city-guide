"""Small external HTTP probe for the City Guide API."""

import logging
import os
import time
from urllib.error import URLError
from urllib.request import Request, urlopen

from prometheus_client import Gauge, start_http_server

logging.basicConfig(level=os.getenv("LOG_LEVEL", "INFO"))
logger = logging.getLogger("cityguide-prober")

TARGET_URL = os.getenv("PROBE_TARGET_URL", "http://api:8000/health")
INTERVAL_SECONDS = float(os.getenv("PROBE_INTERVAL_SECONDS", "15"))
TIMEOUT_SECONDS = float(os.getenv("PROBE_TIMEOUT_SECONDS", "3"))
METRICS_PORT = int(os.getenv("PROBE_METRICS_PORT", "8001"))

probe_success = Gauge(
    "cityguide_probe_success",
    "Whether the latest external API probe succeeded (1) or failed (0).",
)
probe_duration = Gauge(
    "cityguide_probe_duration_seconds",
    "Duration of the latest external API probe in seconds.",
)


def probe_once() -> None:
    started_at = time.monotonic()
    succeeded = False
    try:
        request = Request(TARGET_URL, headers={"User-Agent": "cityguide-prober/1.0"})
        with urlopen(request, timeout=TIMEOUT_SECONDS) as response:
            succeeded = 200 <= response.status < 400
    except (OSError, URLError, TimeoutError) as error:
        logger.warning("Probe failed for %s: %s", TARGET_URL, error)
    finally:
        probe_duration.set(time.monotonic() - started_at)
        probe_success.set(1 if succeeded else 0)


def main() -> None:
    start_http_server(METRICS_PORT)
    logger.info("Probing %s every %s seconds", TARGET_URL, INTERVAL_SECONDS)
    while True:
        probe_once()
        time.sleep(INTERVAL_SECONDS)


if __name__ == "__main__":
    main()
