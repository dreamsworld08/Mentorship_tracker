import pytest
import requests
import os

# Backend API Testing for Sleepy Classes Mentorship Tracker
# Tests: Auth (demo login, /auth/me), Tracker, Mentees, Analytics, Announcements

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', '').rstrip('/')

class TestAuth:
    """Authentication endpoint tests"""

    def test_demo_login_student(self):
        """Test demo login as student"""
        response = requests.post(f"{BASE_URL}/api/auth/demo-login", json={"role": "student"})
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "user" in data, "Response missing 'user' field"
        assert "session_token" in data, "Response missing 'session_token' field"
        assert data["user"]["role"] == "student", f"Expected role 'student', got {data['user']['role']}"
        assert "user_id" in data["user"], "User missing 'user_id' field"
        assert "email" in data["user"], "User missing 'email' field"
        assert "name" in data["user"], "User missing 'name' field"
        print(f"✓ Student demo login successful: {data['user']['name']}")

    def test_demo_login_mentor(self):
        """Test demo login as mentor"""
        response = requests.post(f"{BASE_URL}/api/auth/demo-login", json={"role": "mentor"})
        assert response.status_code == 200
        
        data = response.json()
        assert data["user"]["role"] == "mentor"
        assert "session_token" in data
        print(f"✓ Mentor demo login successful: {data['user']['name']}")

    def test_demo_login_admin(self):
        """Test demo login as admin"""
        response = requests.post(f"{BASE_URL}/api/auth/demo-login", json={"role": "admin"})
        assert response.status_code == 200
        
        data = response.json()
        assert data["user"]["role"] == "admin"
        assert "session_token" in data
        print(f"✓ Admin demo login successful: {data['user']['name']}")

    def test_auth_me_with_token(self):
        """Test /auth/me with valid token"""
        # First login
        login_response = requests.post(f"{BASE_URL}/api/auth/demo-login", json={"role": "student"})
        assert login_response.status_code == 200
        token = login_response.json()["session_token"]
        
        # Then get user info
        response = requests.get(f"{BASE_URL}/api/auth/me", headers={"Authorization": f"Bearer {token}"})
        assert response.status_code == 200
        
        data = response.json()
        assert "user_id" in data
        assert data["role"] == "student"
        print(f"✓ /auth/me successful for student: {data['name']}")

    def test_auth_me_without_token(self):
        """Test /auth/me without token returns 401"""
        response = requests.get(f"{BASE_URL}/api/auth/me")
        assert response.status_code == 401, f"Expected 401 for unauthenticated request, got {response.status_code}"
        print("✓ /auth/me correctly returns 401 without token")


class TestTrackerAPI:
    """Tracker endpoint tests"""

    def test_tracker_summary_student(self):
        """Test GET /tracker/{student_id}/summary"""
        # Login as student
        login_response = requests.post(f"{BASE_URL}/api/auth/demo-login", json={"role": "student"})
        assert login_response.status_code == 200
        token = login_response.json()["session_token"]
        student_id = login_response.json()["user"]["user_id"]
        
        # Get tracker summary
        response = requests.get(
            f"{BASE_URL}/api/tracker/{student_id}/summary",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "total_topics" in data
        assert "completed" in data
        assert "in_progress" in data
        assert "total_hours" in data
        assert "avg_completion" in data
        assert "stage_progress" in data
        assert isinstance(data["stage_progress"], list)
        print(f"✓ Tracker summary: {data['completed']}/{data['total_topics']} topics, {data['total_hours']}h")

    def test_tracker_full_data(self):
        """Test GET /tracker/{student_id} returns full syllabus tree"""
        login_response = requests.post(f"{BASE_URL}/api/auth/demo-login", json={"role": "student"})
        token = login_response.json()["session_token"]
        student_id = login_response.json()["user"]["user_id"]
        
        response = requests.get(
            f"{BASE_URL}/api/tracker/{student_id}",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list), "Expected list of stages"
        assert len(data) > 0, "Expected at least one stage"
        
        # Check structure: stages > papers > modules > topics
        stage = data[0]
        assert "stage_id" in stage
        assert "name" in stage
        assert "papers" in stage
        assert isinstance(stage["papers"], list)
        
        if len(stage["papers"]) > 0:
            paper = stage["papers"][0]
            assert "modules" in paper
            if len(paper["modules"]) > 0:
                module = paper["modules"][0]
                assert "topics" in module
        
        print(f"✓ Full tracker data: {len(data)} stages loaded")


class TestMentorAPI:
    """Mentor-specific endpoint tests"""

    def test_get_mentees(self):
        """Test GET /mentors/{mentor_id}/mentees"""
        # Login as mentor
        login_response = requests.post(f"{BASE_URL}/api/auth/demo-login", json={"role": "mentor"})
        assert login_response.status_code == 200
        token = login_response.json()["session_token"]
        mentor_id = login_response.json()["user"]["user_id"]
        
        # Get mentees
        response = requests.get(
            f"{BASE_URL}/api/mentors/{mentor_id}/mentees",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        
        if len(data) > 0:
            mentee = data[0]
            assert "user_id" in mentee
            assert "name" in mentee
            assert "progress_summary" in mentee
            
            # Check progress summary structure
            ps = mentee["progress_summary"]
            assert "total_topics" in ps
            assert "completed" in ps
            assert "in_progress" in ps
            assert "avg_completion" in ps
            assert "total_hours" in ps
            assert "status_color" in ps
            assert ps["status_color"] in ["green", "yellow", "red"]
            
            print(f"✓ Mentees loaded: {len(data)} mentees, first: {mentee['name']} ({ps['status_color']})")
        else:
            print("✓ Mentees endpoint works but no mentees assigned")


class TestAnalyticsAPI:
    """Analytics endpoint tests"""

    def test_analytics_overview_admin(self):
        """Test GET /analytics/overview for admin"""
        # Login as admin
        login_response = requests.post(f"{BASE_URL}/api/auth/demo-login", json={"role": "admin"})
        assert login_response.status_code == 200
        token = login_response.json()["session_token"]
        
        # Get analytics
        response = requests.get(
            f"{BASE_URL}/api/analytics/overview",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "total_students" in data
        assert "total_mentors" in data
        assert "total_topics" in data
        assert "total_tasks" in data
        assert "pending_tasks" in data
        assert "completed_tasks" in data
        assert "total_sessions" in data
        assert "avg_completion" in data
        assert "batch_stats" in data
        
        assert isinstance(data["total_students"], int)
        assert isinstance(data["total_mentors"], int)
        assert data["total_students"] > 0, "Expected at least 1 student"
        assert data["total_mentors"] > 0, "Expected at least 1 mentor"
        
        print(f"✓ Analytics: {data['total_students']} students, {data['total_mentors']} mentors, {data['avg_completion']}% avg completion")

    def test_analytics_overview_mentor(self):
        """Test GET /analytics/overview for mentor (should also work)"""
        login_response = requests.post(f"{BASE_URL}/api/auth/demo-login", json={"role": "mentor"})
        token = login_response.json()["session_token"]
        
        response = requests.get(
            f"{BASE_URL}/api/analytics/overview",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        print("✓ Analytics accessible to mentor")


class TestAnnouncementsAPI:
    """Announcements endpoint tests"""

    def test_get_announcements(self):
        """Test GET /announcements"""
        # Login as student
        login_response = requests.post(f"{BASE_URL}/api/auth/demo-login", json={"role": "student"})
        token = login_response.json()["session_token"]
        
        response = requests.get(
            f"{BASE_URL}/api/announcements",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        
        if len(data) > 0:
            ann = data[0]
            assert "announcement_id" in ann
            assert "title" in ann
            assert "body" in ann
            assert "created_at" in ann
            print(f"✓ Announcements loaded: {len(data)} announcements")
        else:
            print("✓ Announcements endpoint works but no announcements")


class TestTasksAPI:
    """Tasks endpoint tests"""

    def test_get_tasks_student(self):
        """Test GET /tasks for student"""
        login_response = requests.post(f"{BASE_URL}/api/auth/demo-login", json={"role": "student"})
        token = login_response.json()["session_token"]
        
        response = requests.get(
            f"{BASE_URL}/api/tasks",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Tasks loaded for student: {len(data)} tasks")


class TestUsersAPI:
    """Users endpoint tests (admin only)"""

    def test_get_users_admin(self):
        """Test GET /users for admin"""
        login_response = requests.post(f"{BASE_URL}/api/auth/demo-login", json={"role": "admin"})
        token = login_response.json()["session_token"]
        
        response = requests.get(
            f"{BASE_URL}/api/users",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0
        
        # Check user structure
        user = data[0]
        assert "user_id" in user
        assert "email" in user
        assert "role" in user
        assert "_id" not in user, "MongoDB _id should be excluded"
        
        print(f"✓ Users loaded: {len(data)} users")

    def test_get_users_student_forbidden(self):
        """Test GET /users for student returns 403"""
        login_response = requests.post(f"{BASE_URL}/api/auth/demo-login", json={"role": "student"})
        token = login_response.json()["session_token"]
        
        response = requests.get(
            f"{BASE_URL}/api/users",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 403, f"Expected 403 for student accessing /users, got {response.status_code}"
        print("✓ /users correctly returns 403 for student")


class TestLogout:
    """Logout endpoint test"""

    def test_logout(self):
        """Test POST /auth/logout"""
        # Login first
        login_response = requests.post(f"{BASE_URL}/api/auth/demo-login", json={"role": "student"})
        token = login_response.json()["session_token"]
        
        # Logout
        response = requests.post(
            f"{BASE_URL}/api/auth/logout",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        
        # Try to access protected endpoint with same token (should fail)
        me_response = requests.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert me_response.status_code == 401, "Token should be invalid after logout"
        print("✓ Logout successful, token invalidated")
