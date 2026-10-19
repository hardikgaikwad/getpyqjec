import logging
import time

from django.db import connection

logger = logging.getLogger("core.timing")

_proxy_shape_logged = False


class ServerTimingMiddleware:
    """
    Adds a `Server-Timing` header (total + DB time and query count) to every
    response and logs one line per request, so latency can be inspected in
    browser devtools and Render logs without extra infrastructure.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        self._log_proxy_shape_once(request)

        db_stats = {"time": 0.0, "count": 0}

        def _db_timer(execute, sql, params, many, context):
            start = time.perf_counter()
            try:
                return execute(sql, params, many, context)
            finally:
                db_stats["time"] += time.perf_counter() - start
                db_stats["count"] += 1

        start = time.perf_counter()
        with connection.execute_wrapper(_db_timer):
            response = self.get_response(request)
        total_ms = (time.perf_counter() - start) * 1000
        db_ms = db_stats["time"] * 1000

        response["Server-Timing"] = (
            f'total;dur={total_ms:.1f}, '
            f'db;dur={db_ms:.1f};desc="{db_stats["count"]} queries"'
        )
        logger.info(
            "%s %s %s total=%.1fms db=%.1fms queries=%d",
            request.method,
            request.path,
            response.status_code,
            total_ms,
            db_ms,
            db_stats["count"],
        )
        return response

    @staticmethod
    def _log_proxy_shape_once(request):
        """Log how many hops X-Forwarded-For carries, to size DRF's NUM_PROXIES."""
        global _proxy_shape_logged
        if _proxy_shape_logged:
            return
        _proxy_shape_logged = True
        xff = request.META.get("HTTP_X_FORWARDED_FOR", "")
        hops = len([h for h in xff.split(",") if h.strip()]) if xff else 0
        logger.info("Proxy shape: X-Forwarded-For hops=%d", hops)
