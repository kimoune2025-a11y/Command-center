from fastapi import FastAPI, APIRouter, Depends, HTTPException, status, UploadFile, File, Form, Query
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

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# File upload directory
UPLOAD_DIR = ROOT_DIR / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)

# Create the main app
app = FastAPI(title="CVLN Command Center API v1.1")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Security
security = HTTPBearer()

# ============== MODELS ==============

# User Models
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

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

# Project Categories
PROJECT_CATEGORIES = ["Music", "Events", "Tech", "Agro", "Admin", "Other"]

# Project Models (v1.1 - with hierarchy)
class ProjectCreate(BaseModel):
    name: str
    description: Optional[str] = ""
    status: str = "planning"
    deadline: Optional[str] = None
    team_members: List[str] = []
    budget: float = 0.0
    category: str = "Other"
    parent_id: Optional[str] = None  # For sub-projects

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
    created_by: str
    created_at: str
    progress: Optional[float] = 0.0
    sub_projects: Optional[List[Any]] = []

# Task Models (v1.1 - with dependencies and recurring)
TASK_STATUSES = ["backlog", "in_progress", "waiting", "done"]

class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = ""
    priority: str = "medium"
    status: str = "backlog"
    deadline: Optional[str] = None
    assigned_to: Optional[str] = None
    project_id: Optional[str] = None
    depends_on: List[str] = []  # Task IDs this depends on
    is_recurring: bool = False
    recurrence_pattern: Optional[str] = None  # daily, weekly, monthly
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
    depends_on: List[str]
    is_recurring: bool
    recurrence_pattern: Optional[str]
    recurrence_end: Optional[str]
    created_by: str
    created_at: str
    is_blocked: Optional[bool] = False

# Finance Models
class FinanceCreate(BaseModel):
    type: str
    category: str
    amount: float
    description: Optional[str] = ""
    project_id: Optional[str] = None
    sponsor_id: Optional[str] = None
    date: Optional[str] = None

class FinanceResponse(BaseModel):
    id: str
    type: str
    category: str
    amount: float
    description: str
    project_id: Optional[str]
    sponsor_id: Optional[str]
    date: str
    created_by: str
    created_at: str

# Contact Models (v1.1 - with CRM features)
class ContactCreate(BaseModel):
    name: str
    email: Optional[str] = ""
    phone: Optional[str] = ""
    company: Optional[str] = ""
    type: str = "partner"
    notes: Optional[str] = ""
    relationship_tags: List[str] = []  # VIP, Strategic, New, etc.
    priority: int = 3  # 1-5, 1 being highest
    last_interaction: Optional[str] = None
    next_followup: Optional[str] = None

class ContactResponse(BaseModel):
    id: str
    name: str
    email: str
    phone: str
    company: str
    type: str
    notes: str
    relationship_tags: List[str]
    priority: int
    last_interaction: Optional[str]
    next_followup: Optional[str]
    created_by: str
    created_at: str

# Event Models (v1.1 - with logistics)
class EventCreate(BaseModel):
    title: str
    description: Optional[str] = ""
    date: str
    end_date: Optional[str] = None
    location: Optional[str] = ""
    checklist: List[Dict[str, Any]] = []  # {item: str, completed: bool}
    project_id: Optional[str] = None
    status: str = "upcoming"
    staff: List[str] = []  # User IDs assigned
    equipment: List[Dict[str, Any]] = []  # {name: str, quantity: int, status: str}
    event_budget: float = 0.0
    template_id: Optional[str] = None

class EventResponse(BaseModel):
    id: str
    title: str
    description: str
    date: str
    end_date: Optional[str]
    location: str
    checklist: List[Dict[str, Any]]
    project_id: Optional[str]
    status: str
    staff: List[str]
    equipment: List[Dict[str, Any]]
    event_budget: float
    template_id: Optional[str]
    created_by: str
    created_at: str

# Checklist Template Models
class ChecklistTemplateCreate(BaseModel):
    name: str
    items: List[str]
    category: str = "general"

class ChecklistTemplateResponse(BaseModel):
    id: str
    name: str
    items: List[str]
    category: str
    created_by: str
    created_at: str

# Note/Decision Models (v1.1 - new)
class NoteCreate(BaseModel):
    project_id: str
    type: str = "note"  # note, meeting, decision, journal
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
    file_path: str
    file_size: int
    uploaded_by: str
    created_at: str

# KPI Models
class KPICreate(BaseModel):
    name: str
    value: float
    unit: str = ""
    category: str = "general"
    target: Optional[float] = None
    period: str = "monthly"

class KPIResponse(BaseModel):
    id: str
    name: str
    value: float
    unit: str
    category: str
    target: Optional[float]
    period: str
    created_by: str
    created_at: str

# Alert Models (v1.1 - new)
class AlertResponse(BaseModel):
    id: str
    type: str  # overdue_task, budget_alert, event_deadline
    severity: str  # low, medium, high, critical
    title: str
    message: str
    entity_type: str
    entity_id: str
    created_at: str
    is_read: bool = False

# ============== HELPER FUNCTIONS ==============

def create_token(user_id: str) -> str:
    payload = {
        "sub": user_id,
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

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
    return user

def check_role(required_roles: List[str]):
    async def role_checker(user: dict = Depends(get_current_user)):
        if user["role"] not in required_roles:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        return user
    return role_checker

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
    
    user_doc = {
        "id": user_id,
        "email": user_data.email,
        "password": hashed_password,
        "name": user_data.name,
        "role": role,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.users.insert_one(user_doc)
    
    token = create_token(user_id)
    user_response = UserResponse(
        id=user_id,
        email=user_data.email,
        name=user_data.name,
        role=role,
        created_at=user_doc["created_at"]
    )
    
    return TokenResponse(access_token=token, user=user_response)

@api_router.post("/auth/login", response_model=TokenResponse)
async def login(login_data: UserLogin):
    user = await db.users.find_one({"email": login_data.email}, {"_id": 0})
    if not user or not pwd_context.verify(login_data.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = create_token(user["id"])
    user_response = UserResponse(
        id=user["id"],
        email=user["email"],
        name=user["name"],
        role=user["role"],
        created_at=user["created_at"]
    )
    
    return TokenResponse(access_token=token, user=user_response)

@api_router.get("/auth/me", response_model=UserResponse)
async def get_me(user: dict = Depends(get_current_user)):
    return UserResponse(
        id=user["id"],
        email=user["email"],
        name=user["name"],
        role=user["role"],
        created_at=user["created_at"]
    )

# ============== USER ROUTES ==============

@api_router.get("/users", response_model=List[UserResponse])
async def get_users(user: dict = Depends(check_role(["admin"]))):
    users = await db.users.find({}, {"_id": 0, "password": 0}).to_list(1000)
    return [UserResponse(**u) for u in users]

@api_router.put("/users/{user_id}/role")
async def update_user_role(user_id: str, role: str, user: dict = Depends(check_role(["admin"]))):
    if role not in ["admin", "manager", "viewer"]:
        raise HTTPException(status_code=400, detail="Invalid role")
    await db.users.update_one({"id": user_id}, {"$set": {"role": role}})
    return {"message": "Role updated"}

@api_router.delete("/users/{user_id}")
async def delete_user(user_id: str, user: dict = Depends(check_role(["admin"]))):
    await db.users.delete_one({"id": user_id})
    return {"message": "User deleted"}

# ============== PROJECT ROUTES (v1.1) ==============

@api_router.get("/projects/categories")
async def get_project_categories():
    return PROJECT_CATEGORIES

async def get_project_progress(project_id: str) -> float:
    """Calculate project progress based on completed tasks"""
    total = await db.tasks.count_documents({"project_id": project_id})
    if total == 0:
        return 0.0
    done = await db.tasks.count_documents({"project_id": project_id, "status": "done"})
    return round((done / total) * 100, 1)

async def get_sub_projects(parent_id: str) -> List[dict]:
    """Get all sub-projects for a parent project"""
    subs = await db.projects.find({"parent_id": parent_id}, {"_id": 0}).to_list(100)
    return subs

@api_router.post("/projects", response_model=ProjectResponse)
async def create_project(project: ProjectCreate, user: dict = Depends(check_role(["admin", "manager"]))):
    project_id = str(uuid.uuid4())
    project_doc = {
        "id": project_id,
        **project.model_dump(),
        "created_by": user["id"],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.projects.insert_one(project_doc)
    return ProjectResponse(**{k: v for k, v in project_doc.items() if k != "_id"}, progress=0.0, sub_projects=[])

@api_router.get("/projects", response_model=List[ProjectResponse])
async def get_projects(
    category: Optional[str] = None,
    parent_only: bool = False,
    user: dict = Depends(get_current_user)
):
    query = {}
    if category:
        query["category"] = category
    if parent_only:
        query["parent_id"] = None
    
    projects = await db.projects.find(query, {"_id": 0}).to_list(1000)
    result = []
    for p in projects:
        progress = await get_project_progress(p["id"])
        subs = await get_sub_projects(p["id"])
        result.append(ProjectResponse(**p, progress=progress, sub_projects=subs))
    return result

@api_router.get("/projects/{project_id}", response_model=ProjectResponse)
async def get_project(project_id: str, user: dict = Depends(get_current_user)):
    project = await db.projects.find_one({"id": project_id}, {"_id": 0})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    progress = await get_project_progress(project_id)
    subs = await get_sub_projects(project_id)
    return ProjectResponse(**project, progress=progress, sub_projects=subs)

@api_router.put("/projects/{project_id}", response_model=ProjectResponse)
async def update_project(project_id: str, project: ProjectCreate, user: dict = Depends(check_role(["admin", "manager"]))):
    await db.projects.update_one({"id": project_id}, {"$set": project.model_dump()})
    updated = await db.projects.find_one({"id": project_id}, {"_id": 0})
    progress = await get_project_progress(project_id)
    subs = await get_sub_projects(project_id)
    return ProjectResponse(**updated, progress=progress, sub_projects=subs)

@api_router.delete("/projects/{project_id}")
async def delete_project(project_id: str, user: dict = Depends(check_role(["admin"]))):
    # Also delete sub-projects
    await db.projects.delete_many({"parent_id": project_id})
    await db.projects.delete_one({"id": project_id})
    return {"message": "Project deleted"}

# ============== TASK ROUTES (v1.1) ==============

async def check_task_blocked(task_id: str, depends_on: List[str]) -> bool:
    """Check if task is blocked by dependencies"""
    if not depends_on:
        return False
    blocking = await db.tasks.count_documents({
        "id": {"$in": depends_on},
        "status": {"$ne": "done"}
    })
    return blocking > 0

@api_router.post("/tasks", response_model=TaskResponse)
async def create_task(task: TaskCreate, user: dict = Depends(check_role(["admin", "manager"]))):
    task_id = str(uuid.uuid4())
    task_doc = {
        "id": task_id,
        **task.model_dump(),
        "created_by": user["id"],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.tasks.insert_one(task_doc)
    is_blocked = await check_task_blocked(task_id, task.depends_on)
    return TaskResponse(**{k: v for k, v in task_doc.items() if k != "_id"}, is_blocked=is_blocked)

@api_router.get("/tasks", response_model=List[TaskResponse])
async def get_tasks(
    project_id: Optional[str] = None,
    status: Optional[str] = None,
    user: dict = Depends(get_current_user)
):
    query = {}
    if project_id:
        query["project_id"] = project_id
    if status:
        query["status"] = status
    tasks = await db.tasks.find(query, {"_id": 0}).to_list(1000)
    result = []
    for t in tasks:
        is_blocked = await check_task_blocked(t["id"], t.get("depends_on", []))
        result.append(TaskResponse(**t, is_blocked=is_blocked))
    return result

@api_router.get("/tasks/kanban")
async def get_tasks_kanban(project_id: Optional[str] = None, user: dict = Depends(get_current_user)):
    """Get tasks grouped by status for Kanban board"""
    query = {}
    if project_id:
        query["project_id"] = project_id
    
    tasks = await db.tasks.find(query, {"_id": 0}).to_list(1000)
    
    kanban = {status: [] for status in TASK_STATUSES}
    for t in tasks:
        is_blocked = await check_task_blocked(t["id"], t.get("depends_on", []))
        task_resp = TaskResponse(**t, is_blocked=is_blocked)
        kanban[t.get("status", "backlog")].append(task_resp.model_dump())
    
    return kanban

@api_router.get("/tasks/{task_id}", response_model=TaskResponse)
async def get_task(task_id: str, user: dict = Depends(get_current_user)):
    task = await db.tasks.find_one({"id": task_id}, {"_id": 0})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    is_blocked = await check_task_blocked(task_id, task.get("depends_on", []))
    return TaskResponse(**task, is_blocked=is_blocked)

@api_router.put("/tasks/{task_id}", response_model=TaskResponse)
async def update_task(task_id: str, task: TaskCreate, user: dict = Depends(check_role(["admin", "manager"]))):
    await db.tasks.update_one({"id": task_id}, {"$set": task.model_dump()})
    updated = await db.tasks.find_one({"id": task_id}, {"_id": 0})
    is_blocked = await check_task_blocked(task_id, updated.get("depends_on", []))
    return TaskResponse(**updated, is_blocked=is_blocked)

@api_router.put("/tasks/{task_id}/status")
async def update_task_status(task_id: str, status: str, user: dict = Depends(check_role(["admin", "manager"]))):
    """Quick status update for Kanban drag-drop"""
    if status not in TASK_STATUSES:
        raise HTTPException(status_code=400, detail="Invalid status")
    await db.tasks.update_one({"id": task_id}, {"$set": {"status": status}})
    return {"message": "Status updated"}

@api_router.delete("/tasks/{task_id}")
async def delete_task(task_id: str, user: dict = Depends(check_role(["admin"]))):
    await db.tasks.delete_one({"id": task_id})
    return {"message": "Task deleted"}

# ============== FINANCE ROUTES ==============

@api_router.post("/finance", response_model=FinanceResponse)
async def create_finance(finance: FinanceCreate, user: dict = Depends(check_role(["admin", "manager"]))):
    finance_id = str(uuid.uuid4())
    finance_doc = {
        "id": finance_id,
        **finance.model_dump(),
        "date": finance.date or datetime.now(timezone.utc).isoformat(),
        "created_by": user["id"],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.finance.insert_one(finance_doc)
    return FinanceResponse(**{k: v for k, v in finance_doc.items() if k != "_id"})

@api_router.get("/finance", response_model=List[FinanceResponse])
async def get_finance(project_id: Optional[str] = None, user: dict = Depends(get_current_user)):
    query = {"project_id": project_id} if project_id else {}
    records = await db.finance.find(query, {"_id": 0}).to_list(1000)
    return [FinanceResponse(**r) for r in records]

@api_router.get("/finance/burn-rate")
async def get_burn_rate(project_id: Optional[str] = None, user: dict = Depends(get_current_user)):
    """Calculate burn rate for projects"""
    query = {"type": "expense"}
    if project_id:
        query["project_id"] = project_id
    
    # Get expenses from last 30 days
    thirty_days_ago = (datetime.now(timezone.utc) - timedelta(days=30)).isoformat()
    query["date"] = {"$gte": thirty_days_ago}
    
    expenses = await db.finance.find(query, {"_id": 0}).to_list(1000)
    total_expense = sum(e.get("amount", 0) for e in expenses)
    daily_burn = total_expense / 30
    
    # Get total budget
    if project_id:
        project = await db.projects.find_one({"id": project_id}, {"_id": 0})
        budget = project.get("budget", 0) if project else 0
    else:
        projects = await db.projects.find({}, {"_id": 0, "budget": 1}).to_list(1000)
        budget = sum(p.get("budget", 0) for p in projects)
    
    days_remaining = (budget - total_expense) / daily_burn if daily_burn > 0 else float('inf')
    
    return {
        "daily_burn_rate": round(daily_burn, 2),
        "monthly_burn_rate": round(daily_burn * 30, 2),
        "total_budget": budget,
        "spent": total_expense,
        "remaining": budget - total_expense,
        "days_remaining": round(days_remaining, 0) if days_remaining != float('inf') else None
    }

@api_router.put("/finance/{finance_id}", response_model=FinanceResponse)
async def update_finance(finance_id: str, finance: FinanceCreate, user: dict = Depends(check_role(["admin", "manager"]))):
    await db.finance.update_one({"id": finance_id}, {"$set": finance.model_dump()})
    updated = await db.finance.find_one({"id": finance_id}, {"_id": 0})
    return FinanceResponse(**updated)

@api_router.delete("/finance/{finance_id}")
async def delete_finance(finance_id: str, user: dict = Depends(check_role(["admin"]))):
    await db.finance.delete_one({"id": finance_id})
    return {"message": "Finance record deleted"}

# ============== CONTACT ROUTES (v1.1) ==============

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
    return ContactResponse(**{k: v for k, v in contact_doc.items() if k != "_id"})

@api_router.get("/contacts", response_model=List[ContactResponse])
async def get_contacts(
    type: Optional[str] = None,
    priority: Optional[int] = None,
    tag: Optional[str] = None,
    user: dict = Depends(get_current_user)
):
    query = {}
    if type:
        query["type"] = type
    if priority:
        query["priority"] = priority
    if tag:
        query["relationship_tags"] = tag
    contacts = await db.contacts.find(query, {"_id": 0}).to_list(1000)
    return [ContactResponse(**c) for c in contacts]

@api_router.get("/contacts/followups")
async def get_contact_followups(user: dict = Depends(get_current_user)):
    """Get contacts with pending follow-ups"""
    today = datetime.now(timezone.utc).isoformat()
    contacts = await db.contacts.find(
        {"next_followup": {"$lte": today, "$ne": None}},
        {"_id": 0}
    ).to_list(100)
    return [ContactResponse(**c) for c in contacts]

@api_router.get("/contacts/{contact_id}", response_model=ContactResponse)
async def get_contact(contact_id: str, user: dict = Depends(get_current_user)):
    contact = await db.contacts.find_one({"id": contact_id}, {"_id": 0})
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    return ContactResponse(**contact)

@api_router.put("/contacts/{contact_id}", response_model=ContactResponse)
async def update_contact(contact_id: str, contact: ContactCreate, user: dict = Depends(check_role(["admin", "manager"]))):
    await db.contacts.update_one({"id": contact_id}, {"$set": contact.model_dump()})
    updated = await db.contacts.find_one({"id": contact_id}, {"_id": 0})
    return ContactResponse(**updated)

@api_router.put("/contacts/{contact_id}/interaction")
async def log_interaction(contact_id: str, user: dict = Depends(check_role(["admin", "manager"]))):
    """Log a new interaction with contact"""
    now = datetime.now(timezone.utc).isoformat()
    await db.contacts.update_one({"id": contact_id}, {"$set": {"last_interaction": now}})
    return {"message": "Interaction logged", "timestamp": now}

@api_router.delete("/contacts/{contact_id}")
async def delete_contact(contact_id: str, user: dict = Depends(check_role(["admin"]))):
    await db.contacts.delete_one({"id": contact_id})
    return {"message": "Contact deleted"}

# ============== EVENT ROUTES (v1.1) ==============

@api_router.post("/events", response_model=EventResponse)
async def create_event(event: EventCreate, user: dict = Depends(check_role(["admin", "manager"]))):
    event_id = str(uuid.uuid4())
    
    # Convert checklist strings to objects if needed
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
    return EventResponse(**{k: v for k, v in event_doc.items() if k != "_id"})

@api_router.get("/events", response_model=List[EventResponse])
async def get_events(project_id: Optional[str] = None, user: dict = Depends(get_current_user)):
    query = {"project_id": project_id} if project_id else {}
    events = await db.events.find(query, {"_id": 0}).to_list(1000)
    return [EventResponse(**e) for e in events]

@api_router.get("/events/{event_id}", response_model=EventResponse)
async def get_event(event_id: str, user: dict = Depends(get_current_user)):
    event = await db.events.find_one({"id": event_id}, {"_id": 0})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    return EventResponse(**event)

@api_router.put("/events/{event_id}", response_model=EventResponse)
async def update_event(event_id: str, event: EventCreate, user: dict = Depends(check_role(["admin", "manager"]))):
    await db.events.update_one({"id": event_id}, {"$set": event.model_dump()})
    updated = await db.events.find_one({"id": event_id}, {"_id": 0})
    return EventResponse(**updated)

@api_router.put("/events/{event_id}/checklist/{item_index}")
async def toggle_checklist_item(event_id: str, item_index: int, user: dict = Depends(check_role(["admin", "manager"]))):
    """Toggle checklist item completion"""
    event = await db.events.find_one({"id": event_id}, {"_id": 0})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    checklist = event.get("checklist", [])
    if 0 <= item_index < len(checklist):
        checklist[item_index]["completed"] = not checklist[item_index].get("completed", False)
        await db.events.update_one({"id": event_id}, {"$set": {"checklist": checklist}})
    
    return {"message": "Checklist updated"}

@api_router.delete("/events/{event_id}")
async def delete_event(event_id: str, user: dict = Depends(check_role(["admin"]))):
    await db.events.delete_one({"id": event_id})
    return {"message": "Event deleted"}

# ============== CHECKLIST TEMPLATE ROUTES (v1.1) ==============

@api_router.post("/templates/checklist", response_model=ChecklistTemplateResponse)
async def create_checklist_template(template: ChecklistTemplateCreate, user: dict = Depends(check_role(["admin", "manager"]))):
    template_id = str(uuid.uuid4())
    template_doc = {
        "id": template_id,
        **template.model_dump(),
        "created_by": user["id"],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.checklist_templates.insert_one(template_doc)
    return ChecklistTemplateResponse(**{k: v for k, v in template_doc.items() if k != "_id"})

@api_router.get("/templates/checklist", response_model=List[ChecklistTemplateResponse])
async def get_checklist_templates(user: dict = Depends(get_current_user)):
    templates = await db.checklist_templates.find({}, {"_id": 0}).to_list(100)
    return [ChecklistTemplateResponse(**t) for t in templates]

@api_router.delete("/templates/checklist/{template_id}")
async def delete_checklist_template(template_id: str, user: dict = Depends(check_role(["admin"]))):
    await db.checklist_templates.delete_one({"id": template_id})
    return {"message": "Template deleted"}

# ============== NOTES/DECISIONS ROUTES (v1.1) ==============

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
    return NoteResponse(**{k: v for k, v in note_doc.items() if k != "_id"})

@api_router.get("/notes", response_model=List[NoteResponse])
async def get_notes(
    project_id: Optional[str] = None,
    type: Optional[str] = None,
    user: dict = Depends(get_current_user)
):
    query = {}
    if project_id:
        query["project_id"] = project_id
    if type:
        query["type"] = type
    notes = await db.notes.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return [NoteResponse(**n) for n in notes]

@api_router.get("/notes/{note_id}", response_model=NoteResponse)
async def get_note(note_id: str, user: dict = Depends(get_current_user)):
    note = await db.notes.find_one({"id": note_id}, {"_id": 0})
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    return NoteResponse(**note)

@api_router.put("/notes/{note_id}", response_model=NoteResponse)
async def update_note(note_id: str, note: NoteCreate, user: dict = Depends(check_role(["admin", "manager"]))):
    await db.notes.update_one({"id": note_id}, {"$set": note.model_dump()})
    updated = await db.notes.find_one({"id": note_id}, {"_id": 0})
    return NoteResponse(**updated)

@api_router.delete("/notes/{note_id}")
async def delete_note(note_id: str, user: dict = Depends(check_role(["admin"]))):
    await db.notes.delete_one({"id": note_id})
    return {"message": "Note deleted"}

# ============== DOCUMENT ROUTES ==============

@api_router.post("/documents", response_model=DocumentResponse)
async def upload_document(
    file: UploadFile = File(...),
    title: str = Form(...),
    category: str = Form("general"),
    project_id: Optional[str] = Form(None),
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
        "file_path": str(saved_filename),
        "file_size": file_size,
        "uploaded_by": user["id"],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.documents.insert_one(doc)
    return DocumentResponse(**{k: v for k, v in doc.items() if k != "_id"})

@api_router.get("/documents", response_model=List[DocumentResponse])
async def get_documents(project_id: Optional[str] = None, category: Optional[str] = None, user: dict = Depends(get_current_user)):
    query = {}
    if project_id:
        query["project_id"] = project_id
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
    return KPIResponse(**{k: v for k, v in kpi_doc.items() if k != "_id"})

@api_router.get("/kpis", response_model=List[KPIResponse])
async def get_kpis(category: Optional[str] = None, user: dict = Depends(get_current_user)):
    query = {"category": category} if category else {}
    kpis = await db.kpis.find(query, {"_id": 0}).to_list(1000)
    return [KPIResponse(**k) for k in kpis]

@api_router.put("/kpis/{kpi_id}", response_model=KPIResponse)
async def update_kpi(kpi_id: str, kpi: KPICreate, user: dict = Depends(check_role(["admin", "manager"]))):
    await db.kpis.update_one({"id": kpi_id}, {"$set": kpi.model_dump()})
    updated = await db.kpis.find_one({"id": kpi_id}, {"_id": 0})
    return KPIResponse(**updated)

@api_router.delete("/kpis/{kpi_id}")
async def delete_kpi(kpi_id: str, user: dict = Depends(check_role(["admin"]))):
    await db.kpis.delete_one({"id": kpi_id})
    return {"message": "KPI deleted"}

# ============== ALERTS ROUTES (v1.1) ==============

@api_router.get("/alerts", response_model=List[AlertResponse])
async def get_alerts(user: dict = Depends(get_current_user)):
    """Generate and return all active alerts"""
    alerts = []
    now = datetime.now(timezone.utc)
    today = now.isoformat()
    
    # Overdue tasks
    overdue_tasks = await db.tasks.find({
        "deadline": {"$lt": today, "$ne": None},
        "status": {"$ne": "done"}
    }, {"_id": 0}).to_list(100)
    
    for task in overdue_tasks:
        alerts.append(AlertResponse(
            id=f"task-overdue-{task['id']}",
            type="overdue_task",
            severity="high",
            title=f"Tâche en retard: {task['title']}",
            message=f"Échéance: {task['deadline']}",
            entity_type="task",
            entity_id=task['id'],
            created_at=today
        ))
    
    # Event deadlines (within 3 days)
    three_days = (now + timedelta(days=3)).isoformat()
    upcoming_events = await db.events.find({
        "date": {"$gte": today, "$lte": three_days},
        "status": "upcoming"
    }, {"_id": 0}).to_list(100)
    
    for event in upcoming_events:
        alerts.append(AlertResponse(
            id=f"event-deadline-{event['id']}",
            type="event_deadline",
            severity="medium",
            title=f"Événement imminent: {event['title']}",
            message=f"Date: {event['date']}",
            entity_type="event",
            entity_id=event['id'],
            created_at=today
        ))
    
    # Budget alerts (spent > 80% of budget)
    projects = await db.projects.find({"budget": {"$gt": 0}}, {"_id": 0}).to_list(100)
    for project in projects:
        expenses = await db.finance.find({
            "project_id": project['id'],
            "type": "expense"
        }, {"_id": 0}).to_list(1000)
        total_spent = sum(e.get("amount", 0) for e in expenses)
        
        if total_spent >= project['budget'] * 0.8:
            severity = "critical" if total_spent >= project['budget'] else "high"
            alerts.append(AlertResponse(
                id=f"budget-{project['id']}",
                type="budget_alert",
                severity=severity,
                title=f"Alerte budget: {project['name']}",
                message=f"Dépensé: ${total_spent:,.0f} / ${project['budget']:,.0f}",
                entity_type="project",
                entity_id=project['id'],
                created_at=today
            ))
    
    # Contact follow-ups due
    followups = await db.contacts.find({
        "next_followup": {"$lte": today, "$ne": None}
    }, {"_id": 0}).to_list(100)
    
    for contact in followups:
        alerts.append(AlertResponse(
            id=f"followup-{contact['id']}",
            type="followup_due",
            severity="low",
            title=f"Relance: {contact['name']}",
            message=f"Prévu: {contact['next_followup']}",
            entity_type="contact",
            entity_id=contact['id'],
            created_at=today
        ))
    
    return sorted(alerts, key=lambda x: {"critical": 0, "high": 1, "medium": 2, "low": 3}.get(x.severity, 4))

# ============== GLOBAL SEARCH (v1.1) ==============

@api_router.get("/search")
async def global_search(q: str = Query(..., min_length=2), user: dict = Depends(get_current_user)):
    """Search across all entities"""
    results = {
        "projects": [],
        "tasks": [],
        "contacts": [],
        "events": [],
        "documents": [],
        "notes": []
    }
    
    regex = {"$regex": q, "$options": "i"}
    
    # Search projects
    projects = await db.projects.find({
        "$or": [{"name": regex}, {"description": regex}]
    }, {"_id": 0}).to_list(20)
    results["projects"] = projects
    
    # Search tasks
    tasks = await db.tasks.find({
        "$or": [{"title": regex}, {"description": regex}]
    }, {"_id": 0}).to_list(20)
    results["tasks"] = tasks
    
    # Search contacts
    contacts = await db.contacts.find({
        "$or": [{"name": regex}, {"email": regex}, {"company": regex}]
    }, {"_id": 0}).to_list(20)
    results["contacts"] = contacts
    
    # Search events
    events = await db.events.find({
        "$or": [{"title": regex}, {"description": regex}, {"location": regex}]
    }, {"_id": 0}).to_list(20)
    results["events"] = events
    
    # Search documents
    documents = await db.documents.find({
        "$or": [{"title": regex}, {"filename": regex}]
    }, {"_id": 0}).to_list(20)
    results["documents"] = documents
    
    # Search notes
    notes = await db.notes.find({
        "$or": [{"title": regex}, {"content": regex}]
    }, {"_id": 0}).to_list(20)
    results["notes"] = notes
    
    return results

# ============== DASHBOARD ROUTES (v1.1) ==============

@api_router.get("/dashboard/stats")
async def get_dashboard_stats(user: dict = Depends(get_current_user)):
    projects_count = await db.projects.count_documents({})
    active_projects = await db.projects.count_documents({"status": {"$in": ["planning", "in_progress"]}})
    tasks_count = await db.tasks.count_documents({})
    urgent_tasks = await db.tasks.count_documents({"priority": "urgent", "status": {"$ne": "done"}})
    contacts_count = await db.contacts.count_documents({})
    events_count = await db.events.count_documents({})
    
    revenue_pipeline = [
        {"$match": {"type": "revenue"}},
        {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
    ]
    expense_pipeline = [
        {"$match": {"type": "expense"}},
        {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
    ]
    
    revenue_result = await db.finance.aggregate(revenue_pipeline).to_list(1)
    expense_result = await db.finance.aggregate(expense_pipeline).to_list(1)
    
    total_revenue = revenue_result[0]["total"] if revenue_result else 0
    total_expenses = expense_result[0]["total"] if expense_result else 0
    
    now = datetime.now(timezone.utc).isoformat()
    upcoming_events = await db.events.find(
        {"date": {"$gte": now}, "status": "upcoming"},
        {"_id": 0}
    ).sort("date", 1).limit(5).to_list(5)
    
    recent_tasks = await db.tasks.find(
        {"status": {"$ne": "done"}},
        {"_id": 0}
    ).sort("created_at", -1).limit(5).to_list(5)
    
    return {
        "projects": {"total": projects_count, "active": active_projects},
        "tasks": {"total": tasks_count, "urgent": urgent_tasks},
        "contacts": contacts_count,
        "events": events_count,
        "finance": {
            "revenue": total_revenue,
            "expenses": total_expenses,
            "profit": total_revenue - total_expenses
        },
        "upcoming_events": upcoming_events,
        "recent_tasks": recent_tasks
    }

@api_router.get("/dashboard/heatmap")
async def get_project_heatmap(user: dict = Depends(get_current_user)):
    """Get urgency heatmap for projects"""
    projects = await db.projects.find({"status": {"$ne": "completed"}}, {"_id": 0}).to_list(100)
    
    heatmap = []
    now = datetime.now(timezone.utc)
    
    for project in projects:
        urgency_score = 0
        
        # Check deadline proximity
        if project.get("deadline"):
            try:
                deadline = datetime.fromisoformat(project["deadline"].replace("Z", "+00:00"))
                days_until = (deadline - now).days
                if days_until < 0:
                    urgency_score += 50  # Overdue
                elif days_until < 7:
                    urgency_score += 30  # Within a week
                elif days_until < 30:
                    urgency_score += 10
            except:
                pass
        
        # Check urgent tasks
        urgent_count = await db.tasks.count_documents({
            "project_id": project["id"],
            "priority": {"$in": ["urgent", "high"]},
            "status": {"$ne": "done"}
        })
        urgency_score += urgent_count * 10
        
        # Check overdue tasks
        overdue_count = await db.tasks.count_documents({
            "project_id": project["id"],
            "deadline": {"$lt": now.isoformat()},
            "status": {"$ne": "done"}
        })
        urgency_score += overdue_count * 20
        
        # Calculate progress
        total_tasks = await db.tasks.count_documents({"project_id": project["id"]})
        done_tasks = await db.tasks.count_documents({"project_id": project["id"], "status": "done"})
        progress = (done_tasks / total_tasks * 100) if total_tasks > 0 else 0
        
        heatmap.append({
            "id": project["id"],
            "name": project["name"],
            "category": project.get("category", "Other"),
            "urgency_score": min(urgency_score, 100),
            "progress": round(progress, 1),
            "status": project["status"],
            "deadline": project.get("deadline")
        })
    
    return sorted(heatmap, key=lambda x: x["urgency_score"], reverse=True)

@api_router.get("/dashboard/weekly-summary")
async def get_weekly_summary(user: dict = Depends(get_current_user)):
    """Get weekly execution summary"""
    now = datetime.now(timezone.utc)
    week_ago = (now - timedelta(days=7)).isoformat()
    
    # Tasks completed this week
    tasks_completed = await db.tasks.count_documents({
        "status": "done",
        "created_at": {"$gte": week_ago}
    })
    
    # Tasks created this week
    tasks_created = await db.tasks.count_documents({
        "created_at": {"$gte": week_ago}
    })
    
    # Events this week
    week_end = (now + timedelta(days=7)).isoformat()
    events_this_week = await db.events.count_documents({
        "date": {"$gte": now.isoformat(), "$lte": week_end}
    })
    
    # Financial activity
    revenue_week = await db.finance.find({
        "type": "revenue",
        "date": {"$gte": week_ago}
    }, {"_id": 0}).to_list(100)
    expense_week = await db.finance.find({
        "type": "expense",
        "date": {"$gte": week_ago}
    }, {"_id": 0}).to_list(100)
    
    total_revenue = sum(r.get("amount", 0) for r in revenue_week)
    total_expenses = sum(e.get("amount", 0) for e in expense_week)
    
    # Notes/meetings this week
    notes_count = await db.notes.count_documents({
        "created_at": {"$gte": week_ago}
    })
    
    return {
        "tasks_completed": tasks_completed,
        "tasks_created": tasks_created,
        "completion_rate": round(tasks_completed / tasks_created * 100, 1) if tasks_created > 0 else 0,
        "events_upcoming": events_this_week,
        "revenue_week": total_revenue,
        "expenses_week": total_expenses,
        "notes_created": notes_count
    }

# Include the router
app.include_router(api_router)

# Mount static files for uploads
app.mount("/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
