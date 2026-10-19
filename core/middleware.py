import ipaddress
import logging
import time

from django.db import connection

logger = logging.getLogger("core.timing")

# Distinct proxy-header patterns already logged by this worker (bounded).
_proxy_shapes_seen = set()
_MAX_PROXY_SHAPES = 20
_CLIENT_IP_HEADERS = ("HTTP_CF_CONNECTING_IP", "HTTP_TRUE_CLIENT_IP", "HTTP_X_REAL_IP")


class ServerTimingMiddleware:
    """
    Adds a `Server-Timing` header (total + DB time and query count) to every
    response and logs one line per request, so latency can be inspected in
    browser devtools and Render logs without extra infrastructure.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        self._log_proxy_shape(request)

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
    def _log_proxy_shape(request):
        """
        Log each distinct proxy-header pattern once (hop count, which client-IP
        headers are present, whether the peer is a private address), to size
        DRF's NUM_PROXIES. Never logs IP addresses themselves.
        """
        if len(_proxy_shapes_seen) >= _MAX_PROXY_SHAPES:
            return
        xff = request.META.get("HTTP_X_FORWARDED_FOR", "")
        hops = len([h for h in xff.split(",") if h.strip()]) if xff else 0
        present = tuple(h[5:] for h in _CLIENT_IP_HEADERS if request.META.get(h))
        try:
            peer_private = ipaddress.ip_address(request.META.get("REMOTE_ADDR", "")).is_private
        except ValueError:
            peer_private = None
        shape = (hops, present, peer_private)
        if shape in _proxy_shapes_seen:
            return
        _proxy_shapes_seen.add(shape)
        logger.info(
            "Proxy shape: X-Forwarded-For hops=%d client_ip_headers=%s peer_private=%s path=%s",
            hops,
            ",".join(present) or "none",
            peer_private,
            request.path,
        )
