from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field, validator

# ------------------- User Schemas -------------------

class UserBase(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)

class UserCreate(UserBase):
    password: str = Field(..., min_length=6)
    role: str = Field(..., regex="^(admin|doctor|engineer)$")

class UserOut(UserBase):
    id: int
    role: str

    class Config:
        orm_mode = True

# ------------------- Token Schemas -------------------

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"

class TokenData(BaseModel):
    username: Optional[str] = None
    role: Optional[str] = None

# ------------------- Device Schemas -------------------

class DeviceBase(BaseModel):
    device_id: str
    location: Optional[str] = None
    model: Optional[str] = None

class DeviceCreate(DeviceBase):
    pass

class DeviceUpdate(BaseModel):
    status: Optional[str] = None
    location: Optional[str] = None
    model: Optional[str] = None

class DeviceOut(DeviceBase):
    id: int
    status: str
    last_active: datetime

    class Config:
        orm_mode = True

# ------------------- Sensor Data Schemas -------------------

class SensorDataBase(BaseModel):
    device_id: str
    temperature: float
    humidity: float
    timestamp: Optional[datetime] = None

    @validator("temperature")
    def temp_range(cls, v):
        # Allow any realistic float, validation later in logic
        return v

    @validator("humidity")
    def humidity_range(cls, v):
        return v

class SensorDataCreate(SensorDataBase):
    pass

class SensorDataOut(SensorDataBase):
    id: int

    class Config:
        orm_mode = True

# ------------------- Alert Schemas -------------------

class AlertBase(BaseModel):
    type: str
    message: str
    status: Optional[str] = "unread"
    user_id: Optional[int] = None
    device_id: Optional[int] = None

class AlertCreate(AlertBase):
    pass

class AlertOut(AlertBase):
    id: int
    created_at: datetime

    class Config:
        orm_mode = True

# ------------------- Admin User Management -------------------

class UserRoleUpdate(BaseModel):
    role: str = Field(..., regex="^(admin|doctor|engineer)$")

class UserPasswordUpdate(BaseModel):
    password: str = Field(..., min_length=6)
