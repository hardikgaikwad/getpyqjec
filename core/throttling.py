from rest_framework.throttling import ScopedRateThrottle


class ClientScopedRateThrottle(ScopedRateThrottle):
    """
    ScopedRateThrottle that identifies anonymous clients by Cloudflare's
    CF-Connecting-IP header.

    On Render, requests arrive through Cloudflare and Render's internal load
    balancer, so REMOTE_ADDR is always a private proxy address. Cloudflare sets
    CF-Connecting-IP to the visitor's address and overwrites any client-supplied
    value. Requests without it (e.g. Render's internal health checks, local
    development) fall back to REMOTE_ADDR. Authenticated users are throttled by
    user id (ScopedRateThrottle's default behaviour).
    """

    def get_ident(self, request):
        client_ip = request.META.get("HTTP_CF_CONNECTING_IP", "").strip()
        if client_ip:
            return client_ip
        return request.META.get("REMOTE_ADDR", "")
