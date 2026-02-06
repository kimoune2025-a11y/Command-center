from fastapi import FastAPI, APIRouter, Depends, HTTPException, status, UploadFile, File, Form, Query, BackgroundTasks
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import jwt
from passlib.context import CryptContext
import shutil
import json

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Configuration
JWT_SECRET = os.environ.get('JWT_SECRET', 'cvln-command-center-secret-key-2024')
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24
SESSION_TIMEOUT_MINUTES = 30

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# File upload directory
UPLOAD_DIR = ROOT_DIR / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)
BACKUP_DIR = ROOT_DIR / "backups"
BACKUP_DIR.mkdir(exist_ok=True)

app = FastAPI(title="CVLN Command Center API v1.2 - Conglomerate Mode")
api_router = APIRouter(prefix="/api")
security = HTTPBearer()

# ============== ENTITIES (Conglomerate Structure) ==============
ENTITIES = [
    {"id": "cvln-holding", "name": "CVLN Holding", "type": "holding", "color": "#D4AF37"},
    {"id": "factory-maker", "name": "Factory Maker Studio", "type": "studio", "color": "#8B5CF6"},
    {"id": "culture-connect", "name": "Culture Connect", "type": "agency", "color": "#3B82F6"},
    {"id": "cvl-events", "name": "CVL Events", "type": "events", "color": "#F59E0B"},
    {"id": "cvl-agro", "name": "CVL Agro", "type": "agriculture", "color": "#10B981"},
    {"id": "cvl-culinary", "name": "CVL Culinary", "type": "food", "color": "#EF4444"},
    {"id": "cvl-academy", "name": "CVL Academy", "type": "education", "color": "#EC4899"},
    {"id": "frek", "name": "FREK", "type": "brand", "color": "#6366F1"},
    {"id": "cip", "name": "CIP", "type": "investment", "color": "#14B8A6"},
    {"id": "hospitality", "name": "Hospitality", "type": "hospitality", "color": "#F97316"},
    {"id": "tokenomics", "name": "Tokenomics", "type": "blockchain", "color": "#A855F7"},
    {"id": "umbrella-trust", "name": "Umbrella Trust", "type": "trust", "color": "#64748B"},
]

PROJECT_CATEGORIES = ["Music", "Events", "Tech", "Agro", "Admin", "Other"]
TASK_STATUSES = ["backlog", "in_progress", "waiting", "done"]
RISK_TYPES = ["financial", "legal", "operations", "reputation", "technology"]
CONTACT_STAGES = ["prospect", "engaged", "negotiation", "contracted", "inactive"]
CONTACT_TYPES = ["sponsor", "institution", "artist", "press", "legal", "bank", "partner", "investor"]

# ============== MODELS ==============

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str
    role: str = "viewer"

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    role: str
    created_at: str
    last_activity: Optional[str] = None

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse
    expires_at: str

# Entity Response
class EntityResponse(BaseModel):
    id: str
    name: str
    type: str
    color: str

# Project Models
class ProjectCreate(BaseModel):
    name: str
    description: Optional[str] = ""
    status: str = "planning"
    deadline: Optional[str] = None
    team_members: List[str] = []
    budget: float = 0.0
    category: str = "Other"
    parent_id: Optional[str] = None
    entity_id: str  # Required - must belong to an entity

class ProjectResponse(BaseModel):
    id: str
    name: str
    description: str
    status: str
    deadline: Optional[str]
    team_members: List[str]
    budget: float
    category: str
    parent_id: Optional[str]
    entity_id: str
    created_by: str
    created_at: str
    progress: Optional[float] = 0.0
    version: int = 1

# Task Models
class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = ""
    priority: str = "medium"
    status: str = "backlog"
    deadline: Optional[str] = None
    assigned_to: Optional[str] = None
    project_id: Optional[str] = None
    entity_id: Optional[str] = None
    depends_on: List[str] = []
    is_recurring: bool = False
    recurrence_pattern: Optional[str] = None
    recurrence_end: Optional[str] = None

class TaskResponse(BaseModel):
    id: str
    title: str
    description: str
    priority: str
    status: str
    deadline: Optional[str]
    assigned_to: Optional[str]
    project_id: Optional[str]
    entity_id: Optional[str]
    depends_on: List[str]
    is_recurring: bool
    recurrence_pattern: Optional[str]
    recurrence_end: Optional[str]
    created_by: str
    created_at: str
    is_blocked: Optional[bool] = False
    is_overdue: Optional[bool] = False

# Decision Log Models
class DecisionCreate(BaseModel):
    date: str
    title: str
    entity_id: str
    project_id: Optional[str] = None
    owner: str
    rationale: str
    options_considered: List[str] = []
    chosen_option: str
    expected_impact: str
    follow_up_actions: List[str] = []
    attached_docs: List[str] = []
    is_strategic: bool = False

class DecisionResponse(BaseModel):
    id: str
    date: str
    title: str
    entity_id: str
    project_id: Optional[str]
    owner: str
    rationale: str
    options_considered: List[str]
    chosen_option: str
    expected_impact: str
    follow_up_actions: List[str]
    attached_docs: List[str]
    is_strategic: bool
    created_by: str
    created_at: str

# Risk Register Models
class RiskCreate(BaseModel):
    entity_id: str
    project_id: Optional[str] = None
    title: str
    description: Optional[str] = ""
    risk_type: str
    likelihood: int = 3  # 1-5
    impact: int = 3  # 1-5
    mitigation_plan: str = ""
    owner: str
    due_date: Optional[str] = None
    status: str = "open"  # open, mitigating, resolved, accepted

class RiskResponse(BaseModel):
    id: str
    entity_id: str
    project_id: Optional[str]
    title: str
    description: str
    risk_type: str
    likelihood: int
    impact: int
    risk_score: int  # likelihood * impact
    mitigation_plan: str
    owner: str
    due_date: Optional[str]
    status: str
    created_by: str
    created_at: str

# Contact Models (CRM Upgraded)
class ContactCreate(BaseModel):
    name: str
    email: Optional[str] = ""
    phone: Optional[str] = ""
    company: Optional[str] = ""
    type: str = "partner"
    stage: str = "prospect"
    notes: Optional[str] = ""
    relationship_tags: List[str] = []
    priority: int = 3
    last_interaction: Optional[str] = None
    next_followup: Optional[str] = None
    entity_id: Optional[str] = None

class ContactResponse(BaseModel):
    id: str
    name: str
    email: str
    phone: str
    company: str
    type: str
    stage: str
    notes: str
    relationship_tags: List[str]
    priority: int
    last_interaction: Optional[str]
    next_followup: Optional[str]
    entity_id: Optional[str]
    days_since_interaction: Optional[int] = None
    created_by: str
    created_at: str

# Finance Models
class FinanceCreate(BaseModel):
    type: str
    category: str
    amount: float
    description: Optional[str] = ""
    project_id: Optional[str] = None
    entity_id: Optional[str] = None
    sponsor_id: Optional[str] = None
    date: Optional[str] = None

class FinanceResponse(BaseModel):
    id: str
    type: str
    category: str
    amount: float
    description: str
    project_id: Optional[str]
    entity_id: Optional[str]
    sponsor_id: Optional[str]
    date: str
    created_by: str
    created_at: str
    version: int = 1

# Event Models
class EventCreate(BaseModel):
    title: str
    description: Optional[str] = ""
    date: str
    end_date: Optional[str] = None
    location: Optional[str] = ""
    checklist: List[Dict[str, Any]] = []
    project_id: Optional[str] = None
    entity_id: Optional[str] = None
    status: str = "upcoming"
    staff: List[str] = []
    equipment: List[Dict[str, Any]] = []
    event_budget: float = 0.0

class EventResponse(BaseModel):
    id: str
    title: str
    description: str
    date: str
    end_date: Optional[str]
    location: str
    checklist: List[Dict[str, Any]]
    project_id: Optional[str]
    entity_id: Optional[str]
    status: str
    staff: List[str]
    equipment: List[Dict[str, Any]]
    event_budget: float
    days_until: Optional[int] = None
    created_by: str
    created_at: str

# Audit Log Models
class AuditLogResponse(BaseModel):
    id: str
    user_id: str
    user_name: str
    action: str  # create, edit, delete, login, export, view
    module: str
    record_id: Optional[str]
    timestamp: str
    previous_value: Optional[Dict[str, Any]]
    new_value: Optional[Dict[str, Any]]
    ip_address: Optional[str] = None
    reason: Optional[str] = None

# Notification Models
class NotificationResponse(BaseModel):
    id: str
    type: str
    severity: str  # info, warning, critical
    title: str
    message: str
    entity_type: Optional[str]
    entity_id: Optional[str]
    created_at: str
    is_read: bool = False
    user_id: Optional[str] = None

# Activity Timeline Models
class ActivityResponse(BaseModel):
    id: str
    project_id: str
    type: str  # task_created, edit, budget_change, document_upload, comment
    description: str
    user_id: str
    user_name: str
    timestamp: str
    details: Optional[Dict[str, Any]] = None

# Note Models
class NoteCreate(BaseModel):
    project_id: str
    type: str = "note"
    title: str
    content: str
    participants: List[str] = []
    tags: List[str] = []

class NoteResponse(BaseModel):
    id: str
    project_id: str
    type: str
    title: str
    content: str
    participants: List[str]
    tags: List[str]
    created_by: str
    created_at: str

# Document Models
class DocumentResponse(BaseModel):
    id: str
    title: str
    filename: str
    category: str
    project_id: Optional[str]
    entity_id: Optional[str]
    file_path: str
    file_size: int
    uploaded_by: str
    created_at: str
    version: int = 1

# KPI Models
class KPICreate(BaseModel):
    name: str
    value: float
    unit: str = ""
    category: str = "general"
    target: Optional[float] = None
    period: str = "monthly"
    entity_id: Optional[str] = None

class KPIResponse(BaseModel):
    id: str
    name: str
    value: float
    unit: str
    category: str
    target: Optional[float]
    period: str
    entity_id: Optional[str]
    created_by: str
    created_at: str

# Export Log
class ExportLogCreate(BaseModel):
    module: str
    reason: str
    filters: Optional[Dict[str, Any]] = None

# ============== HELPER FUNCTIONS ==============

def create_token(user_id: str) -> tuple:
    expires = datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    payload = {"sub": user_id, "exp": expires}
    token = jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)
    return token, expires.isoformat()

def verify_token(token: str) -> str:
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload["sub"]
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    user_id = verify_token(credentials.credentials)
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    # Update last activity
    await db.users.update_one({"id": user_id}, {"$set": {"last_activity": datetime.now(timezone.utc).isoformat()}})
    return user

def check_role(required_roles: List[str]):
    async def role_checker(user: dict = Depends(get_current_user)):
        if user["role"] not in required_roles:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        return user
    return role_checker

async def log_audit(user_id: str, user_name: str, action: str, module: str, record_id: str = None, 
                   previous_value: dict = None, new_value: dict = None, reason: str = None):
    """Log an audit entry - immutable"""
    audit_doc = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "user_name": user_name,
        "action": action,
        "module": module,
        "record_id": record_id,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "previous_value": previous_value,
        "new_value": new_value,
        "reason": reason
    }
    await db.audit_logs.insert_one(audit_doc)

async def log_activity(project_id: str, type: str, description: str, user_id: str, user_name: str, details: dict = None):
    """Log project activity"""
    activity_doc = {
        "id": str(uuid.uuid4()),
        "project_id": project_id,
        "type": type,
        "description": description,
        "user_id": user_id,
        "user_name": user_name,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "details": details
    }
    await db.activities.insert_one(activity_doc)

async def create_notification(type: str, severity: str, title: str, message: str, 
                             entity_type: str = None, entity_id: str = None, user_id: str = None):
    """Create a notification"""
    notif_doc = {
        "id": str(uuid.uuid4()),
        "type": type,
        "severity": severity,
        "title": title,
        "message": message,
        "entity_type": entity_type,
        "entity_id": entity_id,
        "user_id": user_id,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "is_read": False
    }
    await db.notifications.insert_one(notif_doc)

async def check_task_blocked(task_id: str, depends_on: List[str]) -> bool:
    if not depends_on:
        return False
    blocking = await db.tasks.count_documents({"id": {"$in": depends_on}, "status": {"$ne": "done"}})
    return blocking > 0

async def get_project_progress(project_id: str) -> float:
    total = await db.tasks.count_documents({"project_id": project_id})
    if total == 0:
        return 0.0
    done = await db.tasks.count_documents({"project_id": project_id, "status": "done"})
    return round((done / total) * 100, 1)

# ============== AUTH ROUTES ==============

@api_router.post("/auth/register", response_model=TokenResponse)
async def register(user_data: UserCreate):
    existing = await db.users.find_one({"email": user_data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    allowed_roles = ["viewer", "manager"]
    role = user_data.role if user_data.role in allowed_roles else "viewer"
    
    user_id = str(uuid.uuid4())
    hashed_password = pwd_context.hash(user_data.password)
    now = datetime.now(timezone.utc).isoformat()
    
    user_doc = {
        "id": user_id,
        "email": user_data.email,
        "password": hashed_password,
        "name": user_data.name,
        "role": role,
        "created_at": now,
        "last_activity": now,
        "failed_logins": 0
    }
    
    await db.users.insert_one(user_doc)
    await log_audit(user_id, user_data.name, "create", "users", user_id, None, {"email": user_data.email, "role": role})
    
    token, expires = create_token(user_id)
    return TokenResponse(
        access_token=token,
        expires_at=expires,
        user=UserResponse(id=user_id, email=user_data.email, name=user_data.name, role=role, created_at=now)
    )

@api_router.post("/auth/login", response_model=TokenResponse)
async def login(login_data: UserLogin):
    user = await db.users.find_one({"email": login_data.email}, {"_id": 0})
    
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Check failed login attempts
    if user.get("failed_logins", 0) >= 5:
        await create_notification("security", "critical", "Compte bloqué", 
                                 f"Trop de tentatives échouées pour {login_data.email}", "user", user["id"])
        raise HTTPException(status_code=423, detail="Account locked - too many failed attempts")
    
    if not pwd_context.verify(login_data.password, user["password"]):
        # Increment failed logins
        await db.users.update_one({"id": user["id"]}, {"$inc": {"failed_logins": 1}})
        if user.get("failed_logins", 0) >= 4:
            await create_notification("security", "warning", "Tentatives de connexion échouées", 
                                     f"5 tentatives échouées pour {login_data.email}", "user", user["id"])
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Reset failed logins on success
    await db.users.update_one({"id": user["id"]}, {"$set": {"failed_logins": 0, "last_activity": datetime.now(timezone.utc).isoformat()}})
    await log_audit(user["id"], user["name"], "login", "auth", user["id"])
    
    token, expires = create_token(user["id"])
    return TokenResponse(
        access_token=token,
        expires_at=expires,
        user=UserResponse(id=user["id"], email=user["email"], name=user["name"], role=user["role"], 
                         created_at=user["created_at"], last_activity=user.get("last_activity"))
    )

@api_router.get("/auth/me", response_model=UserResponse)
async def get_me(user: dict = Depends(get_current_user)):
    return UserResponse(id=user["id"], email=user["email"], name=user["name"], role=user["role"], 
                       created_at=user["created_at"], last_activity=user.get("last_activity"))

# ============== ENTITY ROUTES ==============

@api_router.get("/entities", response_model=List[EntityResponse])
async def get_entities(user: dict = Depends(get_current_user)):
    return [EntityResponse(**e) for e in ENTITIES]

@api_router.get("/entities/{entity_id}")
async def get_entity(entity_id: str, user: dict = Depends(get_current_user)):
    entity = next((e for e in ENTITIES if e["id"] == entity_id), None)
    if not entity:
        raise HTTPException(status_code=404, detail="Entity not found")
    
    # Get entity stats
    projects = await db.projects.count_documents({"entity_id": entity_id})
    tasks = await db.tasks.count_documents({"entity_id": entity_id})
    
    # Budget and expenses
    budget_result = await db.projects.aggregate([
        {"$match": {"entity_id": entity_id}},
        {"$group": {"_id": None, "total": {"$sum": "$budget"}}}
    ]).to_list(1)
    total_budget = budget_result[0]["total"] if budget_result else 0
    
    expense_result = await db.finance.aggregate([
        {"$match": {"entity_id": entity_id, "type": "expense"}},
        {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
    ]).to_list(1)
    total_spent = expense_result[0]["total"] if expense_result else 0
    
    # Execution rate
    total_tasks = await db.tasks.count_documents({"entity_id": entity_id})
    done_tasks = await db.tasks.count_documents({"entity_id": entity_id, "status": "done"})
    execution_rate = (done_tasks / total_tasks * 100) if total_tasks > 0 else 0
    
    return {
        **entity,
        "projects_count": projects,
        "tasks_count": tasks,
        "total_budget": total_budget,
        "total_spent": total_spent,
        "budget_remaining": total_budget - total_spent,
        "execution_rate": round(execution_rate, 1)
    }

# ============== USER ROUTES ==============

@api_router.get("/users", response_model=List[UserResponse])
async def get_users(user: dict = Depends(check_role(["admin"]))):
    users = await db.users.find({}, {"_id": 0, "password": 0}).to_list(1000)
    return [UserResponse(**u) for u in users]

@api_router.put("/users/{user_id}/role")
async def update_user_role(user_id: str, role: str, user: dict = Depends(check_role(["admin"]))):
    if role not in ["admin", "manager", "viewer"]:
        raise HTTPException(status_code=400, detail="Invalid role")
    
    target_user = await db.users.find_one({"id": user_id}, {"_id": 0})
    old_role = target_user.get("role") if target_user else None
    
    await db.users.update_one({"id": user_id}, {"$set": {"role": role}})
    await log_audit(user["id"], user["name"], "edit", "users", user_id, {"role": old_role}, {"role": role})
    await create_notification("security", "warning", "Changement de rôle", 
                             f"Rôle de {target_user['name']} changé: {old_role} → {role}", "user", user_id)
    return {"message": "Role updated"}

@api_router.delete("/users/{user_id}")
async def delete_user(user_id: str, user: dict = Depends(check_role(["admin"]))):
    target = await db.users.find_one({"id": user_id}, {"_id": 0, "password": 0})
    await db.users.delete_one({"id": user_id})
    await log_audit(user["id"], user["name"], "delete", "users", user_id, target, None)
    return {"message": "User deleted"}

# ============== PROJECT ROUTES ==============

@api_router.post("/projects", response_model=ProjectResponse)
async def create_project(project: ProjectCreate, user: dict = Depends(check_role(["admin", "manager"]))):
    # Validate entity
    if not any(e["id"] == project.entity_id for e in ENTITIES):
        raise HTTPException(status_code=400, detail="Invalid entity_id")
    
    project_id = str(uuid.uuid4())
    project_doc = {
        "id": project_id,
        **project.model_dump(),
        "created_by": user["id"],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "version": 1
    }
    await db.projects.insert_one(project_doc)
    await log_audit(user["id"], user["name"], "create", "projects", project_id, None, project.model_dump())
    await log_activity(project_id, "project_created", f"Projet '{project.name}' créé", user["id"], user["name"])
    
    return ProjectResponse(**{k: v for k, v in project_doc.items() if k != "_id"}, progress=0.0)

@api_router.get("/projects", response_model=List[ProjectResponse])
async def get_projects(
    entity_id: Optional[str] = None,
    category: Optional[str] = None,
    parent_only: bool = False,
    user: dict = Depends(get_current_user)
):
    query = {}
    if entity_id:
        query["entity_id"] = entity_id
    if category:
        query["category"] = category
    if parent_only:
        query["parent_id"] = None
    
    projects = await db.projects.find(query, {"_id": 0}).to_list(1000)
    result = []
    for p in projects:
        progress = await get_project_progress(p["id"])
        result.append(ProjectResponse(**p, progress=progress))
    return result

@api_router.get("/projects/{project_id}", response_model=ProjectResponse)
async def get_project(project_id: str, user: dict = Depends(get_current_user)):
    project = await db.projects.find_one({"id": project_id}, {"_id": 0})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    progress = await get_project_progress(project_id)
    return ProjectResponse(**project, progress=progress)

@api_router.put("/projects/{project_id}", response_model=ProjectResponse)
async def update_project(project_id: str, project: ProjectCreate, user: dict = Depends(check_role(["admin", "manager"]))):
    old_project = await db.projects.find_one({"id": project_id}, {"_id": 0})
    if not old_project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Save version history
    version = old_project.get("version", 1) + 1
    await db.project_versions.insert_one({**old_project, "version_saved_at": datetime.now(timezone.utc).isoformat()})
    
    update_data = {**project.model_dump(), "version": version}
    await db.projects.update_one({"id": project_id}, {"$set": update_data})
    await log_audit(user["id"], user["name"], "edit", "projects", project_id, old_project, update_data)
    await log_activity(project_id, "project_updated", f"Projet mis à jour", user["id"], user["name"], 
                      {"changes": {k: v for k, v in update_data.items() if old_project.get(k) != v}})
    
    updated = await db.projects.find_one({"id": project_id}, {"_id": 0})
    progress = await get_project_progress(project_id)
    return ProjectResponse(**updated, progress=progress)

@api_router.get("/projects/{project_id}/versions")
async def get_project_versions(project_id: str, user: dict = Depends(get_current_user)):
    versions = await db.project_versions.find({"id": project_id}, {"_id": 0}).sort("version", -1).to_list(50)
    return versions

@api_router.post("/projects/{project_id}/restore/{version}")
async def restore_project_version(project_id: str, version: int, user: dict = Depends(check_role(["admin"]))):
    version_doc = await db.project_versions.find_one({"id": project_id, "version": version}, {"_id": 0})
    if not version_doc:
        raise HTTPException(status_code=404, detail="Version not found")
    
    current = await db.projects.find_one({"id": project_id}, {"_id": 0})
    new_version = current.get("version", 1) + 1
    
    restore_data = {k: v for k, v in version_doc.items() if k not in ["version_saved_at", "_id"]}
    restore_data["version"] = new_version
    
    await db.projects.update_one({"id": project_id}, {"$set": restore_data})
    await log_audit(user["id"], user["name"], "restore", "projects", project_id, current, restore_data, f"Restored to version {version}")
    
    return {"message": f"Project restored to version {version}"}

@api_router.delete("/projects/{project_id}")
async def delete_project(project_id: str, user: dict = Depends(check_role(["admin"]))):
    project = await db.projects.find_one({"id": project_id}, {"_id": 0})
    await db.projects.delete_many({"parent_id": project_id})
    await db.projects.delete_one({"id": project_id})
    await log_audit(user["id"], user["name"], "delete", "projects", project_id, project, None)
    return {"message": "Project deleted"}

@api_router.get("/projects/{project_id}/activity", response_model=List[ActivityResponse])
async def get_project_activity(project_id: str, user: dict = Depends(get_current_user)):
    activities = await db.activities.find({"project_id": project_id}, {"_id": 0}).sort("timestamp", -1).to_list(100)
    return [ActivityResponse(**a) for a in activities]

# ============== TASK ROUTES ==============

@api_router.post("/tasks", response_model=TaskResponse)
async def create_task(task: TaskCreate, user: dict = Depends(check_role(["admin", "manager"]))):
    task_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)
    
    task_doc = {
        "id": task_id,
        **task.model_dump(),
        "created_by": user["id"],
        "created_at": now.isoformat()
    }
    await db.tasks.insert_one(task_doc)
    await log_audit(user["id"], user["name"], "create", "tasks", task_id, None, task.model_dump())
    
    if task.project_id:
        await log_activity(task.project_id, "task_created", f"Tâche '{task.title}' créée", user["id"], user["name"])
    
    is_blocked = await check_task_blocked(task_id, task.depends_on)
    is_overdue = task.deadline and task.deadline < now.isoformat() if task.deadline else False
    
    return TaskResponse(**{k: v for k, v in task_doc.items() if k != "_id"}, is_blocked=is_blocked, is_overdue=is_overdue)

@api_router.get("/tasks", response_model=List[TaskResponse])
async def get_tasks(
    project_id: Optional[str] = None,
    entity_id: Optional[str] = None,
    status: Optional[str] = None,
    user: dict = Depends(get_current_user)
):
    query = {}
    if project_id:
        query["project_id"] = project_id
    if entity_id:
        query["entity_id"] = entity_id
    if status:
        query["status"] = status
    
    tasks = await db.tasks.find(query, {"_id": 0}).to_list(1000)
    now = datetime.now(timezone.utc).isoformat()
    result = []
    for t in tasks:
        is_blocked = await check_task_blocked(t["id"], t.get("depends_on", []))
        is_overdue = t.get("deadline") and t["deadline"] < now and t["status"] != "done"
        result.append(TaskResponse(**t, is_blocked=is_blocked, is_overdue=is_overdue))
    return result

@api_router.get("/tasks/kanban")
async def get_tasks_kanban(project_id: Optional[str] = None, entity_id: Optional[str] = None, user: dict = Depends(get_current_user)):
    query = {}
    if project_id:
        query["project_id"] = project_id
    if entity_id:
        query["entity_id"] = entity_id
    
    tasks = await db.tasks.find(query, {"_id": 0}).to_list(1000)
    now = datetime.now(timezone.utc).isoformat()
    
    kanban = {status: [] for status in TASK_STATUSES}
    for t in tasks:
        is_blocked = await check_task_blocked(t["id"], t.get("depends_on", []))
        is_overdue = t.get("deadline") and t["deadline"] < now and t["status"] != "done"
        task_resp = TaskResponse(**t, is_blocked=is_blocked, is_overdue=is_overdue)
        kanban[t.get("status", "backlog")].append(task_resp.model_dump())
    
    return kanban

@api_router.put("/tasks/{task_id}", response_model=TaskResponse)
async def update_task(task_id: str, task: TaskCreate, user: dict = Depends(check_role(["admin", "manager"]))):
    old_task = await db.tasks.find_one({"id": task_id}, {"_id": 0})
    await db.tasks.update_one({"id": task_id}, {"$set": task.model_dump()})
    await log_audit(user["id"], user["name"], "edit", "tasks", task_id, old_task, task.model_dump())
    
    updated = await db.tasks.find_one({"id": task_id}, {"_id": 0})
    is_blocked = await check_task_blocked(task_id, updated.get("depends_on", []))
    return TaskResponse(**updated, is_blocked=is_blocked)

@api_router.put("/tasks/{task_id}/status")
async def update_task_status(task_id: str, status: str, user: dict = Depends(check_role(["admin", "manager"]))):
    if status not in TASK_STATUSES:
        raise HTTPException(status_code=400, detail="Invalid status")
    old_task = await db.tasks.find_one({"id": task_id}, {"_id": 0})
    await db.tasks.update_one({"id": task_id}, {"$set": {"status": status}})
    await log_audit(user["id"], user["name"], "edit", "tasks", task_id, {"status": old_task.get("status")}, {"status": status})
    return {"message": "Status updated"}

@api_router.delete("/tasks/{task_id}")
async def delete_task(task_id: str, user: dict = Depends(check_role(["admin"]))):
    task = await db.tasks.find_one({"id": task_id}, {"_id": 0})
    await db.tasks.delete_one({"id": task_id})
    await log_audit(user["id"], user["name"], "delete", "tasks", task_id, task, None)
    return {"message": "Task deleted"}

# ============== DECISION LOG ROUTES ==============

@api_router.post("/decisions", response_model=DecisionResponse)
async def create_decision(decision: DecisionCreate, user: dict = Depends(check_role(["admin", "manager"]))):
    decision_id = str(uuid.uuid4())
    decision_doc = {
        "id": decision_id,
        **decision.model_dump(),
        "created_by": user["id"],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.decisions.insert_one(decision_doc)
    await log_audit(user["id"], user["name"], "create", "decisions", decision_id, None, decision.model_dump())
    
    if decision.project_id:
        await log_activity(decision.project_id, "decision_logged", f"Décision: {decision.title}", user["id"], user["name"])
    
    return DecisionResponse(**{k: v for k, v in decision_doc.items() if k != "_id"})

@api_router.get("/decisions", response_model=List[DecisionResponse])
async def get_decisions(
    entity_id: Optional[str] = None,
    project_id: Optional[str] = None,
    strategic_only: bool = False,
    user: dict = Depends(get_current_user)
):
    query = {}
    if entity_id:
        query["entity_id"] = entity_id
    if project_id:
        query["project_id"] = project_id
    if strategic_only:
        query["is_strategic"] = True
    
    decisions = await db.decisions.find(query, {"_id": 0}).sort("date", -1).to_list(1000)
    return [DecisionResponse(**d) for d in decisions]

@api_router.get("/decisions/{decision_id}", response_model=DecisionResponse)
async def get_decision(decision_id: str, user: dict = Depends(get_current_user)):
    decision = await db.decisions.find_one({"id": decision_id}, {"_id": 0})
    if not decision:
        raise HTTPException(status_code=404, detail="Decision not found")
    return DecisionResponse(**decision)

@api_router.put("/decisions/{decision_id}", response_model=DecisionResponse)
async def update_decision(decision_id: str, decision: DecisionCreate, user: dict = Depends(check_role(["admin", "manager"]))):
    old = await db.decisions.find_one({"id": decision_id}, {"_id": 0})
    await db.decisions.update_one({"id": decision_id}, {"$set": decision.model_dump()})
    await log_audit(user["id"], user["name"], "edit", "decisions", decision_id, old, decision.model_dump())
    updated = await db.decisions.find_one({"id": decision_id}, {"_id": 0})
    return DecisionResponse(**updated)

@api_router.delete("/decisions/{decision_id}")
async def delete_decision(decision_id: str, user: dict = Depends(check_role(["admin"]))):
    decision = await db.decisions.find_one({"id": decision_id}, {"_id": 0})
    await db.decisions.delete_one({"id": decision_id})
    await log_audit(user["id"], user["name"], "delete", "decisions", decision_id, decision, None)
    return {"message": "Decision deleted"}

# ============== RISK REGISTER ROUTES ==============

@api_router.post("/risks", response_model=RiskResponse)
async def create_risk(risk: RiskCreate, user: dict = Depends(check_role(["admin", "manager"]))):
    risk_id = str(uuid.uuid4())
    risk_doc = {
        "id": risk_id,
        **risk.model_dump(),
        "risk_score": risk.likelihood * risk.impact,
        "created_by": user["id"],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.risks.insert_one(risk_doc)
    await log_audit(user["id"], user["name"], "create", "risks", risk_id, None, risk.model_dump())
    
    if risk.project_id:
        await log_activity(risk.project_id, "risk_added", f"Risque: {risk.title}", user["id"], user["name"])
    
    # Alert for high risks
    if risk.likelihood * risk.impact >= 15:
        await create_notification("risk", "critical", f"Risque critique: {risk.title}", 
                                 f"Score: {risk.likelihood * risk.impact}", "risk", risk_id)
    
    return RiskResponse(**{k: v for k, v in risk_doc.items() if k != "_id"})

@api_router.get("/risks", response_model=List[RiskResponse])
async def get_risks(
    entity_id: Optional[str] = None,
    project_id: Optional[str] = None,
    risk_type: Optional[str] = None,
    status: Optional[str] = None,
    user: dict = Depends(get_current_user)
):
    query = {}
    if entity_id:
        query["entity_id"] = entity_id
    if project_id:
        query["project_id"] = project_id
    if risk_type:
        query["risk_type"] = risk_type
    if status:
        query["status"] = status
    
    risks = await db.risks.find(query, {"_id": 0}).sort("risk_score", -1).to_list(1000)
    return [RiskResponse(**r) for r in risks]

@api_router.put("/risks/{risk_id}", response_model=RiskResponse)
async def update_risk(risk_id: str, risk: RiskCreate, user: dict = Depends(check_role(["admin", "manager"]))):
    old = await db.risks.find_one({"id": risk_id}, {"_id": 0})
    update_data = {**risk.model_dump(), "risk_score": risk.likelihood * risk.impact}
    await db.risks.update_one({"id": risk_id}, {"$set": update_data})
    await log_audit(user["id"], user["name"], "edit", "risks", risk_id, old, update_data)
    updated = await db.risks.find_one({"id": risk_id}, {"_id": 0})
    return RiskResponse(**updated)

@api_router.delete("/risks/{risk_id}")
async def delete_risk(risk_id: str, user: dict = Depends(check_role(["admin"]))):
    risk = await db.risks.find_one({"id": risk_id}, {"_id": 0})
    await db.risks.delete_one({"id": risk_id})
    await log_audit(user["id"], user["name"], "delete", "risks", risk_id, risk, None)
    return {"message": "Risk deleted"}

# ============== CONTACT ROUTES (CRM Upgraded) ==============

@api_router.post("/contacts", response_model=ContactResponse)
async def create_contact(contact: ContactCreate, user: dict = Depends(check_role(["admin", "manager"]))):
    contact_id = str(uuid.uuid4())
    contact_doc = {
        "id": contact_id,
        **contact.model_dump(),
        "created_by": user["id"],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.contacts.insert_one(contact_doc)
    await log_audit(user["id"], user["name"], "create", "contacts", contact_id, None, contact.model_dump())
    return ContactResponse(**{k: v for k, v in contact_doc.items() if k != "_id"})

@api_router.get("/contacts", response_model=List[ContactResponse])
async def get_contacts(
    type: Optional[str] = None,
    stage: Optional[str] = None,
    entity_id: Optional[str] = None,
    priority: Optional[int] = None,
    user: dict = Depends(get_current_user)
):
    query = {}
    if type:
        query["type"] = type
    if stage:
        query["stage"] = stage
    if entity_id:
        query["entity_id"] = entity_id
    if priority:
        query["priority"] = priority
    
    contacts = await db.contacts.find(query, {"_id": 0}).to_list(1000)
    now = datetime.now(timezone.utc)
    
    result = []
    for c in contacts:
        days_since = None
        if c.get("last_interaction"):
            try:
                last = datetime.fromisoformat(c["last_interaction"].replace("Z", "+00:00"))
                days_since = (now - last).days
            except:
                pass
        result.append(ContactResponse(**c, days_since_interaction=days_since))
    
    return result

@api_router.get("/contacts/followups")
async def get_contact_followups(user: dict = Depends(get_current_user)):
    today = datetime.now(timezone.utc).isoformat()
    contacts = await db.contacts.find({"next_followup": {"$lte": today, "$ne": None}}, {"_id": 0}).to_list(100)
    return [ContactResponse(**c) for c in contacts]

@api_router.get("/contacts/inactive")
async def get_inactive_contacts(days: int = 14, user: dict = Depends(get_current_user)):
    cutoff = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()
    contacts = await db.contacts.find({
        "$or": [
            {"last_interaction": {"$lt": cutoff}},
            {"last_interaction": None}
        ]
    }, {"_id": 0}).to_list(100)
    return [ContactResponse(**c) for c in contacts]

@api_router.put("/contacts/{contact_id}", response_model=ContactResponse)
async def update_contact(contact_id: str, contact: ContactCreate, user: dict = Depends(check_role(["admin", "manager"]))):
    old = await db.contacts.find_one({"id": contact_id}, {"_id": 0})
    await db.contacts.update_one({"id": contact_id}, {"$set": contact.model_dump()})
    await log_audit(user["id"], user["name"], "edit", "contacts", contact_id, old, contact.model_dump())
    updated = await db.contacts.find_one({"id": contact_id}, {"_id": 0})
    return ContactResponse(**updated)

@api_router.put("/contacts/{contact_id}/interaction")
async def log_interaction(contact_id: str, user: dict = Depends(check_role(["admin", "manager"]))):
    now = datetime.now(timezone.utc).isoformat()
    await db.contacts.update_one({"id": contact_id}, {"$set": {"last_interaction": now}})
    await log_audit(user["id"], user["name"], "edit", "contacts", contact_id, None, {"last_interaction": now})
    return {"message": "Interaction logged", "timestamp": now}

@api_router.delete("/contacts/{contact_id}")
async def delete_contact(contact_id: str, user: dict = Depends(check_role(["admin"]))):
    contact = await db.contacts.find_one({"id": contact_id}, {"_id": 0})
    await db.contacts.delete_one({"id": contact_id})
    await log_audit(user["id"], user["name"], "delete", "contacts", contact_id, contact, None)
    return {"message": "Contact deleted"}

# ============== FINANCE ROUTES ==============

@api_router.post("/finance", response_model=FinanceResponse)
async def create_finance(finance: FinanceCreate, user: dict = Depends(check_role(["admin", "manager"]))):
    finance_id = str(uuid.uuid4())
    finance_doc = {
        "id": finance_id,
        **finance.model_dump(),
        "date": finance.date or datetime.now(timezone.utc).isoformat(),
        "created_by": user["id"],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "version": 1
    }
    await db.finance.insert_one(finance_doc)
    await log_audit(user["id"], user["name"], "create", "finance", finance_id, None, finance.model_dump())
    
    if finance.project_id:
        await log_activity(finance.project_id, "finance_added", 
                          f"{finance.type}: {finance.amount}€ - {finance.description}", user["id"], user["name"])
    
    # Budget alert check
    if finance.project_id and finance.type == "expense":
        project = await db.projects.find_one({"id": finance.project_id}, {"_id": 0})
        if project and project.get("budget", 0) > 0:
            expenses = await db.finance.aggregate([
                {"$match": {"project_id": finance.project_id, "type": "expense"}},
                {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
            ]).to_list(1)
            total_spent = expenses[0]["total"] if expenses else 0
            budget_percent = (total_spent / project["budget"]) * 100
            
            if budget_percent >= 100:
                await create_notification("budget", "critical", f"Budget dépassé: {project['name']}", 
                                         f"Dépensé: {total_spent}€ / {project['budget']}€", "project", finance.project_id)
            elif budget_percent >= 80:
                await create_notification("budget", "warning", f"Alerte budget: {project['name']}", 
                                         f"80% du budget utilisé", "project", finance.project_id)
    
    return FinanceResponse(**{k: v for k, v in finance_doc.items() if k != "_id"})

@api_router.get("/finance", response_model=List[FinanceResponse])
async def get_finance(
    project_id: Optional[str] = None,
    entity_id: Optional[str] = None,
    type: Optional[str] = None,
    user: dict = Depends(get_current_user)
):
    query = {}
    if project_id:
        query["project_id"] = project_id
    if entity_id:
        query["entity_id"] = entity_id
    if type:
        query["type"] = type
    records = await db.finance.find(query, {"_id": 0}).to_list(1000)
    return [FinanceResponse(**r) for r in records]

@api_router.get("/finance/burn-rate")
async def get_burn_rate(entity_id: Optional[str] = None, user: dict = Depends(get_current_user)):
    thirty_days_ago = (datetime.now(timezone.utc) - timedelta(days=30)).isoformat()
    
    query = {"type": "expense", "date": {"$gte": thirty_days_ago}}
    if entity_id:
        query["entity_id"] = entity_id
    
    expenses = await db.finance.find(query, {"_id": 0}).to_list(1000)
    total_expense = sum(e.get("amount", 0) for e in expenses)
    daily_burn = total_expense / 30
    
    # Get total budget
    budget_query = {"entity_id": entity_id} if entity_id else {}
    projects = await db.projects.find(budget_query, {"_id": 0, "budget": 1}).to_list(1000)
    budget = sum(p.get("budget", 0) for p in projects)
    
    # Get total revenue
    rev_query = {"type": "revenue"}
    if entity_id:
        rev_query["entity_id"] = entity_id
    revenues = await db.finance.find(rev_query, {"_id": 0}).to_list(1000)
    total_revenue = sum(r.get("amount", 0) for r in revenues)
    
    all_expenses = await db.finance.find({"type": "expense"} if not entity_id else {"type": "expense", "entity_id": entity_id}, {"_id": 0}).to_list(1000)
    total_spent = sum(e.get("amount", 0) for e in all_expenses)
    
    cash = total_revenue - total_spent + budget
    runway_days = cash / daily_burn if daily_burn > 0 else float('inf')
    
    return {
        "daily_burn_rate": round(daily_burn, 2),
        "monthly_burn_rate": round(daily_burn * 30, 2),
        "total_budget": budget,
        "total_revenue": total_revenue,
        "total_spent": total_spent,
        "cash_position": round(cash, 2),
        "runway_days": round(runway_days, 0) if runway_days != float('inf') else None,
        "runway_months": round(runway_days / 30, 1) if runway_days != float('inf') else None
    }

@api_router.put("/finance/{finance_id}", response_model=FinanceResponse)
async def update_finance(finance_id: str, finance: FinanceCreate, user: dict = Depends(check_role(["admin", "manager"]))):
    old = await db.finance.find_one({"id": finance_id}, {"_id": 0})
    version = old.get("version", 1) + 1
    
    # Save version
    await db.finance_versions.insert_one({**old, "version_saved_at": datetime.now(timezone.utc).isoformat()})
    
    update_data = {**finance.model_dump(), "version": version}
    await db.finance.update_one({"id": finance_id}, {"$set": update_data})
    await log_audit(user["id"], user["name"], "edit", "finance", finance_id, old, update_data)
    
    updated = await db.finance.find_one({"id": finance_id}, {"_id": 0})
    return FinanceResponse(**updated)

@api_router.delete("/finance/{finance_id}")
async def delete_finance(finance_id: str, user: dict = Depends(check_role(["admin"]))):
    finance = await db.finance.find_one({"id": finance_id}, {"_id": 0})
    await db.finance.delete_one({"id": finance_id})
    await log_audit(user["id"], user["name"], "delete", "finance", finance_id, finance, None)
    return {"message": "Finance record deleted"}

# ============== EVENT ROUTES ==============

@api_router.post("/events", response_model=EventResponse)
async def create_event(event: EventCreate, user: dict = Depends(check_role(["admin", "manager"]))):
    event_id = str(uuid.uuid4())
    
    checklist = []
    for item in event.checklist:
        if isinstance(item, str):
            checklist.append({"item": item, "completed": False})
        else:
            checklist.append(item)
    
    event_doc = {
        "id": event_id,
        **event.model_dump(),
        "checklist": checklist,
        "created_by": user["id"],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.events.insert_one(event_doc)
    await log_audit(user["id"], user["name"], "create", "events", event_id, None, event.model_dump())
    
    # Calculate days until
    try:
        event_date = datetime.fromisoformat(event.date.replace("Z", "+00:00"))
        days_until = (event_date - datetime.now(timezone.utc)).days
    except:
        days_until = None
    
    return EventResponse(**{k: v for k, v in event_doc.items() if k != "_id"}, days_until=days_until)

@api_router.get("/events", response_model=List[EventResponse])
async def get_events(
    project_id: Optional[str] = None,
    entity_id: Optional[str] = None,
    status: Optional[str] = None,
    user: dict = Depends(get_current_user)
):
    query = {}
    if project_id:
        query["project_id"] = project_id
    if entity_id:
        query["entity_id"] = entity_id
    if status:
        query["status"] = status
    
    events = await db.events.find(query, {"_id": 0}).to_list(1000)
    now = datetime.now(timezone.utc)
    
    result = []
    for e in events:
        days_until = None
        try:
            event_date = datetime.fromisoformat(e["date"].replace("Z", "+00:00"))
            days_until = (event_date - now).days
        except:
            pass
        result.append(EventResponse(**e, days_until=days_until))
    
    return result

@api_router.get("/events/upcoming")
async def get_upcoming_events(days: int = 7, user: dict = Depends(get_current_user)):
    now = datetime.now(timezone.utc)
    end = (now + timedelta(days=days)).isoformat()
    
    events = await db.events.find({
        "date": {"$gte": now.isoformat(), "$lte": end},
        "status": {"$in": ["upcoming", "in_progress"]}
    }, {"_id": 0}).sort("date", 1).to_list(50)
    
    result = []
    for e in events:
        try:
            event_date = datetime.fromisoformat(e["date"].replace("Z", "+00:00"))
            days_until = (event_date - now).days
        except:
            days_until = None
        result.append(EventResponse(**e, days_until=days_until))
    
    return result

@api_router.put("/events/{event_id}", response_model=EventResponse)
async def update_event(event_id: str, event: EventCreate, user: dict = Depends(check_role(["admin", "manager"]))):
    old = await db.events.find_one({"id": event_id}, {"_id": 0})
    await db.events.update_one({"id": event_id}, {"$set": event.model_dump()})
    await log_audit(user["id"], user["name"], "edit", "events", event_id, old, event.model_dump())
    updated = await db.events.find_one({"id": event_id}, {"_id": 0})
    return EventResponse(**updated)

@api_router.delete("/events/{event_id}")
async def delete_event(event_id: str, user: dict = Depends(check_role(["admin"]))):
    event = await db.events.find_one({"id": event_id}, {"_id": 0})
    await db.events.delete_one({"id": event_id})
    await log_audit(user["id"], user["name"], "delete", "events", event_id, event, None)
    return {"message": "Event deleted"}

# ============== NOTES ROUTES ==============

@api_router.post("/notes", response_model=NoteResponse)
async def create_note(note: NoteCreate, user: dict = Depends(check_role(["admin", "manager"]))):
    note_id = str(uuid.uuid4())
    note_doc = {
        "id": note_id,
        **note.model_dump(),
        "created_by": user["id"],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.notes.insert_one(note_doc)
    await log_audit(user["id"], user["name"], "create", "notes", note_id, None, note.model_dump())
    await log_activity(note.project_id, "note_added", f"Note: {note.title}", user["id"], user["name"])
    return NoteResponse(**{k: v for k, v in note_doc.items() if k != "_id"})

@api_router.get("/notes", response_model=List[NoteResponse])
async def get_notes(project_id: Optional[str] = None, type: Optional[str] = None, user: dict = Depends(get_current_user)):
    query = {}
    if project_id:
        query["project_id"] = project_id
    if type:
        query["type"] = type
    notes = await db.notes.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return [NoteResponse(**n) for n in notes]

@api_router.put("/notes/{note_id}", response_model=NoteResponse)
async def update_note(note_id: str, note: NoteCreate, user: dict = Depends(check_role(["admin", "manager"]))):
    old = await db.notes.find_one({"id": note_id}, {"_id": 0})
    await db.notes.update_one({"id": note_id}, {"$set": note.model_dump()})
    await log_audit(user["id"], user["name"], "edit", "notes", note_id, old, note.model_dump())
    updated = await db.notes.find_one({"id": note_id}, {"_id": 0})
    return NoteResponse(**updated)

@api_router.delete("/notes/{note_id}")
async def delete_note(note_id: str, user: dict = Depends(check_role(["admin"]))):
    note = await db.notes.find_one({"id": note_id}, {"_id": 0})
    await db.notes.delete_one({"id": note_id})
    await log_audit(user["id"], user["name"], "delete", "notes", note_id, note, None)
    return {"message": "Note deleted"}

# ============== DOCUMENT ROUTES ==============

@api_router.post("/documents", response_model=DocumentResponse)
async def upload_document(
    file: UploadFile = File(...),
    title: str = Form(...),
    category: str = Form("general"),
    project_id: Optional[str] = Form(None),
    entity_id: Optional[str] = Form(None),
    user: dict = Depends(check_role(["admin", "manager"]))
):
    doc_id = str(uuid.uuid4())
    file_ext = Path(file.filename).suffix
    saved_filename = f"{doc_id}{file_ext}"
    file_path = UPLOAD_DIR / saved_filename
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    file_size = os.path.getsize(file_path)
    
    doc = {
        "id": doc_id,
        "title": title,
        "filename": file.filename,
        "category": category,
        "project_id": project_id if project_id and project_id != "none" else None,
        "entity_id": entity_id if entity_id and entity_id != "none" else None,
        "file_path": str(saved_filename),
        "file_size": file_size,
        "uploaded_by": user["id"],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "version": 1
    }
    
    await db.documents.insert_one(doc)
    await log_audit(user["id"], user["name"], "create", "documents", doc_id, None, {"title": title, "filename": file.filename})
    
    if project_id and project_id != "none":
        await log_activity(project_id, "document_uploaded", f"Document: {title}", user["id"], user["name"])
    
    return DocumentResponse(**{k: v for k, v in doc.items() if k != "_id"})

@api_router.get("/documents", response_model=List[DocumentResponse])
async def get_documents(
    project_id: Optional[str] = None,
    entity_id: Optional[str] = None,
    category: Optional[str] = None,
    user: dict = Depends(get_current_user)
):
    query = {}
    if project_id:
        query["project_id"] = project_id
    if entity_id:
        query["entity_id"] = entity_id
    if category:
        query["category"] = category
    documents = await db.documents.find(query, {"_id": 0}).to_list(1000)
    return [DocumentResponse(**d) for d in documents]

@api_router.delete("/documents/{doc_id}")
async def delete_document(doc_id: str, user: dict = Depends(check_role(["admin"]))):
    doc = await db.documents.find_one({"id": doc_id}, {"_id": 0})
    if doc:
        file_path = UPLOAD_DIR / doc["file_path"]
        if file_path.exists():
            file_path.unlink()
    await db.documents.delete_one({"id": doc_id})
    await log_audit(user["id"], user["name"], "delete", "documents", doc_id, doc, None)
    return {"message": "Document deleted"}

# ============== KPI ROUTES ==============

@api_router.post("/kpis", response_model=KPIResponse)
async def create_kpi(kpi: KPICreate, user: dict = Depends(check_role(["admin", "manager"]))):
    kpi_id = str(uuid.uuid4())
    kpi_doc = {
        "id": kpi_id,
        **kpi.model_dump(),
        "created_by": user["id"],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.kpis.insert_one(kpi_doc)
    await log_audit(user["id"], user["name"], "create", "kpis", kpi_id, None, kpi.model_dump())
    return KPIResponse(**{k: v for k, v in kpi_doc.items() if k != "_id"})

@api_router.get("/kpis", response_model=List[KPIResponse])
async def get_kpis(category: Optional[str] = None, entity_id: Optional[str] = None, user: dict = Depends(get_current_user)):
    query = {}
    if category:
        query["category"] = category
    if entity_id:
        query["entity_id"] = entity_id
    kpis = await db.kpis.find(query, {"_id": 0}).to_list(1000)
    return [KPIResponse(**k) for k in kpis]

@api_router.put("/kpis/{kpi_id}", response_model=KPIResponse)
async def update_kpi(kpi_id: str, kpi: KPICreate, user: dict = Depends(check_role(["admin", "manager"]))):
    old = await db.kpis.find_one({"id": kpi_id}, {"_id": 0})
    await db.kpis.update_one({"id": kpi_id}, {"$set": kpi.model_dump()})
    await log_audit(user["id"], user["name"], "edit", "kpis", kpi_id, old, kpi.model_dump())
    updated = await db.kpis.find_one({"id": kpi_id}, {"_id": 0})
    return KPIResponse(**updated)

@api_router.delete("/kpis/{kpi_id}")
async def delete_kpi(kpi_id: str, user: dict = Depends(check_role(["admin"]))):
    kpi = await db.kpis.find_one({"id": kpi_id}, {"_id": 0})
    await db.kpis.delete_one({"id": kpi_id})
    await log_audit(user["id"], user["name"], "delete", "kpis", kpi_id, kpi, None)
    return {"message": "KPI deleted"}

# ============== AUDIT LOG ROUTES (Admin Only) ==============

@api_router.get("/audit-logs", response_model=List[AuditLogResponse])
async def get_audit_logs(
    module: Optional[str] = None,
    action: Optional[str] = None,
    user_id: Optional[str] = None,
    limit: int = 100,
    user: dict = Depends(check_role(["admin"]))
):
    query = {}
    if module:
        query["module"] = module
    if action:
        query["action"] = action
    if user_id:
        query["user_id"] = user_id
    
    logs = await db.audit_logs.find(query, {"_id": 0}).sort("timestamp", -1).limit(limit).to_list(limit)
    return [AuditLogResponse(**l) for l in logs]

# ============== NOTIFICATION ROUTES ==============

@api_router.get("/notifications", response_model=List[NotificationResponse])
async def get_notifications(unread_only: bool = False, user: dict = Depends(get_current_user)):
    query = {}
    if unread_only:
        query["is_read"] = False
    
    # Get user-specific and global notifications
    query["$or"] = [{"user_id": user["id"]}, {"user_id": None}]
    
    notifications = await db.notifications.find(query, {"_id": 0}).sort("created_at", -1).limit(50).to_list(50)
    return [NotificationResponse(**n) for n in notifications]

@api_router.put("/notifications/{notif_id}/read")
async def mark_notification_read(notif_id: str, user: dict = Depends(get_current_user)):
    await db.notifications.update_one({"id": notif_id}, {"$set": {"is_read": True}})
    return {"message": "Notification marked as read"}

@api_router.put("/notifications/read-all")
async def mark_all_notifications_read(user: dict = Depends(get_current_user)):
    await db.notifications.update_many(
        {"$or": [{"user_id": user["id"]}, {"user_id": None}]},
        {"$set": {"is_read": True}}
    )
    return {"message": "All notifications marked as read"}

# ============== ALERTS ROUTES ==============

@api_router.get("/alerts")
async def get_alerts(user: dict = Depends(get_current_user)):
    alerts = []
    now = datetime.now(timezone.utc)
    today = now.isoformat()
    
    # Overdue tasks
    overdue_tasks = await db.tasks.find({
        "deadline": {"$lt": today, "$ne": None},
        "status": {"$ne": "done"}
    }, {"_id": 0}).to_list(100)
    
    for task in overdue_tasks:
        alerts.append({
            "id": f"task-overdue-{task['id']}",
            "type": "overdue_task",
            "severity": "high",
            "title": f"Tâche en retard: {task['title']}",
            "message": f"Échéance: {task['deadline'][:10]}",
            "entity_type": "task",
            "entity_id": task['id'],
            "created_at": today
        })
    
    # Event deadlines (within 7 days)
    seven_days = (now + timedelta(days=7)).isoformat()
    upcoming_events = await db.events.find({
        "date": {"$gte": today, "$lte": seven_days},
        "status": "upcoming"
    }, {"_id": 0}).to_list(100)
    
    for event in upcoming_events:
        try:
            event_date = datetime.fromisoformat(event["date"].replace("Z", "+00:00"))
            days_until = (event_date - now).days
        except:
            days_until = 7
        
        severity = "critical" if days_until <= 1 else "warning" if days_until <= 3 else "info"
        alerts.append({
            "id": f"event-{event['id']}",
            "type": "event_deadline",
            "severity": severity,
            "title": f"Événement: {event['title']}",
            "message": f"Dans {days_until} jour(s)",
            "entity_type": "event",
            "entity_id": event['id'],
            "created_at": today
        })
    
    # High risks
    high_risks = await db.risks.find({"risk_score": {"$gte": 15}, "status": {"$ne": "resolved"}}, {"_id": 0}).to_list(50)
    for risk in high_risks:
        alerts.append({
            "id": f"risk-{risk['id']}",
            "type": "risk_alert",
            "severity": "critical" if risk["risk_score"] >= 20 else "high",
            "title": f"Risque: {risk['title']}",
            "message": f"Score: {risk['risk_score']}",
            "entity_type": "risk",
            "entity_id": risk['id'],
            "created_at": today
        })
    
    # Contact follow-ups
    followups = await db.contacts.find({"next_followup": {"$lte": today, "$ne": None}}, {"_id": 0}).to_list(50)
    for contact in followups:
        alerts.append({
            "id": f"followup-{contact['id']}",
            "type": "followup_due",
            "severity": "info",
            "title": f"Relance: {contact['name']}",
            "message": contact.get("company", ""),
            "entity_type": "contact",
            "entity_id": contact['id'],
            "created_at": today
        })
    
    # Sort by severity
    severity_order = {"critical": 0, "high": 1, "warning": 2, "info": 3}
    return sorted(alerts, key=lambda x: severity_order.get(x["severity"], 4))

# ============== GLOBAL SEARCH ==============

@api_router.get("/search")
async def global_search(q: str = Query(..., min_length=2), user: dict = Depends(get_current_user)):
    results = {"projects": [], "tasks": [], "contacts": [], "events": [], "documents": [], "decisions": [], "risks": []}
    regex = {"$regex": q, "$options": "i"}
    
    results["projects"] = await db.projects.find({"$or": [{"name": regex}, {"description": regex}]}, {"_id": 0}).to_list(10)
    results["tasks"] = await db.tasks.find({"$or": [{"title": regex}, {"description": regex}]}, {"_id": 0}).to_list(10)
    results["contacts"] = await db.contacts.find({"$or": [{"name": regex}, {"email": regex}, {"company": regex}]}, {"_id": 0}).to_list(10)
    results["events"] = await db.events.find({"$or": [{"title": regex}, {"description": regex}]}, {"_id": 0}).to_list(10)
    results["documents"] = await db.documents.find({"$or": [{"title": regex}, {"filename": regex}]}, {"_id": 0}).to_list(10)
    results["decisions"] = await db.decisions.find({"$or": [{"title": regex}, {"rationale": regex}]}, {"_id": 0}).to_list(10)
    results["risks"] = await db.risks.find({"$or": [{"title": regex}, {"description": regex}]}, {"_id": 0}).to_list(10)
    
    return results

# ============== EXPORT ROUTES ==============

@api_router.post("/export/{module}")
async def export_data(module: str, export_log: ExportLogCreate, user: dict = Depends(check_role(["admin", "manager"]))):
    valid_modules = ["projects", "tasks", "contacts", "finance", "events", "decisions", "risks"]
    if module not in valid_modules:
        raise HTTPException(status_code=400, detail="Invalid module")
    
    await log_audit(user["id"], user["name"], "export", module, None, None, 
                   {"reason": export_log.reason, "filters": export_log.filters}, export_log.reason)
    await create_notification("security", "info", f"Export: {module}", 
                             f"Par {user['name']} - Raison: {export_log.reason}", "export", None, user["id"])
    
    data = await db[module].find(export_log.filters or {}, {"_id": 0}).to_list(10000)
    return {"module": module, "count": len(data), "data": data}

# ============== BACKUP ROUTES (Admin Only) ==============

@api_router.post("/backup")
async def create_backup(user: dict = Depends(check_role(["admin"]))):
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    backup_data = {}
    
    collections = ["users", "projects", "tasks", "contacts", "finance", "events", "documents", "decisions", "risks", "notes", "kpis"]
    
    for coll in collections:
        data = await db[coll].find({}, {"_id": 0}).to_list(100000)
        backup_data[coll] = data
    
    backup_file = BACKUP_DIR / f"backup_{timestamp}.json"
    with open(backup_file, "w") as f:
        json.dump(backup_data, f, indent=2, default=str)
    
    await log_audit(user["id"], user["name"], "backup", "system", None, None, {"timestamp": timestamp})
    await create_notification("system", "info", "Backup créé", f"backup_{timestamp}.json", "backup", None)
    
    return {"message": "Backup created", "filename": f"backup_{timestamp}.json"}

@api_router.get("/backups")
async def list_backups(user: dict = Depends(check_role(["admin"]))):
    backups = []
    for f in BACKUP_DIR.glob("backup_*.json"):
        backups.append({
            "filename": f.name,
            "size": f.stat().st_size,
            "created_at": datetime.fromtimestamp(f.stat().st_mtime).isoformat()
        })
    return sorted(backups, key=lambda x: x["created_at"], reverse=True)

# ============== DASHBOARD ROUTES ==============

@api_router.get("/dashboard/stats")
async def get_dashboard_stats(user: dict = Depends(get_current_user)):
    projects_count = await db.projects.count_documents({})
    active_projects = await db.projects.count_documents({"status": {"$in": ["planning", "in_progress"]}})
    tasks_count = await db.tasks.count_documents({})
    urgent_tasks = await db.tasks.count_documents({"priority": "urgent", "status": {"$ne": "done"}})
    contacts_count = await db.contacts.count_documents({})
    events_count = await db.events.count_documents({})
    decisions_count = await db.decisions.count_documents({})
    risks_count = await db.risks.count_documents({"status": {"$ne": "resolved"}})
    
    revenue_result = await db.finance.aggregate([{"$match": {"type": "revenue"}}, {"$group": {"_id": None, "total": {"$sum": "$amount"}}}]).to_list(1)
    expense_result = await db.finance.aggregate([{"$match": {"type": "expense"}}, {"$group": {"_id": None, "total": {"$sum": "$amount"}}}]).to_list(1)
    
    total_revenue = revenue_result[0]["total"] if revenue_result else 0
    total_expenses = expense_result[0]["total"] if expense_result else 0
    
    now = datetime.now(timezone.utc).isoformat()
    upcoming_events = await db.events.find({"date": {"$gte": now}, "status": "upcoming"}, {"_id": 0}).sort("date", 1).limit(5).to_list(5)
    recent_tasks = await db.tasks.find({"status": {"$ne": "done"}}, {"_id": 0}).sort("created_at", -1).limit(5).to_list(5)
    
    return {
        "projects": {"total": projects_count, "active": active_projects},
        "tasks": {"total": tasks_count, "urgent": urgent_tasks},
        "contacts": contacts_count,
        "events": events_count,
        "decisions": decisions_count,
        "risks": risks_count,
        "finance": {"revenue": total_revenue, "expenses": total_expenses, "profit": total_revenue - total_expenses},
        "upcoming_events": upcoming_events,
        "recent_tasks": recent_tasks
    }

@api_router.get("/dashboard/heatmap")
async def get_project_heatmap(user: dict = Depends(get_current_user)):
    projects = await db.projects.find({"status": {"$ne": "completed"}}, {"_id": 0}).to_list(100)
    now = datetime.now(timezone.utc)
    
    heatmap = []
    for project in projects:
        urgency_score = 0
        
        if project.get("deadline"):
            try:
                deadline = datetime.fromisoformat(project["deadline"].replace("Z", "+00:00"))
                days_until = (deadline - now).days
                if days_until < 0:
                    urgency_score += 50
                elif days_until < 7:
                    urgency_score += 30
                elif days_until < 30:
                    urgency_score += 10
            except:
                pass
        
        urgent_count = await db.tasks.count_documents({"project_id": project["id"], "priority": {"$in": ["urgent", "high"]}, "status": {"$ne": "done"}})
        urgency_score += urgent_count * 10
        
        overdue_count = await db.tasks.count_documents({"project_id": project["id"], "deadline": {"$lt": now.isoformat()}, "status": {"$ne": "done"}})
        urgency_score += overdue_count * 20
        
        total_tasks = await db.tasks.count_documents({"project_id": project["id"]})
        done_tasks = await db.tasks.count_documents({"project_id": project["id"], "status": "done"})
        progress = (done_tasks / total_tasks * 100) if total_tasks > 0 else 0
        
        entity = next((e for e in ENTITIES if e["id"] == project.get("entity_id")), None)
        
        heatmap.append({
            "id": project["id"],
            "name": project["name"],
            "entity_id": project.get("entity_id"),
            "entity_name": entity["name"] if entity else "N/A",
            "category": project.get("category", "Other"),
            "urgency_score": min(urgency_score, 100),
            "progress": round(progress, 1),
            "status": project["status"],
            "deadline": project.get("deadline")
        })
    
    return sorted(heatmap, key=lambda x: x["urgency_score"], reverse=True)

@api_router.get("/dashboard/weekly-summary")
async def get_weekly_summary(user: dict = Depends(get_current_user)):
    now = datetime.now(timezone.utc)
    week_ago = (now - timedelta(days=7)).isoformat()
    
    tasks_completed = await db.tasks.count_documents({"status": "done"})
    tasks_created = await db.tasks.count_documents({"created_at": {"$gte": week_ago}})
    
    week_end = (now + timedelta(days=7)).isoformat()
    events_this_week = await db.events.count_documents({"date": {"$gte": now.isoformat(), "$lte": week_end}})
    
    revenue_week = await db.finance.find({"type": "revenue", "date": {"$gte": week_ago}}, {"_id": 0}).to_list(100)
    expense_week = await db.finance.find({"type": "expense", "date": {"$gte": week_ago}}, {"_id": 0}).to_list(100)
    
    total_revenue = sum(r.get("amount", 0) for r in revenue_week)
    total_expenses = sum(e.get("amount", 0) for e in expense_week)
    
    notes_count = await db.notes.count_documents({"created_at": {"$gte": week_ago}})
    decisions_count = await db.decisions.count_documents({"created_at": {"$gte": week_ago}})
    
    return {
        "tasks_completed": tasks_completed,
        "tasks_created": tasks_created,
        "completion_rate": round(tasks_completed / max(tasks_created, 1) * 100, 1),
        "events_upcoming": events_this_week,
        "revenue_week": total_revenue,
        "expenses_week": total_expenses,
        "notes_created": notes_count,
        "decisions_made": decisions_count
    }

# ============== BOARD PACK (Executive View) ==============

@api_router.get("/board-pack")
async def get_board_pack(user: dict = Depends(get_current_user)):
    now = datetime.now(timezone.utc)
    
    # Entity performance
    entity_performance = []
    for entity in ENTITIES:
        stats = await get_entity(entity["id"], user)
        entity_performance.append(stats)
    
    # Top 10 strategic priorities (strategic decisions this month)
    month_ago = (now - timedelta(days=30)).isoformat()
    strategic_priorities = await db.decisions.find({
        "is_strategic": True,
        "date": {"$gte": month_ago}
    }, {"_id": 0}).sort("date", -1).limit(10).to_list(10)
    
    # Top 5 risks
    top_risks = await db.risks.find({"status": {"$ne": "resolved"}}, {"_id": 0}).sort("risk_score", -1).limit(5).to_list(5)
    
    # Cash runway
    burn_rate = await get_burn_rate(None, user)
    
    # Critical events (next 14 days)
    two_weeks = (now + timedelta(days=14)).isoformat()
    critical_events = await db.events.find({
        "date": {"$gte": now.isoformat(), "$lte": two_weeks},
        "status": {"$in": ["upcoming", "in_progress"]}
    }, {"_id": 0}).sort("date", 1).limit(10).to_list(10)
    
    # Recent decision highlights
    recent_decisions = await db.decisions.find({}, {"_id": 0}).sort("date", -1).limit(5).to_list(5)
    
    return {
        "generated_at": now.isoformat(),
        "entity_performance": entity_performance,
        "strategic_priorities": strategic_priorities,
        "top_risks": [RiskResponse(**r).model_dump() for r in top_risks],
        "cash_runway": burn_rate,
        "critical_events": critical_events,
        "recent_decisions": recent_decisions
    }

@api_router.get("/ceo-summary")
async def get_ceo_summary(user: dict = Depends(get_current_user)):
    """Daily CEO summary"""
    now = datetime.now(timezone.utc)
    today = now.replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
    
    # Today's tasks due
    tasks_due_today = await db.tasks.find({
        "deadline": {"$gte": today, "$lt": (now + timedelta(days=1)).isoformat()},
        "status": {"$ne": "done"}
    }, {"_id": 0}).to_list(20)
    
    # Overdue items
    overdue_tasks = await db.tasks.count_documents({"deadline": {"$lt": now.isoformat()}, "status": {"$ne": "done"}})
    
    # Events today
    events_today = await db.events.find({
        "date": {"$gte": today, "$lt": (now + timedelta(days=1)).isoformat()}
    }, {"_id": 0}).to_list(10)
    
    # Critical alerts
    alerts = await get_alerts(user)
    critical_alerts = [a for a in alerts if a["severity"] in ["critical", "high"]]
    
    # Follow-ups due
    followups = await db.contacts.find({"next_followup": {"$lte": now.isoformat(), "$ne": None}}, {"_id": 0}).limit(10).to_list(10)
    
    # Financial snapshot
    stats = await get_dashboard_stats(user)
    
    return {
        "date": now.strftime("%A, %B %d, %Y"),
        "tasks_due_today": len(tasks_due_today),
        "tasks_due_today_list": tasks_due_today[:5],
        "overdue_items": overdue_tasks,
        "events_today": events_today,
        "critical_alerts_count": len(critical_alerts),
        "critical_alerts": critical_alerts[:5],
        "followups_due": len(followups),
        "financial_snapshot": stats["finance"],
        "active_projects": stats["projects"]["active"]
    }

# Include the router
app.include_router(api_router)
app.mount("/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
