import json
from urllib.error import HTTPError
from urllib.request import Request, urlopen


with urlopen("http://127.0.0.1:3000", timeout=20) as response:
    page = response.read().decode("utf-8")
    assert response.status == 200
    assert "ChoiceMesh" in page

request = Request(
    "http://127.0.0.1:3000/api/parse-details",
    data=json.dumps({"text": "I should be able to make Sunday."}).encode("utf-8"),
    headers={"Content-Type": "application/json"},
    method="POST",
)
try:
    urlopen(request, timeout=20)
    raise AssertionError("The API should reject a request when no server key is configured.")
except HTTPError as error:
    raw_body = error.read().decode("utf-8")
    if not raw_body:
        raise AssertionError(f"API returned HTTP {error.code} with an empty body")
    body = json.loads(raw_body)
    assert error.code == 503
    assert body == {
        "error": "The private-draft analysis is not configured on this deployment.",
        "code": "not_configured",
    }

print("HTTP smoke test passed")
