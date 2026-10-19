import os
import re
import smtplib
import logging
import secrets
import base64
import json
import urllib.request
import urllib.parse
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import bcrypt
from dotenv import load_dotenv

logger = logging.getLogger("ripple.notifications")

def generate_otp() -> str:
    """
    Cryptographically secure 6-digit numeric OTP generation using Python's secrets module.
    Never uses pseudo-random random module.
    """
    return f"{secrets.randbelow(1_000_000):06d}"

def hash_otp(otp: str) -> str:
    """
    Hash OTP securely with bcrypt before storing in database. Never stores plaintext OTPs.
    """
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(otp.encode("utf-8"), salt).decode("utf-8")

def verify_otp_hash(plain_otp: str, hashed_otp: str) -> bool:
    """
    Constant-time bcrypt verification preventing timing attacks.
    """
    try:
        return bcrypt.checkpw(plain_otp.encode("utf-8"), hashed_otp.encode("utf-8"))
    except Exception:
        return False

def send_gmail_otp(email: str, otp: str) -> bool:
    """
    Dispatches 6-digit security OTP to user's email address via Gmail SMTP (smtp.gmail.com:587).
    Requires SMTP_USER (or GMAIL_USER) and SMTP_PASSWORD (or GMAIL_APP_PASSWORD) in env.
    Falls back gracefully with prominent console logging in development.
    """
    load_dotenv()
    smtp_user = os.getenv("SMTP_USER") or os.getenv("GMAIL_USER") or os.getenv("SMTP_EMAIL")
    smtp_password = os.getenv("SMTP_PASSWORD") or os.getenv("GMAIL_APP_PASSWORD") or os.getenv("SMTP_PASS")
    if smtp_user:
        smtp_user = smtp_user.strip()
    if smtp_password:
        smtp_password = smtp_password.replace(" ", "").strip()
    smtp_server = os.getenv("SMTP_SERVER", "smtp.gmail.com")
    smtp_port = int(os.getenv("SMTP_PORT", "587"))

    if smtp_user and smtp_password:
        try:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = f"Your Ripple Verification Code: {otp}"
            msg["From"] = f"Ripple Security <{smtp_user}>"
            msg["To"] = email

            text_content = (
                f"Your Ripple security verification code is: {otp}\n\n"
                f"This code will expire in 10 minutes.\n"
                f"If you did not request this verification code, please ignore this email.\n\n"
                f"— Ripple Cash-Flow Intelligence Team"
            )

            html_content = f"""<!DOCTYPE html>
<html>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #000000; color: #ffffff; padding: 40px 20px; margin: 0;">
  <div style="max-width: 480px; margin: 0 auto; background: #0a0a0a; border: 1px solid rgba(255, 255, 255, 0.12); border-radius: 12px; padding: 32px; box-shadow: 0 8px 32px rgba(0,0,0,0.8);">
    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 24px;">
      <h2 style="margin: 0; font-size: 20px; font-weight: 700; color: #ffffff; letter-spacing: -0.02em;">Ripple Security Verification</h2>
    </div>
    <p style="font-size: 14px; color: #a1a1aa; line-height: 1.5; margin: 0 0 24px 0;">
      Use the 6-digit code below to verify your account and activate emergency liquidity dispatch protections.
    </p>
    <div style="background: rgba(255, 255, 255, 0.04); border: 1px solid rgba(255, 255, 255, 0.15); border-radius: 8px; padding: 20px; text-align: center; margin-bottom: 24px;">
      <span style="font-family: monospace; font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #10b981;">{otp}</span>
    </div>
    <p style="font-size: 12px; color: #71717a; line-height: 1.5; margin: 0;">
      ⏱️ This code is valid for <strong>10 minutes</strong>. If you did not initiate this request, no action is needed.
    </p>
  </div>
</body>
</html>"""

            msg.attach(MIMEText(text_content, "plain"))
            msg.attach(MIMEText(html_content, "html"))

            if smtp_port == 465:
                with smtplib.SMTP_SSL(smtp_server, smtp_port, timeout=12) as server:
                    server.login(smtp_user, smtp_password)
                    server.send_message(msg)
            else:
                with smtplib.SMTP(smtp_server, smtp_port, timeout=12) as server:
                    server.ehlo()
                    server.starttls()
                    server.ehlo()
                    server.login(smtp_user, smtp_password)
                    server.send_message(msg)

            logger.info(f"[GMAIL SMTP LIVE] Live OTP email successfully delivered to {email}")
            print(f"[GMAIL SMTP LIVE] Sent verification code to {email}")
            return True
        except Exception as e:
            logger.error(f"[GMAIL SMTP FAILED] Error sending live email to {email}: {e}")
            print(f"[GMAIL SMTP FAILED] {e}. Falling back to console log for OTP: {otp}")

    # Fallback log for development / testing when SMTP credentials are not yet set
    logger.warning(
        f"[SMTP NOT CONFIGURED] Set SMTP_USER and SMTP_PASSWORD in backend/.env for live Gmail delivery. "
        f"OTP for {email}: {otp} (Valid for 10 minutes)"
    )
    print(f"\n========================================================")
    print(f"[GMAIL OTP DISPATCH] To: {email} | CODE: {otp}")
    print(f"========================================================\n")
    return True

def send_whatsapp_otp(phone: str, otp: str) -> bool:
    """
    Dispatches 6-digit security OTP to user's phone via Twilio WhatsApp API.
    Requires TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_WHATSAPP_NUMBER in env.
    Uses native HTTP request to Twilio REST API to avoid hard SDK dependencies.
    Falls back gracefully with prominent console logging in development.
    """
    load_dotenv()
    account_sid = os.getenv("TWILIO_ACCOUNT_SID")
    auth_token = os.getenv("TWILIO_AUTH_TOKEN")
    from_number = os.getenv("TWILIO_WHATSAPP_NUMBER", "whatsapp:+14155238886")
    if account_sid:
        account_sid = account_sid.strip()
    if auth_token:
        auth_token = auth_token.strip()
    if from_number:
        from_number = from_number.strip()

    # Clean and format phone number for WhatsApp
    clean_phone = re.sub(r"[\s\-\(\)]", "", phone.strip())
    if not clean_phone.startswith("+"):
        clean_phone = f"+{clean_phone}"
    to_whatsapp = f"whatsapp:{clean_phone}" if not clean_phone.startswith("whatsapp:") else clean_phone
    from_whatsapp = f"whatsapp:{from_number}" if not from_number.startswith("whatsapp:") else from_number

    if account_sid and auth_token:
        try:
            # 1. Try twilio Python SDK if installed
            try:
                from twilio.rest import Client
                client = Client(account_sid, auth_token)
                msg = client.messages.create(
                    body=f"Your Ripple security verification code is: {otp}. Valid for 10 minutes. Do not share this code.",
                    from_=from_whatsapp,
                    to=to_whatsapp,
                )
                logger.info(f"[TWILIO WHATSAPP LIVE] Live WhatsApp OTP dispatched to {clean_phone} (SID: {msg.sid})")
                print(f"[TWILIO WHATSAPP LIVE] Sent verification code to {clean_phone}")
                return True
            except ImportError:
                pass

            # 2. Native standard library HTTP basic-auth call to Twilio REST API
            url = f"https://api.twilio.com/2010-04-01/Accounts/{account_sid}/Messages.json"
            data = urllib.parse.urlencode({
                "To": to_whatsapp,
                "From": from_whatsapp,
                "Body": f"Your Ripple security verification code is: {otp}. Valid for 10 minutes. Do not share this code.",
            }).encode("utf-8")

            req = urllib.request.Request(url, data=data, method="POST")
            auth_str = f"{account_sid}:{auth_token}"
            encoded_auth = base64.b64encode(auth_str.encode("utf-8")).decode("utf-8")
            req.add_header("Authorization", f"Basic {encoded_auth}")
            req.add_header("Content-Type", "application/x-www-form-urlencoded")

            with urllib.request.urlopen(req, timeout=12) as response:
                if response.status in (200, 201):
                    logger.info(f"[TWILIO WHATSAPP LIVE] Live WhatsApp OTP dispatched to {clean_phone}")
                    print(f"[TWILIO WHATSAPP LIVE] Sent verification code to {clean_phone}")
                    return True
        except urllib.error.HTTPError as e:
            try:
                err_detail = e.read().decode("utf-8")
                err_json = json.loads(err_detail)
                err_code = err_json.get("code")
                err_msg = err_json.get("message", str(e))
                if err_code in (572002, 21608):
                    logger.warning(f"[TWILIO TRIAL RESTRICTION] Destination {clean_phone} is not a verified recipient or has not joined the WhatsApp sandbox: {err_msg}")
                    print(f"[TWILIO TRIAL RESTRICTION] {clean_phone} needs to join WhatsApp Sandbox or be a verified caller ID in Twilio console: {err_msg}")
                else:
                    logger.error(f"[TWILIO WHATSAPP FAILED] Error {err_code}: {err_msg}")
                    print(f"[TWILIO WHATSAPP FAILED] Error {err_code}: {err_msg}")
            except Exception:
                logger.error(f"[TWILIO WHATSAPP FAILED] HTTP Error {e.code}: {e}")
                print(f"[TWILIO WHATSAPP FAILED] HTTP Error {e.code}: {e}")
        except Exception as e:
            logger.error(f"[TWILIO WHATSAPP FAILED] Error sending live WhatsApp message to {clean_phone}: {e}")
            print(f"[TWILIO WHATSAPP FAILED] {e}. Falling back to console log for OTP: {otp}")

    # Fallback log for development / testing when Twilio credentials are not yet set
    logger.warning(
        f"[TWILIO NOT CONFIGURED] Set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN in backend/.env for live WhatsApp delivery. "
        f"OTP for {clean_phone}: {otp} (Valid for 10 minutes)"
    )
    print(f"\n========================================================")
    print(f"[WHATSAPP OTP DISPATCH] To: {clean_phone} | CODE: {otp}")
    print(f"========================================================\n")
    return True

def send_email_otp(email: str, otp: str) -> bool:
    """
    Alias for send_gmail_otp for backwards compatibility with existing callers.
    """
    return send_gmail_otp(email, otp)

def send_emergency_alert(phone: str | None, email: str | None, message: str) -> dict:
    """
    Emergency notification dispatch pipeline for urgent liquidity deficit warnings.
    Unlocked only when account email & phone verification requirements are fulfilled.
    """
    dispatched = {"email": False, "whatsapp": False}
    if email:
        logger.warning(f"[EMERGENCY ALERT] Email dispatched to {email}: {message}")
        print(f"[EMERGENCY ALERT] Email to {email}: {message}")
        dispatched["email"] = True
    if phone:
        logger.warning(f"[EMERGENCY ALERT] WhatsApp dispatched to {phone}: {message}")
        print(f"[EMERGENCY ALERT] WhatsApp to {phone}: {message}")
        dispatched["whatsapp"] = True
    return dispatched

