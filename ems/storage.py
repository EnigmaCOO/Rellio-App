from __future__ import annotations

import csv
from abc import ABC, abstractmethod
from pathlib import Path
from typing import Iterable, List

from .models import Email, Mailbox, User


class EmailRepository(ABC):
    """Abstraction for storing emails."""

    @abstractmethod
    def save(self, email: Email) -> None:
        raise NotImplementedError

    @abstractmethod
    def load_all(self) -> list[Email]:
        raise NotImplementedError

    @abstractmethod
    def mark_read(self, email: Email) -> None:
        raise NotImplementedError


class CsvEmailRepository(EmailRepository):
    def __init__(self, csv_file: Path | str | None = None) -> None:
        self._csv_file = Path(csv_file) if csv_file else Path(__file__).parent / "data" / "emails.csv"
        self._csv_file.parent.mkdir(parents=True, exist_ok=True)
        self._ensure_header()

    def _ensure_header(self) -> None:
        if not self._csv_file.exists():
            with self._csv_file.open("w", newline="", encoding="utf-8") as file:
                writer = csv.writer(file)
                writer.writerow(["sender_name", "sender_email", "recipient", "subject", "body", "status", "sent_at"])

    def save(self, email: Email) -> None:
        with self._csv_file.open("a", newline="", encoding="utf-8") as file:
            writer = csv.writer(file)
            writer.writerow(email.to_row())

    def load_all(self) -> list[Email]:
        emails: list[Email] = []
        with self._csv_file.open("r", newline="", encoding="utf-8") as file:
            reader = csv.reader(file)
            next(reader, None)  # skip header
            for row in reader:
                if not row:
                    continue
                emails.append(Email.from_row(row))
        return emails

    def mark_read(self, email: Email) -> None:
        rows = []
        try:
            with self._csv_file.open("r", newline="", encoding="utf-8") as file:
                rows = list(csv.reader(file))
        except FileNotFoundError:
            return

        header = rows[0] if rows else []
        updated_rows = [header]
        for row in rows[1:]:
            if (
                len(row) >= 7
                and row[1] == email.sender.email
                and row[3] == email.subject
                and row[4] == email.body
            ):
                row[5] = "read"
            updated_rows.append(row)

        with self._csv_file.open("w", newline="", encoding="utf-8") as file:
            writer = csv.writer(file)
            writer.writerows(updated_rows)


class TextAuditLogger:
    """Writes simple audit entries to a TXT file."""

    def __init__(self, log_file: Path | str | None = None) -> None:
        self._log_file = Path(log_file) if log_file else Path(__file__).parent / "data" / "audit_log.txt"
        self._log_file.parent.mkdir(parents=True, exist_ok=True)

    def log(self, message: str) -> None:
        try:
            with self._log_file.open("a", encoding="utf-8") as file:
                file.write(message + "\n")
        except OSError:
            # Keep the educational script simple: swallow logging failures.
            pass


class EmailManager:
    """
    Orchestrates sending and reading emails.

    Demonstrates composition: this class is composed of a repository and logger.
    """

    def __init__(self, mailbox: Mailbox, repository: EmailRepository, logger: TextAuditLogger) -> None:
        self.mailbox = mailbox
        self.repository = repository
        self.logger = logger

    def send_email(self, email: Email) -> None:
        self.mailbox.add_email(email)
        self.repository.save(email)
        self.logger.log(f"Sent to {email.recipient}: {email.subject}")

    def load_existing(self) -> List[Email]:
        existing = self.repository.load_all()
        for email in existing:
            self.mailbox.add_email(email)
        return existing

    def mark_read(self, email: Email) -> None:
        self.mailbox.mark_read(email)
        self.repository.mark_read(email)
        self.logger.log(f"Marked read: {email.subject}")

    def export_summary(self, destination: Path) -> None:
        """Export a friendly TXT summary of emails."""
        lines: Iterable[str] = (
            f"From {mail.sender.email} to {mail.recipient}: {mail.subject} [{mail.status}]" for mail in self.mailbox.all()
        )
        try:
            with destination.open("w", encoding="utf-8") as file:
                for line in lines:
                    file.write(line + "\n")
        except OSError:
            self.logger.log("Failed to export summary")
