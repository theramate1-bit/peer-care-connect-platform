import re
import sys
from urllib.parse import urljoin

import requests


def fetch(url: str) -> requests.Response:
    return requests.get(
        url,
        timeout=30,
        headers={
            "User-Agent": "Theramate-security-check/1.0 (+https://theramate.co.uk/)",
        },
    )


def main() -> int:
    base_url = "https://theramate.co.uk/"
    homepage = fetch(base_url)
    print(f"[home] status={homepage.status_code} content-type={homepage.headers.get('content-type')} len={len(homepage.content)}")
    homepage.raise_for_status()

    html = homepage.text
    script_srcs = re.findall(r'<script[^>]+src="([^"]+\.js)"', html)
    script_srcs = [urljoin(base_url, s) for s in script_srcs]
    script_srcs = list(dict.fromkeys(script_srcs))  # de-dupe preserving order

    print(f"[home] discovered {len(script_srcs)} script(s)")
    for s in script_srcs:
        print(f"  - {s}")

    if not script_srcs:
        print("[warn] no JS scripts found on homepage (site may be serving a minimal shell)")
        return 2

    secret_like = re.compile(r"\b(?:sk|rk)_(?:live|test)_[0-9A-Za-z]{10,}\b")
    found_any = False

    for url in script_srcs:
        r = fetch(url)
        ct = r.headers.get("content-type")
        print(f"[js] {url} status={r.status_code} content-type={ct} len={len(r.content)}")
        if r.status_code != 200:
            continue

        text = r.text
        matches = sorted(set(secret_like.findall(text)))
        if matches:
            found_any = True
            print(f"[match] {url} -> {len(matches)} potential key(s)")
            for m in matches:
                # Don’t print full secrets to stdout/logs; redact for safety.
                redacted = m[:10] + "…" + m[-6:]
                print(f"  - {redacted}")

    print("[result] potential Stripe secrets found" if found_any else "[result] no Stripe-like secrets found in discovered scripts")
    return 0 if not found_any else 1


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except requests.RequestException as e:
        print(f"[error] request failed: {e}", file=sys.stderr)
        raise

