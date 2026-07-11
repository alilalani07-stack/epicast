import logging
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from typing import Literal

from auth import verify_token, firebase_ready

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/auth", tags=["Auth"])


class ClaimRoleRequest(BaseModel):
    role: Literal["authority", "clinic"] = Field(...)


@router.post("/claim-role")
async def claim_role(payload: ClaimRoleRequest, token_data: dict = Depends(verify_token)):
    """
    Bind a role to the calling account, ONCE. Call this immediately after
    a new account is created (see frontend register() flow). Refuses to
    overwrite an existing role claim — prevents an already-registered user
    from re-calling this to escalate/switch their own role.
    """
    uid = token_data.get("uid")
    if not uid:
        raise HTTPException(status_code=401, detail="Could not identify user.")

    existing_role = token_data.get("role")
    if existing_role:
        raise HTTPException(
            status_code=403,
            detail=f"This account is already registered as '{existing_role}'.",
        )

    if not firebase_ready:
        # Dev bypass mode: no real Firebase project configured, so there's
        # no claims store to write to. Nothing to persist — this is fine
        # for local demo use, but role separation genuinely cannot be
        # tested end-to-end until GOOGLE_APPLICATION_CREDENTIALS is set.
        logger.warning(f"claim-role called in bypass mode for uid={uid} — no-op.")
        return {"role": payload.role, "persisted": False}

    from firebase_admin import auth as fb_auth
    fb_auth.set_custom_user_claims(uid, {"role": payload.role})
    logger.info(f"Role '{payload.role}' claimed for uid={uid}.")
    return {"role": payload.role, "persisted": True}


@router.get("/me")
async def get_me(token_data: dict = Depends(verify_token)):
    """Return the caller's verified identity, including their real role."""
    return {
        "uid": token_data.get("uid"),
        "email": token_data.get("email"),
        "role": token_data.get("role"),  # None if never claimed
    }
