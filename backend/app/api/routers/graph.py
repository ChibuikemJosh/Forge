"""Graph validation and deterministic Python preview endpoints."""

from fastapi import APIRouter, HTTPException, status

from app.schemas.graph import Graph, GraphPreviewResponse, ValidationResult
from app.services.code_generation import CodeGenerationError, generate_python
from app.services.graph_validation import validate_graph

router = APIRouter(prefix="/api/graph", tags=["graph"])


@router.post("/validate", response_model=ValidationResult)
def validate_graph_endpoint(graph: Graph) -> ValidationResult:
    """Validate a submitted graph without generating or writing code."""
    return validate_graph(graph)


@router.post("/preview", response_model=GraphPreviewResponse)
def preview_graph_endpoint(graph: Graph) -> GraphPreviewResponse:
    """Validate a graph and return generated Python only when it is valid."""
    validation = validate_graph(graph)
    if not validation.valid:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"message": "Graph validation failed.", "validation": validation.model_dump()},
        )
    try:
        code = generate_python(graph)
    except CodeGenerationError as error:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"message": str(error)},
        ) from error
    return GraphPreviewResponse(code=code)
