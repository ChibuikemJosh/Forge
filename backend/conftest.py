"""Pytest configuration for the Forge backend.

An empty conftest at the backend root makes pytest insert the ``backend/``
directory into ``sys.path``, so ``app.main`` can be imported when running
``pytest`` from the ``backend`` directory.
"""
