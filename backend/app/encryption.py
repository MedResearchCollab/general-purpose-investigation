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
    """Decrypt sensitive data"""
    key = get_encryption_key()
    f = Fernet(key)
    decrypted = f.decrypt(encrypted_data.encode())
    return json.loads(decrypted.decode())

