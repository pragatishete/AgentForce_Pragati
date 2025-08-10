# schemas.py
from pydantic import BaseModel

class SignupSchema(BaseModel):
    email: str
    password: str
    phone_number: str  # Add this line to include phone number

class LoginSchema(BaseModel):
    email: str
    password: str