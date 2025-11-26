"""
Email Management System entry point.

Run with `python -m ems.app` to launch the Tkinter GUI.
The code is intentionally simple and heavily commented to match a 2nd semester
college project while demonstrating Python OOP pillars.
"""

from __future__ import annotations

from .gui import run_app


if __name__ == "__main__":
    run_app()
