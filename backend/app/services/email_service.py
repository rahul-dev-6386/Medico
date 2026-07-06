import logging
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional

from app.core.config import settings

logger = logging.getLogger("email")
logger.setLevel(logging.INFO)


class EmailService:

    def __init__(self):
        self.host = settings.SMTP_HOST
        self.port = settings.SMTP_PORT
        self.user = settings.EMAIL_USER
        self.password = settings.EMAIL_APP_PASSWORD
        self.mail_from = settings.MAIL_FROM

    def send_email(self, to_email: str, subject: str, html_body: str, plain_body: str = "") -> bool:
        if not self.user or not self.password:
            logger.warning("Email credentials not configured — skipping send to %s", to_email)
            return False

        msg = MIMEMultipart("alternative")
        msg["From"] = self.mail_from
        msg["To"] = to_email
        msg["Subject"] = subject
        msg["List-Unsubscribe"] = "<mailto:support@sanjeevni.ai>"
        msg["Precedence"] = "bulk"
        msg["X-Auto-Response-Suppress"] = "OOF, AutoReply"

        if not plain_body:
            plain_body = f"Please view this email in an HTML-capable client.\n\n---\nSanjeevni AI"

        msg.attach(MIMEText(plain_body, "plain"))
        msg.attach(MIMEText(html_body, "html"))

        try:
            with smtplib.SMTP(self.host, self.port, timeout=30) as server:
                server.starttls()
                server.login(self.user, self.password)
                server.send_message(msg)
            logger.info("Email sent to %s — %s", to_email, subject)
            return True
        except smtplib.SMTPAuthenticationError:
            logger.error("SMTP authentication failed for %s — check EMAIL_APP_PASSWORD", self.user)
            return False
        except smtplib.SMTPException as e:
            logger.error("SMTP error sending to %s: %s", to_email, str(e))
            return False
        except Exception as e:
            logger.error("Failed to send email to %s: %s", to_email, str(e))
            return False

    def send_otp_email(self, to_email: str, otp: str, name: str) -> bool:
        subject = "Verify your email - Sanjeevni AI"
        html = self._otp_html(otp, name)
        plain = self._otp_plain(otp, name)
        return self.send_email(to_email, subject, html, plain)

    def send_welcome_email(self, to_email: str, name: str) -> bool:
        subject = "Welcome to Sanjeevni AI"
        html = self._welcome_html(name)
        plain = self._welcome_plain(name)
        return self.send_email(to_email, subject, html, plain)

    def send_password_reset(self, to_email: str, reset_token: str, name: str) -> bool:
        subject = "Reset your password - Sanjeevni AI"
        html = self._reset_html(reset_token, name)
        plain = self._reset_plain(reset_token, name)
        return self.send_email(to_email, subject, html, plain)

    # ── Plain-text versions ──

    def _otp_plain(self, otp: str, name: str) -> str:
        return f"""SANJEEVNI AI
{"─" * 48}

Verify your email

Hi {name},

Enter this code to verify your Sanjeevni AI account:

  {otp[0]}  {otp[1]}  {otp[2]}  {otp[3]}  {otp[4]}  {otp[5]}

This code expires in {settings.OTP_EXPIRY_MINUTES} minutes.

If you didn't request this, please ignore this email.

{"─" * 48}
Need help? Contact support@sanjeevni.ai

© 2025 Sanjeevni AI. All rights reserved.
123 Health Street, San Francisco, CA 94105

To unsubscribe or manage preferences, visit:
https://sanjeevni.ai/preferences"""

    def _welcome_plain(self, name: str) -> str:
        return f"""SANJEEVNI AI
{"─" * 48}

Welcome to Sanjeevni AI

Hi {name},

Your email has been verified. You now have full access to your AI-powered health companion.

FEATURES
  • Medical AI Assistant — Get instant answers to your health questions
  • AI Drug Consultant — Comprehensive drug information and interactions
  • Health Tracking — Monitor vitals, medications, sleep, and nutrition
  • Clinical Reports — Upload and analyze medical reports with AI insights

Get started: https://sanjeevni.ai/dashboard

{"─" * 48}
Need help? Contact support@sanjeevni.ai

© 2025 Sanjeevni AI. All rights reserved.
123 Health Street, San Francisco, CA 94105

To unsubscribe or manage preferences, visit:
https://sanjeevni.ai/preferences"""

    def _reset_plain(self, reset_token: str, name: str) -> str:
        return f"""SANJEEVNI AI
{"─" * 48}

Reset your password

Hi {name},

We received a request to reset your password. Use the code below to proceed:

  Reset code: {reset_token}

This code expires in 1 hour.

If you didn't request a password reset, please ignore this email.

{"─" * 48}
Need help? Contact support@sanjeevni.ai

© 2025 Sanjeevni AI. All rights reserved.
123 Health Street, San Francisco, CA 94105

To unsubscribe or manage preferences, visit:
https://sanjeevni.ai/preferences"""

    # ── HTML templates ──

    def _header_html(self) -> str:
        return """<table width="100%" cellpadding="0" cellspacing="0" style="margin:0 auto 32px auto;">
<tr><td style="text-align:center;">
<!-- Logo -->
<table cellpadding="0" cellspacing="0" style="margin:0 auto 8px auto;">
<tr>
<td style="width:40px;height:40px;border-radius:12px;background:linear-gradient(135deg,#34D399,#0EA5A9);text-align:center;vertical-align:middle;font-size:20px;line-height:40px;">
<span style="color:#fff;font-weight:700;">S</span>
</td>
<td style="padding-left:12px;vertical-align:middle;">
<span style="color:#F1F5F9;font-size:18px;font-weight:700;letter-spacing:-0.3px;">Sanjeevni AI</span>
</td>
</tr>
</table>
<p style="color:#64748B;font-size:12px;margin:0;">Your Intelligent Health Companion</p>
</td></tr>
</table>"""

    def _footer_html(self) -> str:
        return """<!-- Divider -->
<table width="100%" cellpadding="0" cellspacing="0">
<tr><td style="padding:0 0 16px 0;"><hr style="border:0;border-top:1px solid rgba(255,255,255,0.06);"></td></tr>
</table>
<!-- Help -->
<table width="100%" cellpadding="0" cellspacing="0">
<tr><td style="text-align:center;padding-bottom:20px;">
<p style="color:#94A3B8;font-size:12px;line-height:1.6;margin:0;">
Need help? <a href="mailto:support@sanjeevni.ai" style="color:#34D399;text-decoration:none;">support@sanjeevni.ai</a>
</p>
</td></tr>
</table>
<!-- Footer -->
<table width="100%" cellpadding="0" cellspacing="0">
<tr><td style="text-align:center;">
<p style="color:#475569;font-size:11px;line-height:1.6;margin:0 0 4px 0;">
Sanjeevni AI &mdash; Your Intelligent Health Companion
</p>
<p style="color:#334155;font-size:10px;line-height:1.6;margin:0 0 2px 0;">
123 Health Street, San Francisco, CA 94105
</p>
<p style="color:#334155;font-size:10px;line-height:1.6;margin:0;">
&copy; 2025 Sanjeevni AI. All rights reserved.
&nbsp;&bull;&nbsp;
<a href="https://sanjeevni.ai/unsubscribe" style="color:#64748B;text-decoration:underline;">Unsubscribe</a>
&nbsp;&bull;&nbsp;
<a href="https://sanjeevni.ai/privacy" style="color:#64748B;text-decoration:underline;">Privacy Policy</a>
</p>
</td></tr>
</table>"""

    def _otp_digit_box_html(self, otp: str) -> str:
        digits = "".join(
            f"""<td style="width:40px;height:48px;border:1px solid rgba(52,211,153,0.3);border-radius:10px;background:rgba(52,211,153,0.06);text-align:center;vertical-align:middle;font-size:22px;font-weight:700;color:#34D399;font-family:'Courier New','SF Mono',monospace;">{d}</td>"""
            for d in otp
        )
        return f"""<table cellpadding="0" cellspacing="0" style="margin:0 auto;">
<tr>{digits}</tr>
</table>"""

    def _otp_html(self, otp: str, name: str) -> str:
        return f"""<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="color-scheme" content="dark">
<meta name="supported-color-schemes" content="dark">
</head>
<body style="margin:0;padding:0;background-color:#090B10;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;">
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#090B10;padding:32px 16px;">
<tr><td align="center">
<table width="480" cellpadding="0" cellspacing="0" style="max-width:480px;width:100%;">

<!-- Header -->
<tr><td>{self._header_html()}</td></tr>

<!-- Main card -->
<tr><td style="background:linear-gradient(135deg,rgba(255,255,255,0.04) 0%,rgba(255,255,255,0.01) 100%);border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:40px 32px;">

<h1 style="color:#F1F5F9;font-size:22px;font-weight:600;margin:0 0 8px 0;letter-spacing:-0.3px;">Verify your email</h1>
<p style="color:#94A3B8;font-size:14px;line-height:1.6;margin:0 0 28px 0;">Hi {name},<br>Enter this verification code to activate your Sanjeevni AI account.</p>

<!-- OTP digit boxes -->
<div style="margin-bottom:28px;">
{self._otp_digit_box_html(otp)}
</div>

<!-- Expiry + ignore -->
<table width="100%" cellpadding="0" cellspacing="0">
<tr><td style="text-align:center;padding-bottom:4px;">
<span style="color:#94A3B8;font-size:12px;">This code expires in <strong style="color:#34D399;">{settings.OTP_EXPIRY_MINUTES} minutes</strong></span>
</td></tr>
<tr><td style="text-align:center;">
<span style="color:#64748B;font-size:12px;">If you didn't request this, please ignore this email.</span>
</td></tr>
</table>

</td></tr>

<!-- Footer -->
<tr><td style="padding-top:24px;">{self._footer_html()}</td></tr>

</table>
</td></tr>
</table>
</body>
</html>"""

    def _welcome_html(self, name: str) -> str:
        return f"""<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="color-scheme" content="dark">
<meta name="supported-color-schemes" content="dark">
</head>
<body style="margin:0;padding:0;background-color:#090B10;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;">
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#090B10;padding:32px 16px;">
<tr><td align="center">
<table width="480" cellpadding="0" cellspacing="0" style="max-width:480px;width:100%;">

<tr><td>{self._header_html()}</td></tr>

<tr><td style="background:linear-gradient(135deg,rgba(255,255,255,0.04) 0%,rgba(255,255,255,0.01) 100%);border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:40px 32px;">

<h1 style="color:#F1F5F9;font-size:22px;font-weight:600;margin:0 0 8px 0;letter-spacing:-0.3px;">Welcome to Sanjeevni AI</h1>
<p style="color:#94A3B8;font-size:14px;line-height:1.7;margin:0 0 28px 0;">Hi {name},<br><br>Your email has been verified. You now have full access to your AI-powered health companion.</p>

<!-- Features grid -->
<table width="100%" cellpadding="0" cellspacing="0">
<tr><td style="padding:14px 18px;background:rgba(14,165,169,0.04);border-radius:10px;margin-bottom:8px;display:block;">
<table cellpadding="0" cellspacing="0"><tr>
<td style="width:32px;vertical-align:top;font-size:16px;color:#34D399;">✦</td>
<td><strong style="color:#34D399;font-size:13px;">Medical AI Assistant</strong>
<p style="color:#64748B;font-size:12px;margin:4px 0 0 0;">Get instant answers to your health questions with evidence-based information.</p></td>
</tr></table>
</td></tr>
<tr><td style="padding:14px 18px;background:rgba(14,165,169,0.04);border-radius:10px;margin-bottom:8px;display:block;">
<table cellpadding="0" cellspacing="0"><tr>
<td style="width:32px;vertical-align:top;font-size:16px;color:#34D399;">✦</td>
<td><strong style="color:#34D399;font-size:13px;">AI Drug Consultant</strong>
<p style="color:#64748B;font-size:12px;margin:4px 0 0 0;">Comprehensive drug information, interactions, and clinical guidance.</p></td>
</tr></table>
</td></tr>
<tr><td style="padding:14px 18px;background:rgba(14,165,169,0.04);border-radius:10px;margin-bottom:8px;display:block;">
<table cellpadding="0" cellspacing="0"><tr>
<td style="width:32px;vertical-align:top;font-size:16px;color:#34D399;">✦</td>
<td><strong style="color:#34D399;font-size:13px;">Health Tracking</strong>
<p style="color:#64748B;font-size:12px;margin:4px 0 0 0;">Monitor vitals, medications, sleep, nutrition, and daily wellness metrics.</p></td>
</tr></table>
</td></tr>
<tr><td style="padding:14px 18px;background:rgba(14,165,169,0.04);border-radius:10px;display:block;">
<table cellpadding="0" cellspacing="0"><tr>
<td style="width:32px;vertical-align:top;font-size:16px;color:#34D399;">✦</td>
<td><strong style="color:#34D399;font-size:13px;">Clinical Reports</strong>
<p style="color:#64748B;font-size:12px;margin:4px 0 0 0;">Upload and analyze medical reports with AI-powered insights and health scores.</p></td>
</tr></table>
</td></tr>
</table>

</td></tr>

<tr><td style="padding-top:24px;">{self._footer_html()}</td></tr>

</table>
</td></tr>
</table>
</body>
</html>"""

    def _reset_html(self, reset_token: str, name: str) -> str:
        return f"""<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="color-scheme" content="dark">
<meta name="supported-color-schemes" content="dark">
</head>
<body style="margin:0;padding:0;background-color:#090B10;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;">
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#090B10;padding:32px 16px;">
<tr><td align="center">
<table width="480" cellpadding="0" cellspacing="0" style="max-width:480px;width:100%;">

<tr><td>{self._header_html()}</td></tr>

<tr><td style="background:linear-gradient(135deg,rgba(255,255,255,0.04) 0%,rgba(255,255,255,0.01) 100%);border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:40px 32px;">

<h1 style="color:#F1F5F9;font-size:22px;font-weight:600;margin:0 0 8px 0;letter-spacing:-0.3px;">Reset your password</h1>
<p style="color:#94A3B8;font-size:14px;line-height:1.6;margin:0 0 28px 0;">Hi {name},<br>We received a request to reset your Sanjeevni AI account password. Use the code below to proceed.</p>

<!-- Reset token box -->
<table cellpadding="0" cellspacing="0" style="margin:0 auto 28px auto;">
<tr>
<td style="padding:16px 28px;border:1px solid rgba(52,211,153,0.2);border-radius:10px;background:rgba(52,211,153,0.06);text-align:center;">
<span style="font-size:14px;font-weight:600;color:#34D399;font-family:'Courier New','SF Mono',monospace;letter-spacing:2px;">{reset_token}</span>
</td>
</tr>
</table>

<table width="100%" cellpadding="0" cellspacing="0">
<tr><td style="text-align:center;padding-bottom:4px;">
<span style="color:#94A3B8;font-size:12px;">This code expires in <strong style="color:#34D399;">1 hour</strong></span>
</td></tr>
<tr><td style="text-align:center;">
<span style="color:#64748B;font-size:12px;">If you didn't request a password reset, please ignore this email.</span>
</td></tr>
</table>

</td></tr>

<tr><td style="padding-top:24px;">{self._footer_html()}</td></tr>

</table>
</td></tr>
</table>
</body>
</html>"""


email_service = EmailService()
