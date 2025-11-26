from __future__ import annotations

import tkinter as tk
from pathlib import Path
from tkinter import messagebox

from .auth import Authenticator, CredentialError
from .models import AdminUser, Email, Mailbox, SeniorAdmin, StandardUser, SupportUser
from .storage import CsvEmailRepository, EmailManager, TextAuditLogger


class EmailManagementGUI:
    """Beginner-friendly Tkinter GUI for the Email Management System."""

    def __init__(self, root: tk.Tk) -> None:
        self.root = root
        root.title("Email Management System (EMS)")
        root.geometry("700x500")

        self.authenticator = Authenticator("user")
        self.current_user = None
        self.mailbox = None
        self.manager = None

        self._build_login_frame()

    def _build_login_frame(self) -> None:
        self.login_frame = tk.Frame(self.root, padx=12, pady=12)
        self.login_frame.pack(fill=tk.BOTH, expand=True)

        tk.Label(self.login_frame, text="Login", font=("Arial", 16, "bold")).grid(row=0, column=0, columnspan=2, pady=10)
        tk.Label(self.login_frame, text="Role (admin/user/support)").grid(row=1, column=0, sticky="w")
        tk.Label(self.login_frame, text="Email").grid(row=2, column=0, sticky="w")
        tk.Label(self.login_frame, text="Password").grid(row=3, column=0, sticky="w")

        self.role_var = tk.StringVar(value="user")
        self.email_entry = tk.Entry(self.login_frame)
        self.password_entry = tk.Entry(self.login_frame, show="*")

        tk.Entry(self.login_frame, textvariable=self.role_var).grid(row=1, column=1, sticky="ew")
        self.email_entry.grid(row=2, column=1, sticky="ew")
        self.password_entry.grid(row=3, column=1, sticky="ew")

        login_btn = tk.Button(self.login_frame, text="Login", command=self._handle_login)
        login_btn.grid(row=4, column=0, columnspan=2, pady=10)

        for i in range(2):
            self.login_frame.columnconfigure(i, weight=1)

    def _build_dashboard(self) -> None:
        self.login_frame.destroy()

        self.dashboard = tk.Frame(self.root, padx=12, pady=12)
        self.dashboard.pack(fill=tk.BOTH, expand=True)

        header = tk.Label(self.dashboard, text=f"Welcome {self.current_user.describe_role()}", font=("Arial", 14, "bold"))
        header.pack(anchor="w", pady=(0, 8))

        # Compose area (composition example: GUI composed of manager + models)
        compose_frame = tk.LabelFrame(self.dashboard, text="Compose Email", padx=8, pady=8)
        compose_frame.pack(fill=tk.X, pady=8)

        tk.Label(compose_frame, text="To:").grid(row=0, column=0, sticky="w")
        tk.Label(compose_frame, text="Subject:").grid(row=1, column=0, sticky="w")
        tk.Label(compose_frame, text="Body:").grid(row=2, column=0, sticky="nw")

        self.to_entry = tk.Entry(compose_frame)
        self.subject_entry = tk.Entry(compose_frame)
        self.body_text = tk.Text(compose_frame, height=4)

        self.to_entry.grid(row=0, column=1, sticky="ew")
        self.subject_entry.grid(row=1, column=1, sticky="ew")
        self.body_text.grid(row=2, column=1, sticky="ew")

        send_btn = tk.Button(compose_frame, text="Send", command=self._send_email)
        send_btn.grid(row=3, column=0, columnspan=2, pady=6)

        compose_frame.columnconfigure(1, weight=1)

        # Mailbox view
        mailbox_frame = tk.LabelFrame(self.dashboard, text="Inbox", padx=8, pady=8)
        mailbox_frame.pack(fill=tk.BOTH, expand=True)

        self.listbox = tk.Listbox(mailbox_frame)
        self.listbox.pack(fill=tk.BOTH, expand=True)
        self.listbox.bind("<<ListboxSelect>>", self._mark_selected_read)

        export_btn = tk.Button(self.dashboard, text="Export Summary", command=self._export_summary)
        export_btn.pack(pady=(8, 0))

        # Load existing emails into UI
        for mail in self.manager.load_existing():
            self._insert_mail(mail)

    def _handle_login(self) -> None:
        role = self.role_var.get().strip()
        email = self.email_entry.get().strip()
        password = self.password_entry.get().strip()

        try:
            self.authenticator = Authenticator(role)
        except Exception as exc:  # pragma: no cover - defensive for invalid paths
            messagebox.showerror("Error", f"Failed to prepare authenticator: {exc}")
            return

        if not self.authenticator.authenticate(email, password):
            messagebox.showerror("Login failed", "Email or password is wrong")
            return

        # Choose a user class depending on role to demonstrate inheritance
        if role == "admin":
            user = AdminUser(name="Admin", email=email)
        elif role == "support":
            user = SupportUser(name="Support", email=email)
        else:
            user = StandardUser(name="User", email=email)

        # Multilevel demonstration: promote an admin to senior after successful login
        self.current_user = SeniorAdmin(user.name, user.email) if isinstance(user, AdminUser) and role == "admin" else user

        self.mailbox = Mailbox(owner=self.current_user)
        self.manager = EmailManager(self.mailbox, CsvEmailRepository(), TextAuditLogger())

        self._build_dashboard()

    def _send_email(self) -> None:
        if not self.manager or not self.current_user:
            return

        recipient = self.to_entry.get().strip()
        subject = self.subject_entry.get().strip()
        body = self.body_text.get("1.0", tk.END).strip()

        if not recipient or not subject:
            messagebox.showwarning("Missing data", "Recipient and subject are required.")
            return

        try:
            email = Email(sender=self.current_user, recipient=recipient, subject=subject, body=body)
            self.manager.send_email(email)
            self._insert_mail(email)
            self.body_text.delete("1.0", tk.END)
            messagebox.showinfo("Success", "Email stored in CSV and inbox.")
        except Exception as exc:
            messagebox.showerror("Error", f"Could not send email: {exc}")

    def _insert_mail(self, email: Email) -> None:
        display = f"{email.sent_at:%Y-%m-%d %H:%M} | {email.subject} -> {email.recipient} [{email.status}]"
        self.listbox.insert(tk.END, display)

    def _mark_selected_read(self, _event: tk.Event) -> None:
        if not self.manager or not self.mailbox:
            return
        selection = self.listbox.curselection()
        if not selection:
            return
        index = selection[0]
        try:
            email = self.mailbox.all()[index]
        except IndexError:
            return
        self.manager.mark_read(email)
        self.listbox.delete(index)
        self.listbox.insert(index, f"{email.sent_at:%Y-%m-%d %H:%M} | {email.subject} -> {email.recipient} [read]")

    def _export_summary(self) -> None:
        if not self.manager:
            return
        destination = Path(__file__).parent / "data" / "inbox_summary.txt"
        self.manager.export_summary(destination)
        messagebox.showinfo("Exported", f"Summary saved to {destination}")


def run_app() -> None:
    root = tk.Tk()
    EmailManagementGUI(root)
    root.mainloop()


if __name__ == "__main__":
    run_app()
