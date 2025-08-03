import os
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from pathlib import Path
from dotenv import load_dotenv
from uuid import UUID
import logging

logger = logging.getLogger(__name__)

# Load environment variables from .env file in the same directory (src/api/.env)
env_path = Path(__file__).parent / '.env'
if env_path.exists():
    load_dotenv(dotenv_path=env_path)
    logger.info(f"Loaded environment variables from {env_path}")
else:
    logger.warning(f"API .env file not found at {env_path}. JWT verification might fail.")


# --- Configuration ---
SECRET_KEY = os.getenv("SUPABASE_JWT_SECRET")
ALGORITHM = "HS256"  # Supabase uses HS256 for JWT signing

if not SECRET_KEY:
    logger.error("CRITICAL: SUPABASE_JWT_SECRET environment variable not set. Authentication will fail.")
    # You might want to raise an exception here to prevent the app from starting without the secret
    # raise ValueError("SUPABASE_JWT_SECRET is not set.")

# --- Reusable Security Scheme ---
token_scheme = HTTPBearer()

# --- Authentication Dependency ---
async def get_current_user_id(credentials: HTTPAuthorizationCredentials = Depends(token_scheme)) -> UUID:
    """
    Dependency function to verify the JWT token and extract the user ID.

    Args:
        credentials: The HTTP Authorization credentials (Bearer token).

    Returns:
        str: The verified user ID (UUID string).

    Raises:
        HTTPException: 
            - 401 Unauthorized if the token is missing, invalid, or expired.
            - 403 Forbidden if the token is valid but doesn't contain a user ID.
    """
    logger.debug("get_current_user_id: Attempting to authenticate request.") # Log entry
    if credentials is None:
        logger.warning("get_current_user_id: No credentials provided.")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication credentials were not provided",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    token = credentials.credentials
    logger.debug(f"get_current_user_id: Received token starting with: {token[:10]}...") # Log token prefix
    
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    forbidden_exception = HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Token is missing user information",
    )

    try:
        if not SECRET_KEY:
             # Re-check in case it wasn't loaded initially but is needed now
             logger.error("SUPABASE_JWT_SECRET is missing, cannot verify token.")
             raise credentials_exception
             
        # Decode the JWT token
        payload = jwt.decode(
            token, 
            SECRET_KEY, 
            algorithms=[ALGORITHM],
            options={"verify_aud": False}
            # Supabase standard JWTs don't always require audience/issuer validation on backend
            # If needed, add options: options={"verify_aud": False, "verify_iss": False}
            # Or provide expected audience/issuer: audience="your_audience", issuer="your_issuer"
        )
        
        # Extract the user ID (subject claim)
        user_id: str = payload.get("sub")
        if user_id is None:
            logger.warning(f"get_current_user_id: Token payload missing 'sub' (user ID): {payload}")
            raise forbidden_exception
            
        # You could potentially add more validation here, e.g., check `exp` claim, `aud`, `role`
        return UUID(user_id) # Return the user ID (UUID string)
        
    except jwt.ExpiredSignatureError:
        logger.info("Token validation failed: Expired signature")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except JWTError as e:
        logger.warning(f"Token validation failed: {e}")
        raise credentials_exception 