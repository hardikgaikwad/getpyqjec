"""
Latency benchmark for GetPYQJEC API endpoints (stdlib only).

Usage:
    python scripts/bench.py --base http://localhost:8000 --runs 30
    python scripts/bench.py --base https://staging.example --runs 30 --concurrency 4

Reports p50/p95/p99 per endpoint. The first request of each endpoint is
reported separately as "cold". Do not point this at production without
agreeing on it first.
"""

import argparse
import statistics
import time
import urllib.request
from concurrent.futures import ThreadPoolExecutor

DEFAULT_PATHS = [
    "/health/",
    "/subjects/?branch=CSE&semester=4",
    "/upload/?branch=CSE&semester=4&subject_code=CS42",
    "/download/links/?branch=CSE&semester=4&subject_code=all&from_year=2021&to_year=2023",
]


def timed_get(url):
    start = time.perf_counter()
    try:
        with urllib.request.urlopen(url, timeout=60) as res:
            res.read()
            status = res.status
    except urllib.error.HTTPError as e:
        status = e.code
    return (time.perf_counter() - start) * 1000, status


def percentile(values, pct):
    if not values:
        return float("nan")
    ordered = sorted(values)
    idx = min(len(ordered) - 1, max(0, round(pct / 100 * (len(ordered) - 1))))
    return ordered[idx]


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--base", default="http://localhost:8000")
    parser.add_argument("--runs", type=int, default=20)
    parser.add_argument("--concurrency", type=int, default=1)
    parser.add_argument("--path", action="append", help="Override endpoint paths")
    args = parser.parse_args()

    paths = args.path or DEFAULT_PATHS
    for path in paths:
        url = args.base.rstrip("/") + path
        cold_ms, cold_status = timed_get(url)
        with ThreadPoolExecutor(max_workers=args.concurrency) as pool:
            results = list(pool.map(timed_get, [url] * args.runs))
        warm = [ms for ms, _ in results]
        statuses = sorted({s for _, s in results} | {cold_status})
        print(
            f"{path}\n"
            f"  cold={cold_ms:.0f}ms  warm p50={percentile(warm, 50):.0f}ms "
            f"p95={percentile(warm, 95):.0f}ms p99={percentile(warm, 99):.0f}ms "
            f"mean={statistics.mean(warm):.0f}ms  statuses={statuses}"
        )


if __name__ == "__main__":
    main()
