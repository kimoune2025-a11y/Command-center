from fastapi import FastAPI, APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional
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
JWT_SECRET = os.environ['JWT_SECRET']
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24

# Login brute-force protection
MAX_LOGIN_ATTEMPTS = 5
LOCKOUT_MINUTES = 15

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# File upload directory
UPLOAD_DIR = ROOT_DIR / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)

# Create the main app
app = FastAPI(title="CVLN Command Center API v1.0")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Security
security = HTTPBearer()

# ============== MODELS ==============

class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)
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

class ProjectCreate(BaseModel):
    name: str
    description: Optional[str] = ""
    status: str = "planning"
    deadline: Optional[str] = None
    team_members: List[str] = []
    budget: float = 0.0
    entity_id: Optional[str] = None

class ProjectResponse(BaseModel):
    id: str
    name: str
    description: str
    status: str
    deadline: Optional[str]
    team_members: List[str]
    budget: float
    entity_id: Optional[str] = None
    created_by: str
    created_at: str

class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = ""
    priority: str = "medium"
    status: str = "todo"
    deadline: Optional[str] = None
    assigned_to: Optional[str] = None
    project_id: Optional[str] = None

class TaskResponse(BaseModel):
    id: str
    title: str
    description: str
    priority: str
    status: str
    deadline: Optional[str]
    assigned_to: Optional[str]
    project_id: Optional[str]
    created_by: str
    created_at: str

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

class ContactCreate(BaseModel):
    name: str
    email: Optional[str] = ""
    phone: Optional[str] = ""
    company: Optional[str] = ""
    type: str = "partner"
    notes: Optional[str] = ""

class ContactResponse(BaseModel):
    id: str
    name: str
    email: str
    phone: str
    company: str
    type: str
    notes: str
    created_by: str
    created_at: str

class EventCreate(BaseModel):
    title: str
    description: Optional[str] = ""
    date: str
    end_date: Optional[str] = None
    location: Optional[str] = ""
    checklist: List[str] = []
    project_id: Optional[str] = None
    status: str = "upcoming"

class EventResponse(BaseModel):
    id: str
    title: str
    description: str
    date: str
    end_date: Optional[str]
    location: str
    checklist: List[str]
    project_id: Optional[str]
    status: str
    created_by: str
    created_at: str

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

class EntityCreate(BaseModel):
    name: str
    description: Optional[str] = ""
    type: str = "other"
    color: str = "#D4AF37"

class EntityResponse(BaseModel):
    id: str
    name: str
    description: str
    type: str
    color: str
    created_by: str
    created_at: str

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

# ============== LOGIN BRUTE-FORCE HELPERS ==============

async def check_login_lockout(identifier: str):
    rec = await db.login_attempts.find_one({"identifier": identifier})
    if rec and rec.get("count", 0) >= MAX_LOGIN_ATTEMPTS:
        locked_until = rec.get("locked_until")
        if locked_until and locked_until > datetime.now(timezone.utc).isoformat():
            raise HTTPException(status_code=429, detail="Too many failed attempts. Please try again later.")

async def register_failed_login(identifier: str):
    rec = await db.login_attempts.find_one({"identifier": identifier})
    count = (rec.get("count", 0) if rec else 0) + 1
    update = {"count": count, "updated_at": datetime.now(timezone.utc).isoformat()}
    if count >= MAX_LOGIN_ATTEMPTS:
        update["locked_until"] = (datetime.now(timezone.utc) + timedelta(minutes=LOCKOUT_MINUTES)).isoformat()
    await db.login_attempts.update_one({"identifier": identifier}, {"$set": update}, upsert=True)

async def clear_login_attempts(identifier: str):
    await db.login_attempts.delete_one({"identifier": identifier})

# ============== AUTH ROUTES ==============

@api_router.post("/auth/register", response_model=TokenResponse)
async def register(user_data: UserCreate):
    email = user_data.email.lower().strip()
    existing = await db.users.find_one({"email": email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Force role to be viewer or manager only - admin cannot be self-assigned
    allowed_roles = ["viewer", "manager"]
    role = user_data.role if user_data.role in allowed_roles else "viewer"
    
    user_id = str(uuid.uuid4())
    hashed_password = pwd_context.hash(user_data.password)
    
    user_doc = {
        "id": user_id,
        "email": email,
        "password": hashed_password,
        "name": user_data.name,
        "role": role,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.users.insert_one(user_doc)
    
    token = create_token(user_id)
    user_response = UserResponse(
        id=user_id,
        email=email,
        name=user_data.name,
        role=role,
        created_at=user_doc["created_at"]
    )
    
    return TokenResponse(access_token=token, user=user_response)

@api_router.post("/auth/login", response_model=TokenResponse)
async def login(login_data: UserLogin):
    email = login_data.email.lower().strip()
    await check_login_lockout(email)
    user = await db.users.find_one({"email": email}, {"_id": 0})
    if not user or not pwd_context.verify(login_data.password, user["password"]):
        await register_failed_login(email)
        raise HTTPException(status_code=401, detail="Invalid credentials")
    await clear_login_attempts(email)
    
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

# ============== USER ROUTES (Admin Only) ==============

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

# ============== PROJECT ROUTES ==============

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
    return ProjectResponse(**{k: v for k, v in project_doc.items() if k != "_id"})

@api_router.get("/projects", response_model=List[ProjectResponse])
async def get_projects(user: dict = Depends(get_current_user)):
    projects = await db.projects.find({}, {"_id": 0}).to_list(1000)
    return [ProjectResponse(**p) for p in projects]

@api_router.get("/projects/{project_id}", response_model=ProjectResponse)
async def get_project(project_id: str, user: dict = Depends(get_current_user)):
    project = await db.projects.find_one({"id": project_id}, {"_id": 0})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return ProjectResponse(**project)

@api_router.put("/projects/{project_id}", response_model=ProjectResponse)
async def update_project(project_id: str, project: ProjectCreate, user: dict = Depends(check_role(["admin", "manager"]))):
    await db.projects.update_one({"id": project_id}, {"$set": project.model_dump()})
    updated = await db.projects.find_one({"id": project_id}, {"_id": 0})
    return ProjectResponse(**updated)

@api_router.delete("/projects/{project_id}")
async def delete_project(project_id: str, user: dict = Depends(check_role(["admin"]))):
    await db.projects.delete_one({"id": project_id})
    return {"message": "Project deleted"}

# ============== TASK ROUTES ==============

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
    return TaskResponse(**{k: v for k, v in task_doc.items() if k != "_id"})

@api_router.get("/tasks", response_model=List[TaskResponse])
async def get_tasks(project_id: Optional[str] = None, user: dict = Depends(get_current_user)):
    query = {"project_id": project_id} if project_id else {}
    tasks = await db.tasks.find(query, {"_id": 0}).to_list(1000)
    return [TaskResponse(**t) for t in tasks]

@api_router.get("/tasks/{task_id}", response_model=TaskResponse)
async def get_task(task_id: str, user: dict = Depends(get_current_user)):
    task = await db.tasks.find_one({"id": task_id}, {"_id": 0})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return TaskResponse(**task)

@api_router.put("/tasks/{task_id}", response_model=TaskResponse)
async def update_task(task_id: str, task: TaskCreate, user: dict = Depends(check_role(["admin", "manager"]))):
    await db.tasks.update_one({"id": task_id}, {"$set": task.model_dump()})
    updated = await db.tasks.find_one({"id": task_id}, {"_id": 0})
    return TaskResponse(**updated)

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

@api_router.put("/finance/{finance_id}", response_model=FinanceResponse)
async def update_finance(finance_id: str, finance: FinanceCreate, user: dict = Depends(check_role(["admin", "manager"]))):
    await db.finance.update_one({"id": finance_id}, {"$set": finance.model_dump(exclude_none=True)})
    updated = await db.finance.find_one({"id": finance_id}, {"_id": 0})
    return FinanceResponse(**updated)

@api_router.delete("/finance/{finance_id}")
async def delete_finance(finance_id: str, user: dict = Depends(check_role(["admin"]))):
    await db.finance.delete_one({"id": finance_id})
    return {"message": "Finance record deleted"}

# ============== CONTACT ROUTES ==============

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
async def get_contacts(type: Optional[str] = None, user: dict = Depends(get_current_user)):
    query = {"type": type} if type else {}
    contacts = await db.contacts.find(query, {"_id": 0}).to_list(1000)
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

@api_router.delete("/contacts/{contact_id}")
async def delete_contact(contact_id: str, user: dict = Depends(check_role(["admin"]))):
    await db.contacts.delete_one({"id": contact_id})
    return {"message": "Contact deleted"}

# ============== EVENT ROUTES ==============

@api_router.post("/events", response_model=EventResponse)
async def create_event(event: EventCreate, user: dict = Depends(check_role(["admin", "manager"]))):
    event_id = str(uuid.uuid4())
    event_doc = {
        "id": event_id,
        **event.model_dump(),
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

@api_router.delete("/events/{event_id}")
async def delete_event(event_id: str, user: dict = Depends(check_role(["admin"]))):
    await db.events.delete_one({"id": event_id})
    return {"message": "Event deleted"}

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

# ============== DASHBOARD ROUTES ==============

@api_router.get("/dashboard/stats")
async def get_dashboard_stats(user: dict = Depends(get_current_user)):
    projects_count = await db.projects.count_documents({})
    active_projects = await db.projects.count_documents({"status": {"$in": ["planning", "in_progress"]}})
    tasks_count = await db.tasks.count_documents({})
    urgent_tasks = await db.tasks.count_documents({"priority": "urgent", "status": {"$ne": "completed"}})
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
        {"status": {"$ne": "completed"}},
        {"_id": 0}
    ).sort("created_at", -1).limit(5).to_list(5)
    
    return {
        "projects": {
            "total": projects_count,
            "active": active_projects
        },
        "tasks": {
            "total": tasks_count,
            "urgent": urgent_tasks
        },
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

# ============== ENTITY ROUTES ==============

@api_router.post("/entities", response_model=EntityResponse)
async def create_entity(entity: EntityCreate, user: dict = Depends(check_role(["admin", "manager"]))):
    entity_id = str(uuid.uuid4())
    entity_doc = {
        "id": entity_id,
        **entity.model_dump(),
        "created_by": user["id"],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.entities.insert_one(entity_doc)
    return EntityResponse(**{k: v for k, v in entity_doc.items() if k != "_id"})

@api_router.get("/entities", response_model=List[EntityResponse])
async def get_entities(user: dict = Depends(get_current_user)):
    entities = await db.entities.find({}, {"_id": 0}).to_list(1000)
    return [EntityResponse(**e) for e in entities]

@api_router.get("/entities/{entity_id}", response_model=EntityResponse)
async def get_entity(entity_id: str, user: dict = Depends(get_current_user)):
    entity = await db.entities.find_one({"id": entity_id}, {"_id": 0})
    if not entity:
        raise HTTPException(status_code=404, detail="Entity not found")
    return EntityResponse(**entity)

@api_router.put("/entities/{entity_id}", response_model=EntityResponse)
async def update_entity(entity_id: str, entity: EntityCreate, user: dict = Depends(check_role(["admin", "manager"]))):
    await db.entities.update_one({"id": entity_id}, {"$set": entity.model_dump(exclude_none=True)})
    updated = await db.entities.find_one({"id": entity_id}, {"_id": 0})
    if not updated:
        raise HTTPException(status_code=404, detail="Entity not found")
    return EntityResponse(**updated)

@api_router.delete("/entities/{entity_id}")
async def delete_entity(entity_id: str, user: dict = Depends(check_role(["admin"]))):
    await db.entities.delete_one({"id": entity_id})
    await db.projects.update_many({"entity_id": entity_id}, {"$set": {"entity_id": None}})
    return {"message": "Entity deleted"}

# ============== BOARD PACK ROUTE ==============

@api_router.get("/board-pack")
async def get_board_pack(user: dict = Depends(get_current_user)):
    entities = await db.entities.find({}, {"_id": 0}).to_list(1000)
    projects = await db.projects.find({}, {"_id": 0}).to_list(5000)
    tasks = await db.tasks.find({}, {"_id": 0}).to_list(10000)
    finance = await db.finance.find({}, {"_id": 0}).to_list(10000)

    project_to_entity = {p["id"]: p.get("entity_id") for p in projects}
    project_names = {p["id"]: p["name"] for p in projects}
    entity_names = {e["id"]: e["name"] for e in entities}

    # Per-entity aggregation
    def empty_perf():
        return {"projects_count": 0, "total_budget": 0.0, "revenue": 0.0, "expenses": 0.0, "profit": 0.0}

    perf = {e["id"]: empty_perf() for e in entities}
    unassigned = empty_perf()

    for p in projects:
        eid = p.get("entity_id")
        bucket = perf.get(eid) if eid in perf else unassigned
        bucket["projects_count"] += 1
        bucket["total_budget"] += float(p.get("budget") or 0)

    for f in finance:
        eid = project_to_entity.get(f.get("project_id"))
        bucket = perf.get(eid) if eid in perf else unassigned
        amount = float(f.get("amount") or 0)
        if f.get("type") == "revenue":
            bucket["revenue"] += amount
        elif f.get("type") == "expense":
            bucket["expenses"] += amount

    entity_perf = []
    for e in entities:
        b = perf[e["id"]]
        b["profit"] = b["revenue"] - b["expenses"]
        entity_perf.append({
            "id": e["id"], "name": e["name"], "type": e["type"], "color": e["color"],
            **b
        })
    unassigned["profit"] = unassigned["revenue"] - unassigned["expenses"]

    # Top 10 priorities (open tasks)
    priority_weight = {"urgent": 4, "high": 3, "medium": 2, "low": 1}
    open_tasks = [t for t in tasks if t.get("status") != "completed"]

    def task_sort_key(t):
        return (-priority_weight.get(t.get("priority"), 0), t.get("deadline") or "9999-12-31")

    open_tasks.sort(key=task_sort_key)
    top_priorities = []
    for t in open_tasks[:10]:
        eid = project_to_entity.get(t.get("project_id"))
        top_priorities.append({
            "id": t["id"], "title": t["title"], "priority": t.get("priority"),
            "status": t.get("status"), "deadline": t.get("deadline"),
            "project_name": project_names.get(t.get("project_id")),
            "entity_name": entity_names.get(eid) if eid else None
        })

    # Risk summary (derived)
    now_iso = datetime.now(timezone.utc).isoformat()
    overdue_tasks = [t for t in open_tasks if t.get("deadline") and t["deadline"] < now_iso]
    projects_on_hold = [p for p in projects if p.get("status") == "on_hold"]
    over_budget = [ep for ep in entity_perf if ep["total_budget"] > 0 and ep["expenses"] > ep["total_budget"]]

    total_revenue = sum(float(f.get("amount") or 0) for f in finance if f.get("type") == "revenue")
    total_expenses = sum(float(f.get("amount") or 0) for f in finance if f.get("type") == "expense")
    net_cash = total_revenue - total_expenses

    risk_items = []
    for t in overdue_tasks[:5]:
        risk_items.append({"type": "overdue_task", "label": t["title"], "severity": "high"})
    for p in projects_on_hold[:5]:
        risk_items.append({"type": "project_on_hold", "label": p["name"], "severity": "medium"})
    for ep in over_budget[:5]:
        risk_items.append({"type": "over_budget", "label": ep["name"], "severity": "high"})
    if net_cash < 0:
        risk_items.append({"type": "negative_cashflow", "label": "Net cash negative", "severity": "high"})

    risk_summary = {
        "overdue_tasks": len(overdue_tasks),
        "projects_on_hold": len(projects_on_hold),
        "over_budget_entities": len(over_budget),
        "negative_cashflow": net_cash < 0,
        "items": risk_items
    }

    # Treasury / cash runway
    thirty_days_ago = (datetime.now(timezone.utc) - timedelta(days=30)).isoformat()
    monthly_burn = sum(
        float(f.get("amount") or 0) for f in finance
        if f.get("type") == "expense" and (f.get("date") or "") >= thirty_days_ago
    )
    runway_months = None
    if monthly_burn > 0 and net_cash > 0:
        runway_months = round(net_cash / monthly_burn, 1)

    treasury = {
        "total_revenue": total_revenue,
        "total_expenses": total_expenses,
        "net_cash": net_cash,
        "monthly_burn": monthly_burn,
        "runway_months": runway_months
    }

    return {
        "entity_performance": entity_perf,
        "unassigned": unassigned,
        "top_priorities": top_priorities,
        "risk_summary": risk_summary,
        "treasury": treasury,
        "totals": {
            "entities": len(entities),
            "projects": len(projects),
            "open_tasks": len(open_tasks)
        }
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
