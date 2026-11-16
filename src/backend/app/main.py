from typing import Any

from fastapi import FastAPI

from app.routes import config, health, identify, speakers

app = FastAPI(title="Thymbre")
app.include_router(health.router)
app.include_router(config.router)
app.include_router(speakers.router)
app.include_router(identify.router)


def _use_binary_format(node: Any) -> Any:
    """Swagger UI only offers a file picker for `format: binary`, not for contentMediaType."""
    if isinstance(node, dict):
        converted = {key: _use_binary_format(value) for key, value in node.items()}
        if converted.get("contentMediaType") == "application/octet-stream":
            del converted["contentMediaType"]
            converted["format"] = "binary"
        return converted
    if isinstance(node, list):
        return [_use_binary_format(item) for item in node]
    return node


_generate_openapi = app.openapi


def _openapi() -> dict[str, Any]:
    if app.openapi_schema is None:
        app.openapi_schema = _use_binary_format(_generate_openapi())
    return app.openapi_schema


app.openapi = _openapi
