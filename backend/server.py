from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends, Query
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import uuid
import requests
from datetime import datetime, timezone, timedelta

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ======================== MODELS ========================

class UserCreate(BaseModel):
    name: str
    email: str
    role: str = "student"
    phone: Optional[str] = None
    batch: Optional[str] = None
    course: Optional[str] = None
    exam_year: Optional[str] = None
    optional_subject: Optional[str] = None
    profile_photo_url: Optional[str] = None
    is_active: bool = True

class UserUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    batch: Optional[str] = None
    course: Optional[str] = None
    exam_year: Optional[str] = None
    optional_subject: Optional[str] = None
    is_active: Optional[bool] = None
    role: Optional[str] = None

class MappingCreate(BaseModel):
    mentor_id: str
    student_id: str

class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = None
    assigned_to: Optional[str] = None
    due_date: Optional[str] = None
    broadcast: bool = False

class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    due_date: Optional[str] = None

class SessionCreate(BaseModel):
    student_id: str
    scheduled_at: str
    duration_minutes: int = 30
    agenda: Optional[str] = None

class SessionUpdate(BaseModel):
    scheduled_at: Optional[str] = None
    duration_minutes: Optional[int] = None
    agenda: Optional[str] = None
    session_notes: Optional[str] = None
    status: Optional[str] = None

class TrackerUpdate(BaseModel):
    status: Optional[str] = None
    completion_pct: Optional[int] = None
    study_hours: Optional[float] = None
    date_started: Optional[str] = None
    date_completed: Optional[str] = None
    student_notes: Optional[str] = None
    mentor_feedback: Optional[str] = None
    priority: Optional[str] = None
    deadline: Optional[str] = None
    revision_count: Optional[int] = None

class AnnouncementCreate(BaseModel):
    title: str
    body: str
    target_batch: Optional[str] = None
    target_course: Optional[str] = None

# ======================== AUTH HELPER ========================

async def get_current_user(request: Request):
    token = request.cookies.get("session_token")
    if not token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    session = await db.user_sessions.find_one({"session_token": token}, {"_id": 0})
    if not session:
        raise HTTPException(status_code=401, detail="Invalid session")
    expires_at = session["expires_at"]
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="Session expired")
    user = await db.users.find_one({"user_id": session["user_id"]}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user

async def get_optional_user(request: Request):
    try:
        return await get_current_user(request)
    except HTTPException:
        return None

# ======================== AUTH ROUTES ========================

@api_router.post("/auth/session")
async def exchange_session(request: Request, response: Response):
    body = await request.json()
    session_id = body.get("session_id")
    if not session_id:
        raise HTTPException(status_code=400, detail="session_id required")
    # REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
    try:
        resp = requests.get(
            "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
            headers={"X-Session-ID": session_id}
        )
        if resp.status_code != 200:
            raise HTTPException(status_code=401, detail="Invalid session from auth provider")
        data = resp.json()
    except Exception as e:
        logger.error(f"Auth error: {e}")
        raise HTTPException(status_code=401, detail="Auth provider error")

    email = data.get("email", "").lower()
    user = await db.users.find_one({"email": email}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=403, detail="User not registered with Sleepy Classes. Contact admin.")

    session_token = f"session_{uuid.uuid4().hex}"
    await db.user_sessions.insert_one({
        "session_token": session_token,
        "user_id": user["user_id"],
        "expires_at": datetime.now(timezone.utc) + timedelta(days=7),
        "created_at": datetime.now(timezone.utc)
    })
    if data.get("picture"):
        await db.users.update_one({"user_id": user["user_id"]}, {"$set": {"profile_photo_url": data["picture"]}})
        user["profile_photo_url"] = data["picture"]
    if data.get("name") and not user.get("name"):
        await db.users.update_one({"user_id": user["user_id"]}, {"$set": {"name": data["name"]}})
        user["name"] = data["name"]

    response.set_cookie("session_token", session_token, max_age=7*24*60*60, httponly=True, secure=True, samesite="none", path="/")
    return {"user": user, "session_token": session_token}

@api_router.get("/auth/me")
async def get_me(user=Depends(get_current_user)):
    mapping = None
    if user["role"] == "student":
        mapping = await db.mentor_student_mappings.find_one({"student_id": user["user_id"]}, {"_id": 0})
        if mapping:
            mentor = await db.users.find_one({"user_id": mapping["mentor_id"]}, {"_id": 0})
            user["mentor"] = mentor
    elif user["role"] == "mentor":
        mentees = await db.mentor_student_mappings.find({"mentor_id": user["user_id"]}, {"_id": 0}).to_list(100)
        user["mentee_count"] = len(mentees)
    return user

@api_router.post("/auth/demo-login")
async def demo_login(request: Request, response: Response):
    body = await request.json()
    role = body.get("role", "student")
    user = await db.users.find_one({"role": role, "is_active": True}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail=f"No demo {role} user found")
    session_token = f"session_{uuid.uuid4().hex}"
    await db.user_sessions.insert_one({
        "session_token": session_token,
        "user_id": user["user_id"],
        "expires_at": datetime.now(timezone.utc) + timedelta(days=7),
        "created_at": datetime.now(timezone.utc)
    })
    response.set_cookie("session_token", session_token, max_age=7*24*60*60, httponly=True, secure=True, samesite="none", path="/")
    return {"user": user, "session_token": session_token}

@api_router.post("/auth/logout")
async def logout(request: Request, response: Response):
    token = request.cookies.get("session_token")
    if not token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
    if token:
        await db.user_sessions.delete_many({"session_token": token})
    response.delete_cookie("session_token", path="/")
    return {"message": "Logged out"}

# ======================== USER ROUTES ========================

@api_router.get("/users")
async def list_users(role: Optional[str] = None, batch: Optional[str] = None, is_active: Optional[bool] = None, user=Depends(get_current_user)):
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    query: Dict[str, Any] = {}
    if role:
        query["role"] = role
    if batch:
        query["batch"] = batch
    if is_active is not None:
        query["is_active"] = is_active
    users = await db.users.find(query, {"_id": 0}).to_list(1000)
    return users

@api_router.post("/users")
async def create_user(data: UserCreate, user=Depends(get_current_user)):
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    existing = await db.users.find_one({"email": data.email.lower()}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Email already exists")
    user_id = f"user_{uuid.uuid4().hex[:12]}"
    user_doc = {
        "user_id": user_id,
        "email": data.email.lower(),
        "name": data.name,
        "role": data.role,
        "phone": data.phone,
        "batch": data.batch,
        "course": data.course,
        "exam_year": data.exam_year,
        "optional_subject": data.optional_subject,
        "profile_photo_url": data.profile_photo_url,
        "is_active": data.is_active,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(user_doc)
    return await db.users.find_one({"user_id": user_id}, {"_id": 0})

@api_router.put("/users/{user_id}")
async def update_user(user_id: str, data: UserUpdate, user=Depends(get_current_user)):
    if user["role"] != "admin" and user["user_id"] != user_id:
        raise HTTPException(status_code=403, detail="Forbidden")
    update_data = {k: v for k, v in data.dict().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.users.update_one({"user_id": user_id}, {"$set": update_data})
    return await db.users.find_one({"user_id": user_id}, {"_id": 0})

@api_router.delete("/users/{user_id}")
async def delete_user(user_id: str, user=Depends(get_current_user)):
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    await db.users.update_one({"user_id": user_id}, {"$set": {"is_active": False}})
    return {"message": "User deactivated"}

# ======================== MAPPING ROUTES ========================

@api_router.get("/mappings")
async def list_mappings(user=Depends(get_current_user)):
    if user["role"] not in ["admin", "mentor"]:
        raise HTTPException(status_code=403, detail="Forbidden")
    query = {}
    if user["role"] == "mentor":
        query["mentor_id"] = user["user_id"]
    mappings = await db.mentor_student_mappings.find(query, {"_id": 0}).to_list(500)
    for m in mappings:
        mentor = await db.users.find_one({"user_id": m["mentor_id"]}, {"_id": 0, "user_id": 1, "name": 1, "email": 1, "profile_photo_url": 1})
        student = await db.users.find_one({"user_id": m["student_id"]}, {"_id": 0, "user_id": 1, "name": 1, "email": 1, "batch": 1, "course": 1, "profile_photo_url": 1})
        m["mentor"] = mentor
        m["student"] = student
    return mappings

@api_router.post("/mappings")
async def create_mapping(data: MappingCreate, user=Depends(get_current_user)):
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    existing = await db.mentor_student_mappings.find_one({"student_id": data.student_id}, {"_id": 0})
    if existing:
        await db.mentor_student_mappings.update_one(
            {"student_id": data.student_id},
            {"$set": {"mentor_id": data.mentor_id, "assigned_at": datetime.now(timezone.utc).isoformat(), "assigned_by": user["user_id"]}}
        )
    else:
        await db.mentor_student_mappings.insert_one({
            "mapping_id": f"map_{uuid.uuid4().hex[:12]}",
            "mentor_id": data.mentor_id,
            "student_id": data.student_id,
            "assigned_at": datetime.now(timezone.utc).isoformat(),
            "assigned_by": user["user_id"]
        })
    return {"message": "Mapping created/updated"}

@api_router.delete("/mappings/{student_id}")
async def delete_mapping(student_id: str, user=Depends(get_current_user)):
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    await db.mentor_student_mappings.delete_one({"student_id": student_id})
    return {"message": "Mapping deleted"}

@api_router.get("/mentors/{mentor_id}/mentees")
async def get_mentees(mentor_id: str, user=Depends(get_current_user)):
    if user["role"] not in ["admin", "mentor"]:
        raise HTTPException(status_code=403, detail="Forbidden")
    if user["role"] == "mentor" and user["user_id"] != mentor_id:
        raise HTTPException(status_code=403, detail="Can only view own mentees")
    mappings = await db.mentor_student_mappings.find({"mentor_id": mentor_id}, {"_id": 0}).to_list(100)
    mentees = []
    for m in mappings:
        student = await db.users.find_one({"user_id": m["student_id"]}, {"_id": 0})
        if student:
            progress = await db.student_topic_progress.find({"student_id": student["user_id"]}, {"_id": 0}).to_list(1000)
            total = len(progress)
            completed = len([p for p in progress if p.get("status") == "completed"])
            in_progress = len([p for p in progress if p.get("status") == "in_progress"])
            avg_completion = sum(p.get("completion_pct", 0) for p in progress) / total if total else 0
            total_hours = sum(p.get("study_hours", 0) for p in progress)
            student["progress_summary"] = {
                "total_topics": total,
                "completed": completed,
                "in_progress": in_progress,
                "avg_completion": round(avg_completion, 1),
                "total_hours": round(total_hours, 1),
                "status_color": "green" if avg_completion >= 60 else ("yellow" if avg_completion >= 30 else "red")
            }
            pending_tasks = await db.tasks.count_documents({"assigned_to": student["user_id"], "status": {"$ne": "completed"}})
            student["pending_tasks"] = pending_tasks
            mentees.append(student)
    return mentees

# ======================== SYLLABUS ROUTES ========================

@api_router.get("/syllabus")
async def get_syllabus(user=Depends(get_current_user)):
    stages = await db.syllabus_stages.find({"is_active": True}, {"_id": 0}).sort("order_index", 1).to_list(20)
    for stage in stages:
        papers = await db.syllabus_papers.find({"stage_id": stage["stage_id"], "is_active": True}, {"_id": 0}).sort("order_index", 1).to_list(50)
        for paper in papers:
            modules = await db.syllabus_modules.find({"paper_id": paper["paper_id"]}, {"_id": 0}).sort("order_index", 1).to_list(50)
            for module in modules:
                topics = await db.syllabus_topics.find({"module_id": module["module_id"]}, {"_id": 0}).sort("order_index", 1).to_list(100)
                module["topics"] = topics
            paper["modules"] = modules
        stage["papers"] = papers
    return stages

@api_router.get("/syllabus/flat-topics")
async def get_flat_topics(user=Depends(get_current_user)):
    topics = await db.syllabus_topics.find({}, {"_id": 0}).to_list(2000)
    return topics

# ======================== TRACKER ROUTES ========================

@api_router.get("/tracker/{student_id}")
async def get_tracker(student_id: str, user=Depends(get_current_user)):
    if user["role"] == "student" and user["user_id"] != student_id:
        raise HTTPException(status_code=403, detail="Can only view own tracker")
    if user["role"] == "mentor":
        mapping = await db.mentor_student_mappings.find_one({"mentor_id": user["user_id"], "student_id": student_id}, {"_id": 0})
        if not mapping:
            raise HTTPException(status_code=403, detail="Not your mentee")
    progress = await db.student_topic_progress.find({"student_id": student_id}, {"_id": 0}).to_list(2000)
    progress_map = {p["topic_id"]: p for p in progress}
    stages = await db.syllabus_stages.find({"is_active": True}, {"_id": 0}).sort("order_index", 1).to_list(20)
    for stage in stages:
        stage_completed = 0
        stage_total = 0
        papers = await db.syllabus_papers.find({"stage_id": stage["stage_id"], "is_active": True}, {"_id": 0}).sort("order_index", 1).to_list(50)
        for paper in papers:
            paper_completed = 0
            paper_total = 0
            modules = await db.syllabus_modules.find({"paper_id": paper["paper_id"]}, {"_id": 0}).sort("order_index", 1).to_list(50)
            for module in modules:
                topics = await db.syllabus_topics.find({"module_id": module["module_id"]}, {"_id": 0}).sort("order_index", 1).to_list(100)
                for topic in topics:
                    p = progress_map.get(topic["topic_id"], {})
                    topic["progress"] = {
                        "status": p.get("status", "not_started"),
                        "completion_pct": p.get("completion_pct", 0),
                        "study_hours": p.get("study_hours", 0),
                        "priority": p.get("priority", "medium"),
                        "student_notes": p.get("student_notes", ""),
                        "mentor_feedback": p.get("mentor_feedback", ""),
                        "revision_count": p.get("revision_count", 0),
                        "deadline": p.get("deadline"),
                    }
                    paper_total += 1
                    stage_total += 1
                    if p.get("status") == "completed":
                        paper_completed += 1
                        stage_completed += 1
                module["topics"] = topics
            paper["modules"] = modules
            paper["completion"] = {"completed": paper_completed, "total": paper_total, "pct": round(paper_completed / paper_total * 100) if paper_total else 0}
        stage["papers"] = papers
        stage["completion"] = {"completed": stage_completed, "total": stage_total, "pct": round(stage_completed / stage_total * 100) if stage_total else 0}
    return stages

@api_router.get("/tracker/{student_id}/summary")
async def get_tracker_summary(student_id: str, user=Depends(get_current_user)):
    progress = await db.student_topic_progress.find({"student_id": student_id}, {"_id": 0}).to_list(2000)
    total_topics = await db.syllabus_topics.count_documents({})
    completed = len([p for p in progress if p.get("status") == "completed"])
    in_progress = len([p for p in progress if p.get("status") == "in_progress"])
    revision = len([p for p in progress if p.get("status") == "revision"])
    total_hours = sum(p.get("study_hours", 0) for p in progress)
    avg_completion = sum(p.get("completion_pct", 0) for p in progress) / len(progress) if progress else 0
    stages = await db.syllabus_stages.find({"is_active": True}, {"_id": 0}).to_list(20)
    stage_progress = []
    for stage in stages:
        papers = await db.syllabus_papers.find({"stage_id": stage["stage_id"]}, {"_id": 0}).to_list(50)
        paper_ids = [p["paper_id"] for p in papers]
        modules = await db.syllabus_modules.find({"paper_id": {"$in": paper_ids}}, {"_id": 0}).to_list(200)
        module_ids = [m["module_id"] for m in modules]
        topics = await db.syllabus_topics.find({"module_id": {"$in": module_ids}}, {"_id": 0}).to_list(500)
        topic_ids = [t["topic_id"] for t in topics]
        stage_progs = [p for p in progress if p.get("topic_id") in topic_ids]
        s_completed = len([p for p in stage_progs if p.get("status") == "completed"])
        stage_progress.append({
            "stage_id": stage["stage_id"],
            "name": stage["name"],
            "total": len(topics),
            "completed": s_completed,
            "pct": round(s_completed / len(topics) * 100) if topics else 0
        })
    return {
        "total_topics": total_topics,
        "tracked": len(progress),
        "completed": completed,
        "in_progress": in_progress,
        "revision": revision,
        "not_started": total_topics - len(progress),
        "total_hours": round(total_hours, 1),
        "avg_completion": round(avg_completion, 1),
        "stage_progress": stage_progress
    }

@api_router.put("/tracker/{student_id}/{topic_id}")
async def update_tracker(student_id: str, topic_id: str, data: TrackerUpdate, user=Depends(get_current_user)):
    if user["role"] == "student" and user["user_id"] != student_id:
        raise HTTPException(status_code=403, detail="Forbidden")
    if user["role"] == "mentor":
        mapping = await db.mentor_student_mappings.find_one({"mentor_id": user["user_id"], "student_id": student_id}, {"_id": 0})
        if not mapping:
            raise HTTPException(status_code=403, detail="Not your mentee")
    update_fields = {k: v for k, v in data.dict().items() if v is not None}
    if not update_fields:
        raise HTTPException(status_code=400, detail="No fields to update")
    update_fields["updated_at"] = datetime.now(timezone.utc).isoformat()
    update_fields["updated_by"] = user["user_id"]
    existing = await db.student_topic_progress.find_one({"student_id": student_id, "topic_id": topic_id}, {"_id": 0})
    if existing:
        await db.student_topic_progress.update_one(
            {"student_id": student_id, "topic_id": topic_id},
            {"$set": update_fields}
        )
    else:
        update_fields["progress_id"] = f"prog_{uuid.uuid4().hex[:12]}"
        update_fields["student_id"] = student_id
        update_fields["topic_id"] = topic_id
        update_fields["created_at"] = datetime.now(timezone.utc).isoformat()
        await db.student_topic_progress.insert_one(update_fields)
    return await db.student_topic_progress.find_one({"student_id": student_id, "topic_id": topic_id}, {"_id": 0})

# ======================== TASK ROUTES ========================

@api_router.get("/tasks")
async def list_tasks(user=Depends(get_current_user)):
    if user["role"] == "admin":
        tasks = await db.tasks.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)
    elif user["role"] == "mentor":
        mentee_mappings = await db.mentor_student_mappings.find({"mentor_id": user["user_id"]}, {"_id": 0}).to_list(100)
        mentee_ids = [m["student_id"] for m in mentee_mappings]
        tasks = await db.tasks.find({"$or": [
            {"assigned_by": user["user_id"]},
            {"assigned_to": {"$in": mentee_ids}},
            {"assigned_to": None}
        ]}, {"_id": 0}).sort("created_at", -1).to_list(500)
    else:
        tasks = await db.tasks.find({"$or": [
            {"assigned_to": user["user_id"]},
            {"assigned_to": None}
        ]}, {"_id": 0}).sort("created_at", -1).to_list(500)
    for task in tasks:
        if task.get("assigned_to"):
            assignee = await db.users.find_one({"user_id": task["assigned_to"]}, {"_id": 0, "name": 1, "user_id": 1})
            task["assignee"] = assignee
        if task.get("assigned_by"):
            assigner = await db.users.find_one({"user_id": task["assigned_by"]}, {"_id": 0, "name": 1, "user_id": 1})
            task["assigner"] = assigner
    return tasks

@api_router.post("/tasks")
async def create_task(data: TaskCreate, user=Depends(get_current_user)):
    if user["role"] == "student":
        raise HTTPException(status_code=403, detail="Students cannot create tasks")
    task_doc = {
        "task_id": f"task_{uuid.uuid4().hex[:12]}",
        "title": data.title,
        "description": data.description,
        "assigned_to": data.assigned_to,
        "assigned_by": user["user_id"],
        "due_date": data.due_date,
        "status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.tasks.insert_one(task_doc)
    return await db.tasks.find_one({"task_id": task_doc["task_id"]}, {"_id": 0})

@api_router.put("/tasks/{task_id}")
async def update_task(task_id: str, data: TaskUpdate, user=Depends(get_current_user)):
    update_fields = {k: v for k, v in data.dict().items() if v is not None}
    update_fields["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.tasks.update_one({"task_id": task_id}, {"$set": update_fields})
    return await db.tasks.find_one({"task_id": task_id}, {"_id": 0})

# ======================== SESSION ROUTES ========================

@api_router.get("/sessions")
async def list_sessions(user=Depends(get_current_user)):
    if user["role"] == "admin":
        sessions = await db.mentor_sessions.find({}, {"_id": 0}).sort("scheduled_at", -1).to_list(500)
    elif user["role"] == "mentor":
        sessions = await db.mentor_sessions.find({"mentor_id": user["user_id"]}, {"_id": 0}).sort("scheduled_at", -1).to_list(500)
    else:
        sessions = await db.mentor_sessions.find({"student_id": user["user_id"]}, {"_id": 0}).sort("scheduled_at", -1).to_list(500)
    for s in sessions:
        mentor = await db.users.find_one({"user_id": s["mentor_id"]}, {"_id": 0, "name": 1, "user_id": 1, "profile_photo_url": 1})
        student = await db.users.find_one({"user_id": s["student_id"]}, {"_id": 0, "name": 1, "user_id": 1, "profile_photo_url": 1})
        s["mentor"] = mentor
        s["student"] = student
    return sessions

@api_router.post("/sessions")
async def create_session(data: SessionCreate, user=Depends(get_current_user)):
    if user["role"] not in ["mentor", "admin"]:
        raise HTTPException(status_code=403, detail="Only mentors can schedule sessions")
    session_doc = {
        "session_id": f"sess_{uuid.uuid4().hex[:12]}",
        "mentor_id": user["user_id"],
        "student_id": data.student_id,
        "scheduled_at": data.scheduled_at,
        "duration_minutes": data.duration_minutes,
        "agenda": data.agenda,
        "session_notes": None,
        "status": "scheduled",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.mentor_sessions.insert_one(session_doc)
    return await db.mentor_sessions.find_one({"session_id": session_doc["session_id"]}, {"_id": 0})

@api_router.put("/sessions/{session_id}")
async def update_session(session_id: str, data: SessionUpdate, user=Depends(get_current_user)):
    update_fields = {k: v for k, v in data.dict().items() if v is not None}
    await db.mentor_sessions.update_one({"session_id": session_id}, {"$set": update_fields})
    return await db.mentor_sessions.find_one({"session_id": session_id}, {"_id": 0})

# ======================== ANNOUNCEMENTS ========================

@api_router.get("/announcements")
async def list_announcements(user=Depends(get_current_user)):
    announcements = await db.announcements.find({}, {"_id": 0}).sort("created_at", -1).to_list(100)
    for a in announcements:
        creator = await db.users.find_one({"user_id": a.get("created_by")}, {"_id": 0, "name": 1})
        a["creator"] = creator
    return announcements

@api_router.post("/announcements")
async def create_announcement(data: AnnouncementCreate, user=Depends(get_current_user)):
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    doc = {
        "announcement_id": f"ann_{uuid.uuid4().hex[:12]}",
        "title": data.title,
        "body": data.body,
        "target_batch": data.target_batch,
        "target_course": data.target_course,
        "created_by": user["user_id"],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.announcements.insert_one(doc)
    return await db.announcements.find_one({"announcement_id": doc["announcement_id"]}, {"_id": 0})

# ======================== ANALYTICS ========================

@api_router.get("/analytics/overview")
async def analytics_overview(user=Depends(get_current_user)):
    if user["role"] not in ["admin", "mentor"]:
        raise HTTPException(status_code=403, detail="Forbidden")
    total_students = await db.users.count_documents({"role": "student", "is_active": True})
    total_mentors = await db.users.count_documents({"role": "mentor", "is_active": True})
    total_tasks = await db.tasks.count_documents({})
    pending_tasks = await db.tasks.count_documents({"status": "pending"})
    completed_tasks = await db.tasks.count_documents({"status": "completed"})
    total_sessions = await db.mentor_sessions.count_documents({})
    total_progress = await db.student_topic_progress.find({}, {"_id": 0, "status": 1, "completion_pct": 1}).to_list(10000)
    total_topics = await db.syllabus_topics.count_documents({})
    avg_completion = sum(p.get("completion_pct", 0) for p in total_progress) / len(total_progress) if total_progress else 0
    completed_entries = len([p for p in total_progress if p.get("status") == "completed"])

    batches = await db.users.distinct("batch", {"role": "student"})
    batch_stats = []
    for b in batches:
        if not b:
            continue
        count = await db.users.count_documents({"role": "student", "batch": b, "is_active": True})
        batch_stats.append({"batch": b, "count": count})

    return {
        "total_students": total_students,
        "total_mentors": total_mentors,
        "total_topics": total_topics,
        "total_tasks": total_tasks,
        "pending_tasks": pending_tasks,
        "completed_tasks": completed_tasks,
        "total_sessions": total_sessions,
        "avg_completion": round(avg_completion, 1),
        "completed_entries": completed_entries,
        "batch_stats": batch_stats
    }

@api_router.get("/analytics/student/{student_id}")
async def analytics_student(student_id: str, user=Depends(get_current_user)):
    progress = await db.student_topic_progress.find({"student_id": student_id}, {"_id": 0}).to_list(2000)
    tasks = await db.tasks.find({"assigned_to": student_id}, {"_id": 0}).to_list(100)
    sessions = await db.mentor_sessions.find({"student_id": student_id}, {"_id": 0}).to_list(100)
    total_topics = await db.syllabus_topics.count_documents({})
    completed = len([p for p in progress if p.get("status") == "completed"])
    in_progress = len([p for p in progress if p.get("status") == "in_progress"])
    total_hours = sum(p.get("study_hours", 0) for p in progress)
    pending_tasks = len([t for t in tasks if t.get("status") == "pending"])
    completed_tasks = len([t for t in tasks if t.get("status") == "completed"])
    return {
        "total_topics": total_topics,
        "tracked": len(progress),
        "completed": completed,
        "in_progress": in_progress,
        "not_started": total_topics - len(progress),
        "total_hours": round(total_hours, 1),
        "pending_tasks": pending_tasks,
        "completed_tasks": completed_tasks,
        "total_sessions": len(sessions),
        "overall_pct": round(completed / total_topics * 100) if total_topics else 0
    }

# ======================== SEED DATA ========================

async def seed_data():
    count = await db.users.count_documents({})
    if count > 0:
        logger.info("Database already seeded, skipping...")
        return

    logger.info("Seeding database...")

    # Create admin
    admin_id = f"user_{uuid.uuid4().hex[:12]}"
    await db.users.insert_one({
        "user_id": admin_id, "email": "admin@sleepyclasses.com", "name": "Aditya Sharma",
        "role": "admin", "phone": "+91-9876543210", "batch": None, "course": None,
        "exam_year": None, "optional_subject": None,
        "profile_photo_url": "https://ui-avatars.com/api/?name=Aditya+Sharma&background=1A365D&color=fff&size=128",
        "is_active": True, "created_at": datetime.now(timezone.utc).isoformat(), "updated_at": datetime.now(timezone.utc).isoformat()
    })

    # Create mentors
    mentor_ids = []
    mentors_data = [
        {"name": "Dr. Priya Verma", "email": "priya@sleepyclasses.com", "phone": "+91-9876543211"},
        {"name": "Rajesh Kumar", "email": "rajesh@sleepyclasses.com", "phone": "+91-9876543212"},
    ]
    for md in mentors_data:
        mid = f"user_{uuid.uuid4().hex[:12]}"
        mentor_ids.append(mid)
        await db.users.insert_one({
            "user_id": mid, "email": md["email"], "name": md["name"],
            "role": "mentor", "phone": md["phone"], "batch": None, "course": "UPSC CSE Complete",
            "exam_year": None, "optional_subject": None,
            "profile_photo_url": f"https://ui-avatars.com/api/?name={md['name'].replace(' ', '+')}&background=D69E2E&color=fff&size=128",
            "is_active": True, "created_at": datetime.now(timezone.utc).isoformat(), "updated_at": datetime.now(timezone.utc).isoformat()
        })

    # Create students
    students_data = [
        {"name": "Aarav Patel", "email": "aarav@example.com", "batch": "Batch 2025-A", "exam_year": "2025", "optional": "Sociology"},
        {"name": "Meera Singh", "email": "meera@example.com", "batch": "Batch 2025-A", "exam_year": "2025", "optional": "Public Administration"},
        {"name": "Rohan Gupta", "email": "rohan@example.com", "batch": "Batch 2025-B", "exam_year": "2025", "optional": "History"},
        {"name": "Ananya Iyer", "email": "ananya@example.com", "batch": "Batch 2025-B", "exam_year": "2026", "optional": "Geography"},
        {"name": "Vikram Reddy", "email": "vikram@example.com", "batch": "Batch 2026-A", "exam_year": "2026", "optional": "Political Science"},
    ]
    student_ids = []
    for i, sd in enumerate(students_data):
        sid = f"user_{uuid.uuid4().hex[:12]}"
        student_ids.append(sid)
        await db.users.insert_one({
            "user_id": sid, "email": sd["email"], "name": sd["name"],
            "role": "student", "phone": f"+91-98765{43220+i}", "batch": sd["batch"],
            "course": "UPSC CSE Complete", "exam_year": sd["exam_year"], "optional_subject": sd["optional"],
            "profile_photo_url": f"https://ui-avatars.com/api/?name={sd['name'].replace(' ', '+')}&background=1A365D&color=fff&size=128",
            "is_active": True, "created_at": datetime.now(timezone.utc).isoformat(), "updated_at": datetime.now(timezone.utc).isoformat()
        })

    # Create mappings
    for i, sid in enumerate(student_ids):
        mentor_id = mentor_ids[i % len(mentor_ids)]
        await db.mentor_student_mappings.insert_one({
            "mapping_id": f"map_{uuid.uuid4().hex[:12]}",
            "mentor_id": mentor_id,
            "student_id": sid,
            "assigned_at": datetime.now(timezone.utc).isoformat(),
            "assigned_by": admin_id
        })

    # Seed UPSC syllabus
    syllabus = [
        {"name": "Prelims", "papers": [
            {"name": "General Studies", "modules": [
                {"name": "History", "topics": ["Ancient India", "Medieval India", "Modern India", "Art & Culture", "World History"]},
                {"name": "Geography", "topics": ["Physical Geography", "Indian Geography", "World Geography", "Climatology", "Oceanography"]},
                {"name": "Polity", "topics": ["Indian Constitution", "Parliament", "Judiciary", "State Government", "Panchayati Raj", "Constitutional Bodies"]},
                {"name": "Economy", "topics": ["Macro Economics", "Indian Economy", "Banking & Finance", "Budget & Fiscal Policy", "International Trade"]},
                {"name": "Environment", "topics": ["Ecology Basics", "Biodiversity", "Climate Change", "Environmental Laws", "Pollution"]},
                {"name": "Science & Tech", "topics": ["Physics Basics", "Chemistry Basics", "Biology Basics", "Space Technology", "IT & Computers", "Biotechnology"]},
                {"name": "Current Affairs", "topics": ["National Events", "International Events", "Sports", "Awards & Honours", "Government Schemes"]},
            ]},
            {"name": "CSAT", "modules": [
                {"name": "Comprehension", "topics": ["English Comprehension", "Passage Analysis", "Critical Reading"]},
                {"name": "Reasoning", "topics": ["Logical Reasoning", "Analytical Ability", "Data Interpretation"]},
                {"name": "Quantitative Aptitude", "topics": ["Number System", "Algebra", "Geometry", "Statistics"]},
                {"name": "Decision Making", "topics": ["Ethical Dilemmas", "Administrative Decision Making"]},
            ]},
        ]},
        {"name": "Mains", "papers": [
            {"name": "GS Paper 1", "modules": [
                {"name": "Indian Heritage & Culture", "topics": ["Art Forms", "Literature", "Architecture", "Festivals", "Heritage Sites"]},
                {"name": "History", "topics": ["Freedom Struggle", "Post Independence", "World Wars", "Revolutions"]},
                {"name": "Geography", "topics": ["Geomorphology", "Resource Distribution", "Urbanization", "Disaster Prone Areas"]},
                {"name": "Society", "topics": ["Salient Features", "Women Issues", "Population", "Communalism", "Globalization"]},
            ]},
            {"name": "GS Paper 2", "modules": [
                {"name": "Constitution & Governance", "topics": ["Fundamental Rights", "DPSP", "Federal Structure", "Separation of Powers"]},
                {"name": "Polity", "topics": ["Elections", "Political Parties", "Pressure Groups", "Democratic Institutions"]},
                {"name": "Social Justice", "topics": ["Health", "Education", "Welfare Schemes", "Vulnerable Sections"]},
                {"name": "International Relations", "topics": ["India & Neighbours", "Bilateral Relations", "International Organizations", "Geopolitics"]},
            ]},
            {"name": "GS Paper 3", "modules": [
                {"name": "Economy", "topics": ["Growth & Development", "Inclusive Growth", "Infrastructure", "Investment Models"]},
                {"name": "Agriculture", "topics": ["Food Processing", "Land Reforms", "MSP", "Technology in Agriculture"]},
                {"name": "Science & Tech", "topics": ["Developments in S&T", "Indigenization", "Awareness in Space & IT"]},
                {"name": "Environment", "topics": ["Conservation", "Environmental Pollution", "EIA", "Climate Agreements"]},
                {"name": "Disaster Management", "topics": ["Types of Disasters", "NDMA", "Mitigation Strategies"]},
                {"name": "Internal Security", "topics": ["Extremism", "Border Management", "Cyber Security", "Money Laundering"]},
            ]},
            {"name": "GS Paper 4 (Ethics)", "modules": [
                {"name": "Ethics", "topics": ["Ethics & Human Interface", "Attitude", "Emotional Intelligence", "Moral Thinkers"]},
                {"name": "Aptitude & Integrity", "topics": ["Aptitude for Civil Services", "Integrity", "Impartiality", "Objectivity"]},
                {"name": "Case Studies", "topics": ["Ethical Dilemma Cases", "Governance Cases", "Corruption Cases", "Social Issue Cases"]},
            ]},
            {"name": "Essay", "modules": [
                {"name": "Essay Practice", "topics": ["Philosophical Essays", "Social Essays", "Political Essays", "Economic Essays", "Science Essays"]},
            ]},
            {"name": "Optional Subject", "modules": [
                {"name": "Optional Paper 1", "topics": ["Unit 1", "Unit 2", "Unit 3", "Unit 4", "Unit 5"]},
                {"name": "Optional Paper 2", "topics": ["Unit 1", "Unit 2", "Unit 3", "Unit 4", "Unit 5"]},
            ]},
        ]},
        {"name": "Interview", "papers": [
            {"name": "Interview Preparation", "modules": [
                {"name": "DAF Analysis", "topics": ["DAF Preparation", "Hobby Deep Dive", "Service Preference"]},
                {"name": "Current Affairs Discussion", "topics": ["National Issues", "International Issues", "State-specific Issues"]},
                {"name": "Personality Development", "topics": ["Communication Skills", "Body Language", "Confidence Building"]},
                {"name": "Mock Interviews", "topics": ["Mock Interview 1", "Mock Interview 2", "Mock Interview 3"]},
            ]},
        ]},
        {"name": "Revision & Recovery", "papers": [
            {"name": "Revision Plan", "modules": [
                {"name": "Revision Cycles", "topics": ["1st Revision Cycle", "2nd Revision Cycle", "3rd Revision Cycle", "Final Revision"]},
                {"name": "Backlog Tracker", "topics": ["Pending Topics Review", "Weak Areas Focus", "High Priority Recap"]},
                {"name": "PYQ Practice", "topics": ["Prelims PYQs", "Mains PYQs", "Optional PYQs"]},
            ]},
        ]},
    ]

    for s_idx, stage_data in enumerate(syllabus):
        stage_id = f"stage_{uuid.uuid4().hex[:12]}"
        await db.syllabus_stages.insert_one({
            "stage_id": stage_id, "name": stage_data["name"],
            "order_index": s_idx, "is_active": True
        })
        for p_idx, paper_data in enumerate(stage_data["papers"]):
            paper_id = f"paper_{uuid.uuid4().hex[:12]}"
            await db.syllabus_papers.insert_one({
                "paper_id": paper_id, "stage_id": stage_id,
                "name": paper_data["name"], "order_index": p_idx, "is_active": True
            })
            for m_idx, mod_data in enumerate(paper_data["modules"]):
                module_id = f"mod_{uuid.uuid4().hex[:12]}"
                await db.syllabus_modules.insert_one({
                    "module_id": module_id, "paper_id": paper_id,
                    "name": mod_data["name"], "order_index": m_idx
                })
                for t_idx, topic_name in enumerate(mod_data["topics"]):
                    topic_id = f"topic_{uuid.uuid4().hex[:12]}"
                    await db.syllabus_topics.insert_one({
                        "topic_id": topic_id, "module_id": module_id,
                        "name": topic_name, "order_index": t_idx
                    })

    # Seed some progress data for students
    all_topics = await db.syllabus_topics.find({}, {"_id": 0}).to_list(2000)
    import random
    for sid in student_ids:
        sample_count = random.randint(15, 40)
        sampled = random.sample(all_topics, min(sample_count, len(all_topics)))
        for t in sampled:
            status = random.choice(["completed", "in_progress", "revision", "not_started"])
            comp = random.randint(60, 100) if status == "completed" else (random.randint(20, 80) if status == "in_progress" else (random.randint(40, 90) if status == "revision" else 0))
            hours = round(random.uniform(0.5, 8.0), 1) if status != "not_started" else 0
            await db.student_topic_progress.insert_one({
                "progress_id": f"prog_{uuid.uuid4().hex[:12]}",
                "student_id": sid,
                "topic_id": t["topic_id"],
                "status": status,
                "completion_pct": comp,
                "study_hours": hours,
                "revision_count": random.randint(0, 3) if status == "revision" else 0,
                "priority": random.choice(["low", "medium", "high"]),
                "student_notes": "",
                "mentor_feedback": "",
                "updated_at": datetime.now(timezone.utc).isoformat(),
                "updated_by": sid
            })

    # Seed tasks
    task_titles = [
        "Complete GS Paper 1 - History section",
        "Write 5 practice essays",
        "Attempt Prelims Mock Test 3",
        "Read NCERT Geography Class 12",
        "Submit answer writing for Ethics case studies",
        "Review Current Affairs - January 2026",
        "Complete CSAT practice set",
        "DAF preparation worksheet"
    ]
    for i, title in enumerate(task_titles):
        assigned_student = student_ids[i % len(student_ids)]
        assigned_mentor = mentor_ids[i % len(mentor_ids)]
        await db.tasks.insert_one({
            "task_id": f"task_{uuid.uuid4().hex[:12]}",
            "title": title,
            "description": f"Complete this task before the deadline. Focus on quality.",
            "assigned_to": assigned_student,
            "assigned_by": assigned_mentor,
            "due_date": (datetime.now(timezone.utc) + timedelta(days=random.randint(1, 14))).isoformat(),
            "status": random.choice(["pending", "pending", "in_progress", "completed"]),
            "created_at": datetime.now(timezone.utc).isoformat()
        })

    # Seed sessions
    for i in range(6):
        await db.mentor_sessions.insert_one({
            "session_id": f"sess_{uuid.uuid4().hex[:12]}",
            "mentor_id": mentor_ids[i % len(mentor_ids)],
            "student_id": student_ids[i % len(student_ids)],
            "scheduled_at": (datetime.now(timezone.utc) + timedelta(days=random.randint(-3, 7), hours=random.randint(9, 17))).isoformat(),
            "duration_minutes": random.choice([30, 45, 60]),
            "agenda": random.choice(["Weekly progress review", "Essay feedback discussion", "Mock interview prep", "Strategy session for Mains"]),
            "session_notes": None,
            "status": random.choice(["scheduled", "completed", "scheduled"]),
            "created_at": datetime.now(timezone.utc).isoformat()
        })

    # Seed announcements
    await db.announcements.insert_one({
        "announcement_id": f"ann_{uuid.uuid4().hex[:12]}",
        "title": "Welcome to Sleepy Classes Mentorship Program!",
        "body": "We are excited to launch the new mentorship tracking platform. Please complete your profile and start tracking your preparation journey.",
        "target_batch": None, "target_course": None,
        "created_by": admin_id,
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    await db.announcements.insert_one({
        "announcement_id": f"ann_{uuid.uuid4().hex[:12]}",
        "title": "Prelims 2026 Schedule Released",
        "body": "The master study schedule for Prelims 2026 has been uploaded. Check your tracker for updated deadlines.",
        "target_batch": None, "target_course": None,
        "created_by": admin_id,
        "created_at": datetime.now(timezone.utc).isoformat()
    })

    logger.info("Database seeded successfully!")

# ======================== APP SETUP ========================

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router)

@app.on_event("startup")
async def startup():
    await seed_data()

@app.on_event("shutdown")
async def shutdown():
    client.close()
