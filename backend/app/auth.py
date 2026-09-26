"""Verify the same HS256 session cookie the Next.js app issues."""

import jwt
from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.config import Settings, get_settings
from app.errors import ForbiddenError

_bearer = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer),
    settings: Settings = Depends(get_settings),
) -> str:
    if credentials is None or not credentials.credentials:
        raise ForbiddenError("Sign in before using this resource.")
    try:
        payload = jwt.decode(
            credentials.credentials,
            settings.jwt_secret(),
            algorithms=["HS256"],
        )
    except jwt.PyJWTError as exc:
        raise ForbiddenError("The session token is invalid or expired.") from exc
    user_id = payload.get("userId")
    if not isinstance(user_id, str) or not user_id:
        raise ForbiddenError("The session token has no user id.")
    return user_id
