# Sleepy Classes Mentorship Tracker - PRD

## Overview
Full-stack mobile application for UPSC Civil Services Examination mentorship management. Supports three role-based dashboards (Admin, Mentor, Student), integrated UPSC study tracker, task management, and real-time progress monitoring.

## Tech Stack
- **Frontend**: React Native (Expo SDK 54) with Expo Router
- **Backend**: FastAPI (Python) with Motor (async MongoDB driver)
- **Database**: MongoDB
- **Auth**: Emergent-managed Google OAuth + demo login for testing
- **File Storage**: MongoDB GridFS (planned)

## Implemented Features (MVP)

### Authentication
- [x] Emergent Google OAuth login
- [x] Demo login buttons for all 3 roles (Student, Mentor, Admin)
- [x] Session-based auth with token in cookies + Authorization header
- [x] Role-based routing after login

### Student Dashboard (4 tabs: Home, Tracker, Materials, Profile)
- [x] Home: Greeting, quick stats (overall %, done, active, hours), My Mentor card, preparation progress bars (by stage), upcoming tasks, announcements
- [x] Tracker: Expandable UPSC syllabus tree (Stages > Papers > Modules > Topics) with status indicators and completion percentages
- [x] Materials: Announcements list, resource categories
- [x] Profile: User info, batch details, mentor info, performance insights, logout

### Mentor Dashboard (4 tabs: Mentees, Schedule, Analytics, Profile)
- [x] Mentees: Searchable list with traffic light progress indicators (green/yellow/red), expandable details with stats and action buttons
- [x] Schedule: Upcoming and past sessions list
- [x] Analytics: Metrics (avg completion, total hours, on track, need help), mentee rankings, students needing attention
- [x] Profile: User info, mentee count, logout

### Admin Dashboard (4 tabs: Dashboard, Users, Content, Profile)
- [x] Dashboard: Key metrics (students, mentors, topics, avg progress, tasks, sessions), task overview bar, batch stats, recent announcements
- [x] Users: Searchable, filterable user list with role badges and status indicators
- [x] Content: Announcement management (create/view), quick action buttons
- [x] Profile: Admin info, logout

### Backend API Endpoints
- Auth: /api/auth/session, /api/auth/me, /api/auth/demo-login, /api/auth/logout
- Users: GET /api/users, POST /api/users, PUT /api/users/:id, DELETE /api/users/:id
- Mappings: GET /api/mappings, POST /api/mappings, GET /api/mentors/:id/mentees
- Syllabus: GET /api/syllabus, GET /api/syllabus/flat-topics
- Tracker: GET /api/tracker/:id, GET /api/tracker/:id/summary, PUT /api/tracker/:id/:topicId
- Tasks: GET /api/tasks, POST /api/tasks, PUT /api/tasks/:id
- Sessions: GET /api/sessions, POST /api/sessions, PUT /api/sessions/:id
- Announcements: GET /api/announcements, POST /api/announcements
- Analytics: GET /api/analytics/overview, GET /api/analytics/student/:id

### Seed Data
- 1 Admin, 2 Mentors, 5 Students
- Full UPSC syllabus (154 topics across Prelims, Mains, Interview, Revision)
- Sample progress data, tasks, sessions, announcements
- Mentor-student mappings

## Planned Features (Next Iterations)
- [ ] Document/PDF upload and sharing with GridFS
- [ ] In-app PDF viewer
- [ ] Bulk CSV import for students
- [ ] Push notifications
- [ ] Offline support for study tracker
- [ ] Dark mode
- [ ] Audit logging
- [ ] Custom tracker fields (admin configurable)
- [ ] Master schedule management
- [ ] Chat/notes between student and mentor

## Business Enhancement
Consider adding a **Premium Tier** with features like AI-powered study recommendations, personalized revision schedules, and predictive performance analytics to drive revenue.
