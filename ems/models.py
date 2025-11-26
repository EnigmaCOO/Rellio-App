from __future__ import annotations

import datetime as dt
from dataclasses import dataclass, field
from typing import List, Protocol


class RoleDescriber(Protocol):
    def describe_role(self) -> str:
        ...


class NotificationMixin:
    """Mixin to demonstrate multiple inheritance and polymorphic notifications."""

    def notify(self, message: str) -> str:
        return f"[Notification] {message}"


@dataclass
class User(RoleDescriber):
    name: str
    email: str

    def describe_role(self) -> str:  # dynamic polymorphism (overridden in subclasses)
        return "Base user"


@dataclass
class StandardUser(User):
    def describe_role(self) -> str:
        return "Standard mailbox user"


@dataclass
class AdminUser(User):
    privileges: List[str] = field(default_factory=lambda: ["create", "delete", "export"])

    def describe_role(self) -> str:
        return "Administrator"


@dataclass
class SeniorAdmin(AdminUser):
    def describe_role(self) -> str:
        return "Senior Administrator"


class SupportUser(NotificationMixin, AdminUser):
    """
    Hybrid inheritance: inherits from AdminUser (itself a subclass of User)
    and NotificationMixin.
    """

    def describe_role(self) -> str:
        return "Support desk administrator"


class Email:
    """Encapsulated email representation with validation."""

    def __init__(self, sender: User, recipient: str, subject: str, body: str, sent_at: dt.datetime | None = None) -> None:
        self.sender = sender  # association between User and Email
        self.recipient = recipient
        self.subject = subject
        self.body = body
        self._status = "unread"  # encapsulated attribute
        self.sent_at = sent_at or dt.datetime.now()

    @property
    def status(self) -> str:
        return self._status

    @status.setter
    def status(self, value: str) -> None:
        if value not in {"unread", "read"}:
            raise ValueError("Status must be either 'unread' or 'read'.")
        self._status = value

    def to_row(self) -> list[str]:
        return [
            self.sender.name,
            self.sender.email,
            self.recipient,
            self.subject,
            self.body,
            self.status,
            self.sent_at.isoformat(),
        ]

    @classmethod
    def from_row(cls, row: list[str], user_factory: RoleDescriber | None = None) -> "Email":
        name, email, recipient, subject, body, status, timestamp = row
        sender = StandardUser(name=name, email=email) if user_factory is None else user_factory  # type: ignore[assignment]
        email_obj = cls(sender=sender, recipient=recipient, subject=subject, body=body, sent_at=dt.datetime.fromisoformat(timestamp))
        email_obj.status = status
        return email_obj

    @staticmethod
    def format_recipients(primary: str, *cc: str) -> str:
        """
        Demonstrates static polymorphism via optional arguments (simple overloading).
        When called with only primary, returns it; with extras, joins them.
        """

        return ", ".join((primary, *cc))


class Mailbox:
    """Collection of Email objects demonstrating aggregation (lifetime is independent)."""

    def __init__(self, owner: User) -> None:
        self.owner = owner
        self._emails: list[Email] = []

    def add_email(self, email: Email) -> None:
        self._emails.append(email)

    def all(self) -> list[Email]:
        return list(self._emails)

    def unread(self) -> list[Email]:
        return [mail for mail in self._emails if mail.status == "unread"]

    def mark_read(self, email: Email) -> None:
        email.status = "read"
