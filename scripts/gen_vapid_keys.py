"""Generate a VAPID key pair for Web Push reminders (run once).

Usage (from the project root, venv active):
    python scripts/gen_vapid_keys.py

Prints VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY (base64url, no padding).
Paste them into .env locally and as Railway Variables. Keep the private
key secret — never commit it, never share it.
"""
import base64
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from pywebpush import Vapid


def _b64(raw: bytes) -> str:
    return base64.urlsafe_b64encode(raw).rstrip(b"=").decode()


def main():
    v = Vapid()
    v.generate_keys()
    priv = v.private_key.private_numbers().private_value.to_bytes(32, "big")
    pubn = v.public_key.public_numbers()
    pub = b"\x04" + pubn.x.to_bytes(32, "big") + pubn.y.to_bytes(32, "big")
    print("VAPID_PUBLIC_KEY=" + _b64(pub))
    print("VAPID_PRIVATE_KEY=" + _b64(priv))
    print("\nPaste both lines into .env (local) and Railway Variables.")


if __name__ == "__main__":
    main()
