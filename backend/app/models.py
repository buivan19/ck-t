from datetime import datetime
from enum import Enum

from sqlalchemy import Column, Integer, String, Float, DateTime, Enum as SQLEnum, ForeignKey, Boolean
from sqlalchemy.orm import relationship

from .database import Base

class UserRole(str, Enum):
    admin = "admin"
    doctor = "doctor"
    engineer = "engineer"

class DeviceStatus(str, Enum):
    normal = "normal"
    device_error = "device_error"

class AlertStatus(str, Enum):
    unread = "unread"
    read = "read"
    resolved = "resolved"

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(SQLEnum(UserRole), nullable=False)
    alerts = relationship("Alert", back_populates="user", cascade="all, delete-orphan")

class Device(Base):
    __tablename__ = "devices"
    id = Column(Integer, primary_key=True, index=True)
    device_id = Column(String, unique=True, index=True, nullable=False)
    status = Column(SQLEnum(DeviceStatus), default=DeviceStatus.normal, nullable=False)
    location = Column(String, nullable=True)
    model = Column(String, nullable=True)
    last_active = Column(DateTime, default=datetime.utcnow)
    sensor_data = relationship("SensorData", back_populates="device", cascade="all, delete-orphan")
    alerts = relationship("Alert", back_populates="device", cascade="all, delete-orphan")

class SensorData(Base):
    __tablename__ = "sensor_data"
    id = Column(Integer, primary_key=True, index=True)
    device_id = Column(Integer, ForeignKey("devices.id"), nullable=False)
    temperature = Column(Float, nullable=False)
    humidity = Column(Float, nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False)
    device = relationship("Device", back_populates="sensor_data")

class Alert(Base):
    __tablename__ = "alerts"
    id = Column(Integer, primary_key=True, index=True)
    type = Column(String, nullable=False)  # e.g., TEMP_WARNING, HUMIDITY_WARNING, DEVICE_ERROR
    message = Column(String, nullable=False)
    status = Column(SQLEnum(AlertStatus), default=AlertStatus.unread, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)  # targeted user
    device_id = Column(Integer, ForeignKey("devices.id"), nullable=True)
    user = relationship("User", back_populates="alerts")
    device = relationship("Device", back_populates="alerts")
