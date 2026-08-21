import json
from urllib.request import Request, urlopen


request = Request(
    "http://127.0.0.1:3000/api/parse-details",
    data=json.dumps({
        "text": "I should be able to make Sunday. Public transport over 45 minutes will not work, and I can confirm by Friday."
    }).encode("utf-8"),
    headers={"Content-Type": "application/json"},
    method="POST",
)

with urlopen(request, timeout=45) as response:
    payload = json.loads(response.read().decode("utf-8"))
    draft = payload.get("draft", {})
    assert response.status == 200
    assert draft.get("attendance") in {"attending", "uncertain", "cannot_attend", "not_specified"}
    assert isinstance(draft.get("summary"), str) and draft["summary"]

print("Live DeepSeek parsing smoke test passed")
