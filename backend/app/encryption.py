import base64
import json
from cryptography.fernet import Fernet
from app.config import settings


def get_encryption_key() -> bytes:
    """Get or generate encryption key"""
    key = settings.ENCRYPTION_KEY
    if key == "your-32-byte-encryption-key-base64-encoded":
        # Generate a new key if not set
        key = Fernet.generate_key()
        print(f"WARNING: Generated new encryption key. Set ENCRYPTION_KEY={key.decode()} in .env")
    else:
        # Ensure key is properly formatted
        if len(key) != 44:  # Base64 encoded 32-byte key
            # Generate from provided key
            key = base64.urlsafe_b64encode(key.encode()[:32].ljust(32, b'0'))
        else:
            key = key.encode()
    return key


def encrypt_data(data: dict) -> str:
    """Encrypt sensitive data"""
    key = get_encryption_key()
    f = Fernet(key)
    data_str = json.dumps(data)
    encrypted = f.encrypt(data_str.encode())
    return encrypted.decode()


def decrypt_data(encrypted_data: str) -> dict:
    """Decrypt sensitive data. Handles both encrypted and unencrypted data.
    
    Returns:
        dict: Decrypted data, or empty dict if decryption fails
    """
    if not encrypted_data:
        return {}
    
    # First, try to decrypt as encrypted data (Fernet format)
    try:
        key = get_encryption_key()
        f = Fernet(key)
        # Handle both string and bytes input
        if isinstance(encrypted_data, bytes):
            encrypted_bytes = encrypted_data
        else:
            encrypted_bytes = encrypted_data.encode()
        decrypted = f.decrypt(encrypted_bytes)
        return json.loads(decrypted.decode())
    except Exception as decrypt_error:
        # If decryption fails, try to parse as plain JSON (for backward compatibility)
        # This handles cases where:
        # 1. Data was stored unencrypted (legacy data)
        # 2. Data was encrypted with a different key
        try:
            # Try parsing as plain JSON string
            if isinstance(encrypted_data, str):
                parsed = json.loads(encrypted_data)
                # If it's a dict, return it (might be unencrypted legacy data)
                if isinstance(parsed, dict):
                    print(f"Warning: Found unencrypted data (legacy format). Consider re-encrypting.")
                    return parsed
                return {}
            else:
                parsed = json.loads(encrypted_data.decode())
                if isinstance(parsed, dict):
                    return parsed
                return {}
        except (json.JSONDecodeError, AttributeError, UnicodeDecodeError) as json_error:
            # If both fail, log detailed error information
            error_type = type(decrypt_error).__name__
            data_preview = str(encrypted_data)[:100] if encrypted_data else "None"
            print(f"Decryption failed: {error_type} - {str(decrypt_error)[:200]}")
            print(f"JSON parse also failed: {type(json_error).__name__} - {str(json_error)[:200]}")
            print(f"Data preview (first 100 chars): {data_preview}")
            print(f"Data length: {len(str(encrypted_data)) if encrypted_data else 0}")
            # Return empty dict instead of raising to prevent API errors
            return {}

