#!/usr/bin/env python3

import requests
import sys
import json
from datetime import datetime, timedelta
import uuid

class CVLNCommandCenterTester:
    def __init__(self, base_url="https://creative-hub-489.preview.emergentagent.com"):
        self.base_url = base_url
        self.token = None
        self.admin_token = None
        self.manager_token = None
        self.viewer_token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.created_resources = {
            'users': [],
            'projects': [],
            'tasks': [],
            'finance': [],
            'contacts': [],
            'events': [],
            'kpis': []
        }

    def log(self, message, level="INFO"):
        timestamp = datetime.now().strftime("%H:%M:%S")
        print(f"[{timestamp}] {level}: {message}")

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None, files=None):
        """Run a single API test"""
        url = f"{self.base_url}/api/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        
        if headers:
            test_headers.update(headers)
        
        if self.token and 'Authorization' not in test_headers:
            test_headers['Authorization'] = f'Bearer {self.token}'

        self.tests_run += 1
        self.log(f"🔍 Testing {name}...")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers)
            elif method == 'POST':
                if files:
                    # Remove Content-Type for file uploads
                    test_headers.pop('Content-Type', None)
                    response = requests.post(url, data=data, files=files, headers=test_headers)
                else:
                    response = requests.post(url, json=data, headers=test_headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=test_headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=test_headers)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                self.log(f"✅ {name} - Status: {response.status_code}", "PASS")
                try:
                    return True, response.json() if response.content else {}
                except:
                    return True, {}
            else:
                self.log(f"❌ {name} - Expected {expected_status}, got {response.status_code}", "FAIL")
                try:
                    error_detail = response.json()
                    self.log(f"   Error: {error_detail}", "ERROR")
                except:
                    self.log(f"   Response: {response.text[:200]}", "ERROR")
                return False, {}

        except Exception as e:
            self.log(f"❌ {name} - Exception: {str(e)}", "FAIL")
            return False, {}

    def test_user_registration_and_auth(self):
        """Test user registration and authentication"""
        self.log("=== TESTING USER REGISTRATION & AUTHENTICATION ===")
        
        # Try to login with existing admin first
        login_data = {
            "email": "admin@cvln.com",
            "password": "admin123"
        }
        success, response = self.run_test(
            "Admin Login (Existing)",
            "POST",
            "auth/login",
            200,
            data=login_data
        )
        
        if success and 'access_token' in response:
            self.admin_token = response['access_token']
            self.token = self.admin_token  # Set as default
            self.log(f"Logged in with existing admin user")
        else:
            # If login fails, try to register new admin
            admin_data = {
                "email": f"admin_{uuid.uuid4().hex[:8]}@cvln.com",
                "password": "admin123",
                "name": "Admin User",
                "role": "admin"
            }
            success, response = self.run_test(
                "Admin Registration",
                "POST",
                "auth/register",
                200,
                data=admin_data
            )
            if success and 'access_token' in response:
                self.admin_token = response['access_token']
                self.token = self.admin_token  # Set as default
                self.created_resources['users'].append(response['user']['id'])
                self.log(f"Admin user created with ID: {response['user']['id']}")

        # Test get current user
        success, response = self.run_test(
            "Get Current User",
            "GET",
            "auth/me",
            200
        )
        
        if not success:
            self.log("Failed to authenticate. Stopping tests.", "CRITICAL")
            return False

        # Test manager registration
        manager_data = {
            "email": f"manager_{uuid.uuid4().hex[:8]}@cvln.com",
            "password": "manager123",
            "name": "Manager User",
            "role": "manager"
        }
        success, response = self.run_test(
            "Manager Registration",
            "POST",
            "auth/register",
            200,
            data=manager_data
        )
        if success and 'access_token' in response:
            self.manager_token = response['access_token']
            self.created_resources['users'].append(response['user']['id'])

        # Test viewer registration
        viewer_data = {
            "email": f"viewer_{uuid.uuid4().hex[:8]}@cvln.com",
            "password": "viewer123",
            "name": "Viewer User",
            "role": "viewer"
        }
        success, response = self.run_test(
            "Viewer Registration",
            "POST",
            "auth/register",
            200,
            data=viewer_data
        )
        if success and 'access_token' in response:
            self.viewer_token = response['access_token']
            self.created_resources['users'].append(response['user']['id'])

        return self.admin_token is not None

    def test_dashboard_stats(self):
        """Test dashboard statistics"""
        self.log("=== TESTING DASHBOARD STATS ===")
        
        success, response = self.run_test(
            "Dashboard Stats",
            "GET",
            "dashboard/stats",
            200
        )
        
        if success:
            required_keys = ['projects', 'tasks', 'contacts', 'events', 'finance']
            for key in required_keys:
                if key not in response:
                    self.log(f"Missing key in dashboard stats: {key}", "ERROR")
                    return False
            self.log("Dashboard stats structure is correct")
        
        return success

    def test_projects_crud(self):
        """Test Projects CRUD operations"""
        self.log("=== TESTING PROJECTS CRUD ===")
        
        # Create project
        project_data = {
            "name": "Test Project Alpha",
            "description": "A test project for CVLN Command Center",
            "status": "planning",
            "deadline": (datetime.now() + timedelta(days=30)).strftime('%Y-%m-%d'),
            "team_members": ["john@example.com", "jane@example.com"],
            "budget": 50000.0
        }
        
        success, response = self.run_test(
            "Create Project",
            "POST",
            "projects",
            200,
            data=project_data
        )
        
        project_id = None
        if success and 'id' in response:
            project_id = response['id']
            self.created_resources['projects'].append(project_id)
            self.log(f"Project created with ID: {project_id}")

        # Get all projects
        self.run_test(
            "Get All Projects",
            "GET",
            "projects",
            200
        )

        # Get specific project
        if project_id:
            self.run_test(
                "Get Specific Project",
                "GET",
                f"projects/{project_id}",
                200
            )

            # Update project
            update_data = {
                **project_data,
                "status": "in_progress",
                "budget": 60000.0
            }
            self.run_test(
                "Update Project",
                "PUT",
                f"projects/{project_id}",
                200,
                data=update_data
            )

        return project_id is not None

    def test_tasks_crud(self):
        """Test Tasks CRUD operations"""
        self.log("=== TESTING TASKS CRUD ===")
        
        # Create task
        task_data = {
            "title": "Implement Authentication System",
            "description": "Set up JWT authentication for the application",
            "priority": "high",
            "status": "todo",
            "deadline": (datetime.now() + timedelta(days=7)).strftime('%Y-%m-%d'),
            "assigned_to": "developer@cvln.com",
            "project_id": self.created_resources['projects'][0] if self.created_resources['projects'] else None
        }
        
        success, response = self.run_test(
            "Create Task",
            "POST",
            "tasks",
            200,
            data=task_data
        )
        
        task_id = None
        if success and 'id' in response:
            task_id = response['id']
            self.created_resources['tasks'].append(task_id)

        # Get all tasks
        self.run_test(
            "Get All Tasks",
            "GET",
            "tasks",
            200
        )

        # Update task
        if task_id:
            update_data = {
                **task_data,
                "status": "in_progress",
                "priority": "urgent"
            }
            self.run_test(
                "Update Task",
                "PUT",
                f"tasks/{task_id}",
                200,
                data=update_data
            )

        return task_id is not None

    def test_finance_crud(self):
        """Test Finance CRUD operations"""
        self.log("=== TESTING FINANCE CRUD ===")
        
        # Create revenue record
        revenue_data = {
            "type": "revenue",
            "category": "Sales",
            "amount": 25000.0,
            "description": "Q1 Sales Revenue",
            "project_id": self.created_resources['projects'][0] if self.created_resources['projects'] else None,
            "date": datetime.now().strftime('%Y-%m-%d')
        }
        
        success, response = self.run_test(
            "Create Revenue Record",
            "POST",
            "finance",
            200,
            data=revenue_data
        )
        
        if success and 'id' in response:
            self.created_resources['finance'].append(response['id'])

        # Create expense record
        expense_data = {
            "type": "expense",
            "category": "Operations",
            "amount": 5000.0,
            "description": "Office rent and utilities",
            "date": datetime.now().strftime('%Y-%m-%d')
        }
        
        success, response = self.run_test(
            "Create Expense Record",
            "POST",
            "finance",
            200,
            data=expense_data
        )
        
        if success and 'id' in response:
            self.created_resources['finance'].append(response['id'])

        # Get all finance records
        self.run_test(
            "Get All Finance Records",
            "GET",
            "finance",
            200
        )

        return len(self.created_resources['finance']) > 0

    def test_contacts_crud(self):
        """Test Contacts CRUD operations"""
        self.log("=== TESTING CONTACTS CRUD ===")
        
        # Create partner contact
        partner_data = {
            "name": "Tech Solutions Inc",
            "email": "contact@techsolutions.com",
            "phone": "+1-555-0123",
            "company": "Tech Solutions Inc",
            "type": "partner",
            "notes": "Strategic technology partner for development projects"
        }
        
        success, response = self.run_test(
            "Create Partner Contact",
            "POST",
            "contacts",
            200,
            data=partner_data
        )
        
        if success and 'id' in response:
            self.created_resources['contacts'].append(response['id'])

        # Create sponsor contact
        sponsor_data = {
            "name": "Creative Arts Foundation",
            "email": "grants@creativearts.org",
            "phone": "+1-555-0456",
            "company": "Creative Arts Foundation",
            "type": "sponsor",
            "notes": "Major sponsor for arts and culture projects"
        }
        
        success, response = self.run_test(
            "Create Sponsor Contact",
            "POST",
            "contacts",
            200,
            data=sponsor_data
        )
        
        if success and 'id' in response:
            self.created_resources['contacts'].append(response['id'])

        # Get all contacts
        self.run_test(
            "Get All Contacts",
            "GET",
            "contacts",
            200
        )

        # Get contacts by type
        self.run_test(
            "Get Sponsor Contacts",
            "GET",
            "contacts?type=sponsor",
            200
        )

        return len(self.created_resources['contacts']) > 0

    def test_events_crud(self):
        """Test Events CRUD operations"""
        self.log("=== TESTING EVENTS CRUD ===")
        
        # Create event
        event_data = {
            "title": "CVLN Annual Conference 2024",
            "description": "Annual conference showcasing latest developments",
            "date": (datetime.now() + timedelta(days=60)).strftime('%Y-%m-%d'),
            "end_date": (datetime.now() + timedelta(days=62)).strftime('%Y-%m-%d'),
            "location": "Convention Center, Downtown",
            "checklist": [
                "Book venue",
                "Send invitations",
                "Prepare presentations",
                "Arrange catering",
                "Set up AV equipment"
            ],
            "project_id": self.created_resources['projects'][0] if self.created_resources['projects'] else None,
            "status": "upcoming"
        }
        
        success, response = self.run_test(
            "Create Event",
            "POST",
            "events",
            200,
            data=event_data
        )
        
        if success and 'id' in response:
            self.created_resources['events'].append(response['id'])

        # Get all events
        self.run_test(
            "Get All Events",
            "GET",
            "events",
            200
        )

        return len(self.created_resources['events']) > 0

    def test_kpis_crud(self):
        """Test KPIs CRUD operations"""
        self.log("=== TESTING KPIS CRUD ===")
        
        # Create revenue KPI
        revenue_kpi = {
            "name": "Monthly Revenue",
            "value": 45000.0,
            "unit": "$",
            "category": "revenue",
            "target": 50000.0,
            "period": "monthly"
        }
        
        success, response = self.run_test(
            "Create Revenue KPI",
            "POST",
            "kpis",
            200,
            data=revenue_kpi
        )
        
        if success and 'id' in response:
            self.created_resources['kpis'].append(response['id'])

        # Create performance KPI
        performance_kpi = {
            "name": "Project Completion Rate",
            "value": 85.0,
            "unit": "%",
            "category": "performance",
            "target": 90.0,
            "period": "quarterly"
        }
        
        success, response = self.run_test(
            "Create Performance KPI",
            "POST",
            "kpis",
            200,
            data=performance_kpi
        )
        
        if success and 'id' in response:
            self.created_resources['kpis'].append(response['id'])

        # Get all KPIs
        self.run_test(
            "Get All KPIs",
            "GET",
            "kpis",
            200
        )

        # Get KPIs by category
        self.run_test(
            "Get Revenue KPIs",
            "GET",
            "kpis?category=revenue",
            200
        )

        return len(self.created_resources['kpis']) > 0

    def test_admin_functionality(self):
        """Test admin-only functionality"""
        self.log("=== TESTING ADMIN FUNCTIONALITY ===")
        
        # Get all users (admin only)
        success, response = self.run_test(
            "Get All Users (Admin)",
            "GET",
            "users",
            200
        )
        
        if success and len(response) > 0:
            # Test role update (admin only)
            user_to_update = None
            for user in response:
                if user['role'] != 'admin':  # Don't modify admin users
                    user_to_update = user
                    break
            
            if user_to_update:
                self.run_test(
                    "Update User Role",
                    "PUT",
                    f"users/{user_to_update['id']}/role?role=manager",
                    200
                )

        return success

    def test_role_based_access(self):
        """Test role-based access control"""
        self.log("=== TESTING ROLE-BASED ACCESS CONTROL ===")
        
        # Test viewer access (should fail for create operations)
        if self.viewer_token:
            old_token = self.token
            self.token = self.viewer_token
            
            # Viewer should NOT be able to create projects
            project_data = {
                "name": "Unauthorized Project",
                "description": "This should fail",
                "status": "planning"
            }
            
            success, response = self.run_test(
                "Viewer Create Project (Should Fail)",
                "POST",
                "projects",
                403,  # Expecting forbidden
                data=project_data
            )
            
            # Viewer should be able to read projects
            self.run_test(
                "Viewer Read Projects (Should Pass)",
                "GET",
                "projects",
                200
            )
            
            self.token = old_token  # Restore admin token

        return True

    def test_document_upload(self):
        """Test document upload functionality"""
        self.log("=== TESTING DOCUMENT UPLOAD ===")
        
        # Create a test file
        test_content = "This is a test document for CVLN Command Center"
        
        # Prepare file data
        files = {
            'file': ('test_document.txt', test_content, 'text/plain')
        }
        
        form_data = {
            'title': 'Test Document',
            'category': 'General'
        }
        
        if self.created_resources['projects']:
            form_data['project_id'] = self.created_resources['projects'][0]
        
        success, response = self.run_test(
            "Upload Document",
            "POST",
            "documents",
            200,
            data=form_data,
            files=files
        )
        
        # Get all documents
        self.run_test(
            "Get All Documents",
            "GET",
            "documents",
            200
        )
        
        return success

    def run_all_tests(self):
        """Run all tests in sequence"""
        self.log("🚀 Starting CVLN Command Center API Tests")
        self.log(f"Testing against: {self.base_url}")
        
        # Test authentication first
        if not self.test_user_registration_and_auth():
            self.log("❌ Authentication tests failed. Stopping.", "CRITICAL")
            return False
        
        # Test dashboard
        self.test_dashboard_stats()
        
        # Test CRUD operations
        self.test_projects_crud()
        self.test_tasks_crud()
        self.test_finance_crud()
        self.test_contacts_crud()
        self.test_events_crud()
        self.test_kpis_crud()
        
        # Test admin functionality
        self.test_admin_functionality()
        
        # Test role-based access
        self.test_role_based_access()
        
        # Test document upload
        self.test_document_upload()
        
        # Print results
        self.log("=" * 50)
        self.log(f"📊 FINAL RESULTS:")
        self.log(f"   Tests Run: {self.tests_run}")
        self.log(f"   Tests Passed: {self.tests_passed}")
        self.log(f"   Tests Failed: {self.tests_run - self.tests_passed}")
        self.log(f"   Success Rate: {(self.tests_passed/self.tests_run*100):.1f}%")
        
        if self.tests_passed == self.tests_run:
            self.log("🎉 ALL TESTS PASSED!", "SUCCESS")
            return True
        else:
            self.log(f"⚠️  {self.tests_run - self.tests_passed} tests failed", "WARNING")
            return False

def main():
    tester = CVLNCommandCenterTester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())