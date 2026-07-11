import os
import logging
from fastapi import HTTPException, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger(__name__)

security = HTTPBearer(auto_error=False)

_firebase_ready = False

# Only initialize Firebase Admin if credentials are available.
# In local development without a service account, the backend operates in
# bypass mode so developers can test the full API without a GCP project.
if os.environ.get("GOOGLE_APPLICATION_CREDENTIALS"):
    try:
        import firebase_admin
        from firebase_admin import credentials, auth as fb_auth
        project_id = os.environ.get("GOOGLE_CLOUD_PROJECT", "epicast-d711a")
        firebase_admin.initialize_app(options={"projectId": project_id})
        _firebase_ready = True
        logger.info(f"✅ Firebase Admin initialized (project: {project_id}).")
    except Exception as e:
        logger.error(f"Firebase Admin init failed: {e}")
else:
    logger.warning(
        "⚠️  GOOGLE_APPLICATION_CREDENTIALS not set — "
        "Firebase token verification is DISABLED. "
        "Set ENV=production to block unauthenticated requests."
    )


async def verify_token(
    credentials: HTTPAuthorizationCredentials = Security(security),
):
    """
    Verify the Firebase ID token sent in the Authorization header.

    Bypass logic (development only):
      • If GOOGLE_APPLICATION_CREDENTIALS is not set, bypass is automatic.
      • If SKIP_AUTH=true is set and ENV != production, bypass is explicit.
      • In production (ENV=production), a missing/invalid token always → 401.

    Returns a dict with at least {"uid": str} on success/bypass.
    """
    is_production = os.environ.get("ENV") == "production"
    skip_auth_flag = os.environ.get("SKIP_AUTH", "false").lower() == "true"

    # ── Production: strict — no bypass allowed ─────────────────────────────
    if is_production:
        if not credentials:
            raise HTTPException(status_code=401, detail="Authorization header required.")
        if not _firebase_ready:
            raise HTTPException(
                status_code=503,
                detail="Auth service not configured. Set GOOGLE_APPLICATION_CREDENTIALS.",
            )
        try:
            from firebase_admin import auth as fb_auth
            return fb_auth.verify_id_token(credentials.credentials)
        except Exception as e:
            logger.error(f"Token verification failed: {e}")
            raise HTTPException(status_code=401, detail="Invalid authentication credentials.")

    # ── Development: bypass when Firebase is not configured ────────────────
    if not _firebase_ready or skip_auth_flag:
        # Support structured demo tokens: e.g. "demo.clinic.uid" or "demo.authority.uid"
        raw = credentials.credentials if credentials else ""
        role = "authority"
        uid = "dev_user"
        if raw.startswith("demo."):
            parts = raw.split(".")
            if len(parts) >= 3:
                role = parts[1]
                uid = parts[2]
            elif len(parts) == 2:
                uid = parts[1]
        else:
            uid = raw or "dev_user"
            
        logger.debug(f"Auth bypass — uid='{uid}', role='{role}' (Firebase not configured or SKIP_AUTH=true).")
        return {"uid": uid, "email": f"{uid}@epicast.local", "role": role}

    # ── Development with real Firebase credentials configured ──────────────
    if not credentials:
        raise HTTPException(status_code=401, detail="Authorization header required.")
    try:
        from firebase_admin import auth as fb_auth
        return fb_auth.verify_id_token(credentials.credentials)
    except Exception as e:
        logger.error(f"Token verification failed: {e}")
        raise HTTPException(status_code=401, detail="Invalid authentication credentials.")
