import csv
from pathlib import Path
from typing import Optional


class CredentialError(Exception):
    """Raised when authentication fails."""


class Authenticator:
    """
    Simple role-based authenticator backed by a CSV file.

    The CSV is expected to contain rows: role,email,password.
    The class is intentionally small to stay beginner-friendly while
    demonstrating encapsulation (private path) and file handling.
    """

    def __init__(self, role: str, users_file: Path | str | None = None) -> None:
        self._role = role
        self._users_file = Path(users_file) if users_file else Path(__file__).parent / "data" / "users.csv"
        self._users_file.parent.mkdir(parents=True, exist_ok=True)
        self._ensure_default_users()

    def _ensure_default_users(self) -> None:
        if self._users_file.exists():
            return

        default_rows = [
            ["admin", "admin@example.com", "admin123"],
            ["user", "user@example.com", "user123"],
            ["support", "support@example.com", "helpdesk"],
        ]

        with self._users_file.open("w", newline="", encoding="utf-8") as file:
            writer = csv.writer(file)
            writer.writerow(["role", "email", "password"])
            writer.writerows(default_rows)

    def authenticate(self, email: str, password: str) -> bool:
        """Return True if the email/password match the configured role."""
        try:
            with self._users_file.open("r", newline="", encoding="utf-8") as file:
                reader = csv.DictReader(file)
                for row in reader:
                    if row["role"] == self._role and row["email"] == email and row["password"] == password:
                        return True
        except FileNotFoundError as exc:  # pragma: no cover - defensive guard for learners
            raise CredentialError("User store is missing.") from exc
        return False

    def get_role(self) -> str:
        return self._role

    def find_user(self, email: str) -> Optional[str]:
        """Return the role for the given email if present."""
        try:
            with self._users_file.open("r", newline="", encoding="utf-8") as file:
                reader = csv.DictReader(file)
                for row in reader:
                    if row["email"] == email:
                        return row["role"]
        except FileNotFoundError:
            return None
        return None
