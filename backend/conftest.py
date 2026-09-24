import pytest

from tests.contratto import ClientContratto


@pytest.fixture
def client_contratto():
    """`APIClient` che fa fallire il test se una risposta non rispetta `api/openapi.yaml`."""
    return ClientContratto()
