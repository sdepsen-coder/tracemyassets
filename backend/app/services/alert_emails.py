"""
The "new matches found" alert email.

The email deliberately carries only counts and a link to the dashboard,
never source URLs: Free-plan users must not see match sources (see
match_presentation), and an email is a place where that would leak.
"""

from __future__ import annotations

from html import escape

from app.core.config import settings
from app.services.email_service import send_email


def build_new_match_alert(
    *,
    asset_title: str,
    new_match_count: int,
) -> tuple[str, str, str]:
    """Returns (subject, html, text)."""
    noun = "match" if new_match_count == 1 else "matches"
    link = f"{settings.frontend_url}/matches"
    subject = f"{new_match_count} new possible {noun} for \"{asset_title}\""

    text = (
        f"TraceMyAssets found {new_match_count} new possible {noun} for "
        f"your artwork \"{asset_title}\".\n\n"
        f"Review {'it' if new_match_count == 1 else 'them'}: {link}\n\n"
        "Results are technical signals only and need your manual review.\n\n"
        "You get this email because monitoring is turned on for this "
        "artwork. You can turn it off in the artwork's Monitoring "
        "settings."
    )

    html = (
        "<div style=\"font-family:Arial,Helvetica,sans-serif;"
        "max-width:520px;line-height:1.5;color:#1a1a1a\">"
        f"<p>TraceMyAssets found <strong>{new_match_count} new possible "
        f"{noun}</strong> for your artwork "
        f"<strong>{escape(asset_title)}</strong>.</p>"
        f"<p><a href=\"{escape(link, quote=True)}\">Review "
        f"{'it' if new_match_count == 1 else 'them'} in your "
        "dashboard</a></p>"
        "<p style=\"color:#666;font-size:13px\">Results are technical "
        "signals only and need your manual review.</p>"
        "<p style=\"color:#666;font-size:13px\">You get this email "
        "because monitoring is turned on for this artwork. You can turn "
        "it off in the artwork's Monitoring settings.</p></div>"
    )

    return subject, html, text


def send_new_match_alert(
    *,
    to_email: str,
    asset_title: str,
    new_match_count: int,
) -> bool:
    subject, html, text = build_new_match_alert(
        asset_title=asset_title, new_match_count=new_match_count
    )

    return send_email(to=to_email, subject=subject, html=html, text=text)
