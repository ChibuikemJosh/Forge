# Graph-to-Python Deliverable 1

## Pipeline

```text
graph request
  → Pydantic schema validation
  → graph validation
  → stable dependency resolution
  → deterministic Python generation
  → ast.parse syntax validation
  → code preview response
```

The preview endpoint never executes generated code and never writes files.

## Example

```json
{
  "nodes": [
    {
      "id": "caller",
      "type": "function",
      "name": "find_products",
      "config": {
        "parameters": [
          {"name": "query", "type": "str"},
          {"name": "limit", "type": "int", "default": 10}
        ],
        "return_type": "list"
      },
      "inputs": [],
      "outputs": []
    },
    {
      "id": "callee",
      "type": "function",
      "name": "search_products",
      "config": {
        "parameters": [
          {"name": "query", "type": "str"},
          {"name": "limit", "type": "int", "default": 10}
        ],
        "return_type": "list"
      },
      "inputs": [],
      "outputs": []
    }
  ],
  "edges": [
    {"id": "caller-callee", "source": "caller", "target": "callee", "type": "calls"}
  ]
}
```

Representative output:

```python
def search_products(query: str, limit: int = 10) -> list:
    raise NotImplementedError("Implement search_products")

def find_products(query: str, limit: int = 10) -> list:
    return search_products(query, limit)
```

The callee is emitted first so the generated module has a stable, readable
dependency order. The generator does not infer a search algorithm from the
function name.

## Supported and rejected patterns

Supported:

- Function nodes;
- simple supported type names;
- acyclic graphs;
- a maximum of one `calls` edge per caller;
- matching caller/callee parameter names and types;
- optional explicit ports consistent with the Function configuration.

Rejected:

- `passes_input` and `returns_output` edges;
- missing or duplicate identities;
- invalid Python names;
- incompatible interfaces;
- self-calls and dependency cycles;
- unsupported node types or graph structures.

The frontend workspace demonstrates this contract but does not replace backend
validation.
