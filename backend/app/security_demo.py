"""Controlled vulnerable and corrected FastAPI order-access example."""

from dataclasses import dataclass

from fastapi import APIRouter, Header, HTTPException

router = APIRouter(prefix="/api/demo", tags=["security-demo"])


@dataclass(frozen=True)
class DemoOrder:
    """An in-memory order used only by the security demonstration."""

    order_id: str
    owner_id: str
    total: int


ORDERS = {
    "order-alice": DemoOrder("order-alice", "customer-alice", 125),
    "order-bob": DemoOrder("order-bob", "customer-bob", 90),
}


def _authenticate_customer(customer_id: str | None) -> str:
    if not customer_id:
        raise HTTPException(status_code=401, detail="Authentication required.")
    return customer_id


def vulnerable_get_order(order_id: str, customer_id: str | None) -> DemoOrder:
    """Return an order after authentication but without ownership authorization."""
    _authenticate_customer(customer_id)
    order = ORDERS.get(order_id)
    if order is None:
        raise HTTPException(status_code=404, detail="Order not found.")
    return order


def secure_get_order(order_id: str, customer_id: str | None) -> DemoOrder:
    """Return an order only when the authenticated customer owns it."""
    authenticated_customer = _authenticate_customer(customer_id)
    order = ORDERS.get(order_id)
    if order is None:
        raise HTTPException(status_code=404, detail="Order not found.")
    if order.owner_id != authenticated_customer:
        raise HTTPException(status_code=403, detail="Order does not belong to customer.")
    return order


@router.get("/vulnerable/orders/{order_id}")
def vulnerable_order_endpoint(
    order_id: str,
    x_customer_id: str | None = Header(default=None),
) -> DemoOrder:
    """Demonstrate the vulnerable endpoint state."""
    return vulnerable_get_order(order_id, x_customer_id)


@router.get("/corrected/orders/{order_id}")
def corrected_order_endpoint(
    order_id: str,
    x_customer_id: str | None = Header(default=None),
) -> DemoOrder:
    """Demonstrate the corrected endpoint state."""
    return secure_get_order(order_id, x_customer_id)
