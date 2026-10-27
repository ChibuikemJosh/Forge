"""Health check endpoint for the Forge backend."""

from fastapi import APIRouter

router = APIRouter(prefix="/api", tags=["health"])


@router.get("/health")
def get_health() -> dict[str, str]:
    """Return service health metadata. Kept deliberately minimal."""
    return {"status": "ok", "service": "forge-api"}
