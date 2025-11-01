#!/usr/bin/env python3
"""
Comprehensive Backend API Tests for Corretor 80/20
Tests all backend endpoints with proper authentication flow
"""

import requests
import json
import os
from datetime import datetime

# Get base URL from environment
BASE_URL = "https://correct80-20.preview.emergentagent.com"
API_BASE = f"{BASE_URL}/api"

class CorretorAPITester:
    def __init__(self):
        self.session = requests.Session()
        self.auth_token = None
        self.test_user_email = f"test_{datetime.now().strftime('%Y%m%d_%H%M%S')}@example.com"
        self.test_user_password = "TestPassword123!"
        self.test_user_name = "Test User"
        self.user_id = None
        self.results = []
        
    def log_result(self, test_name, success, message, response_data=None):
        """Log test result"""
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}: {message}")
        
        self.results.append({
            'test': test_name,
            'success': success,
            'message': message,
            'response_data': response_data
        })
        
    def make_request(self, method, endpoint, data=None, files=None, headers=None):
        """Make HTTP request with proper error handling"""
        url = f"{API_BASE}{endpoint}"
        
        # Add auth header if token exists
        if self.auth_token and headers is None:
            headers = {'Authorization': f'Bearer {self.auth_token}'}
        elif self.auth_token and headers:
            headers['Authorization'] = f'Bearer {self.auth_token}'
            
        try:
            if method.upper() == 'GET':
                response = self.session.get(url, headers=headers)
            elif method.upper() == 'POST':
                if files:
                    response = self.session.post(url, data=data, files=files, headers=headers)
                else:
                    response = self.session.post(url, json=data, headers=headers)
            elif method.upper() == 'PUT':
                response = self.session.put(url, json=data, headers=headers)
            else:
                raise ValueError(f"Unsupported method: {method}")
                
            return response
        except Exception as e:
            print(f"Request error: {e}")
            return None
    
    def test_auth_register(self):
        """Test POST /api/auth/register"""
        print("\n=== Testing Auth Registration ===")
        
        # Test with valid data
        data = {
            "email": self.test_user_email,
            "password": self.test_user_password,
            "name": self.test_user_name
        }
        
        response = self.make_request('POST', '/auth/register', data)
        
        if response is None:
            self.log_result("Auth Register", False, "Request failed - no response")
            return False
            
        if response.status_code == 200:
            try:
                result = response.json()
                if 'token' in result and 'user' in result:
                    self.auth_token = result['token']
                    self.user_id = result['user']['id']
                    self.log_result("Auth Register", True, f"User registered successfully with ID: {self.user_id}", result)
                    return True
                else:
                    self.log_result("Auth Register", False, f"Missing token or user in response: {result}")
                    return False
            except json.JSONDecodeError:
                self.log_result("Auth Register", False, f"Invalid JSON response: {response.text}")
                return False
        else:
            self.log_result("Auth Register", False, f"HTTP {response.status_code}: {response.text}")
            return False
    
    def test_auth_register_duplicate(self):
        """Test duplicate registration"""
        print("\n=== Testing Duplicate Registration ===")
        
        data = {
            "email": self.test_user_email,
            "password": self.test_user_password,
            "name": self.test_user_name
        }
        
        response = self.make_request('POST', '/auth/register', data)
        
        if response and response.status_code == 400:
            try:
                result = response.json()
                if 'error' in result and 'already registered' in result['error'].lower():
                    self.log_result("Auth Register Duplicate", True, "Correctly rejected duplicate email")
                    return True
                else:
                    self.log_result("Auth Register Duplicate", False, f"Unexpected error message: {result}")
                    return False
            except json.JSONDecodeError:
                self.log_result("Auth Register Duplicate", False, f"Invalid JSON response: {response.text}")
                return False
        else:
            self.log_result("Auth Register Duplicate", False, f"Expected 400 error, got {response.status_code if response else 'no response'}")
            return False
    
    def test_auth_login(self):
        """Test POST /api/auth/login"""
        print("\n=== Testing Auth Login ===")
        
        data = {
            "email": self.test_user_email,
            "password": self.test_user_password
        }
        
        response = self.make_request('POST', '/auth/login', data)
        
        if response is None:
            self.log_result("Auth Login", False, "Request failed - no response")
            return False
            
        if response.status_code == 200:
            try:
                result = response.json()
                if 'token' in result and 'user' in result:
                    # Update token (should be same but good practice)
                    self.auth_token = result['token']
                    self.log_result("Auth Login", True, f"Login successful for user: {result['user']['email']}", result)
                    return True
                else:
                    self.log_result("Auth Login", False, f"Missing token or user in response: {result}")
                    return False
            except json.JSONDecodeError:
                self.log_result("Auth Login", False, f"Invalid JSON response: {response.text}")
                return False
        else:
            self.log_result("Auth Login", False, f"HTTP {response.status_code}: {response.text}")
            return False
    
    def test_auth_login_invalid(self):
        """Test login with invalid credentials"""
        print("\n=== Testing Invalid Login ===")
        
        data = {
            "email": self.test_user_email,
            "password": "wrongpassword"
        }
        
        response = self.make_request('POST', '/auth/login', data)
        
        if response and response.status_code == 401:
            try:
                result = response.json()
                if 'error' in result and 'invalid credentials' in result['error'].lower():
                    self.log_result("Auth Login Invalid", True, "Correctly rejected invalid credentials")
                    return True
                else:
                    self.log_result("Auth Login Invalid", False, f"Unexpected error message: {result}")
                    return False
            except json.JSONDecodeError:
                self.log_result("Auth Login Invalid", False, f"Invalid JSON response: {response.text}")
                return False
        else:
            self.log_result("Auth Login Invalid", False, f"Expected 401 error, got {response.status_code if response else 'no response'}")
            return False
    
    def test_auth_me(self):
        """Test GET /api/auth/me"""
        print("\n=== Testing Auth Me ===")
        
        if not self.auth_token:
            self.log_result("Auth Me", False, "No auth token available")
            return False
            
        response = self.make_request('GET', '/auth/me')
        
        if response is None:
            self.log_result("Auth Me", False, "Request failed - no response")
            return False
            
        if response.status_code == 200:
            try:
                result = response.json()
                if 'user' in result and result['user']['email'] == self.test_user_email:
                    self.log_result("Auth Me", True, f"Retrieved user info: {result['user']['name']}", result)
                    return True
                else:
                    self.log_result("Auth Me", False, f"Unexpected user data: {result}")
                    return False
            except json.JSONDecodeError:
                self.log_result("Auth Me", False, f"Invalid JSON response: {response.text}")
                return False
        else:
            self.log_result("Auth Me", False, f"HTTP {response.status_code}: {response.text}")
            return False
    
    def test_auth_me_unauthorized(self):
        """Test GET /api/auth/me without token"""
        print("\n=== Testing Auth Me Unauthorized ===")
        
        response = self.make_request('GET', '/auth/me', headers={})
        
        if response and response.status_code == 401:
            self.log_result("Auth Me Unauthorized", True, "Correctly rejected request without token")
            return True
        else:
            self.log_result("Auth Me Unauthorized", False, f"Expected 401 error, got {response.status_code if response else 'no response'}")
            return False
    
    def test_credits_balance(self):
        """Test GET /api/credits"""
        print("\n=== Testing Credits Balance ===")
        
        if not self.auth_token:
            self.log_result("Credits Balance", False, "No auth token available")
            return False
            
        response = self.make_request('GET', '/credits')
        
        if response is None:
            self.log_result("Credits Balance", False, "Request failed - no response")
            return False
            
        if response.status_code == 200:
            try:
                result = response.json()
                if 'saldoAtual' in result:
                    credits = result['saldoAtual']
                    if credits == 10:
                        self.log_result("Credits Balance", True, f"Initial credits correct: {credits}", result)
                        return True
                    else:
                        self.log_result("Credits Balance", False, f"Expected 10 initial credits, got {credits}", result)
                        return False
                else:
                    self.log_result("Credits Balance", False, f"Missing saldoAtual in response: {result}")
                    return False
            except json.JSONDecodeError:
                self.log_result("Credits Balance", False, f"Invalid JSON response: {response.text}")
                return False
        else:
            self.log_result("Credits Balance", False, f"HTTP {response.status_code}: {response.text}")
            return False
    
    def test_settings_get(self):
        """Test GET /api/settings"""
        print("\n=== Testing Settings Get ===")
        
        if not self.auth_token:
            self.log_result("Settings Get", False, "No auth token available")
            return False
            
        response = self.make_request('GET', '/settings')
        
        if response is None:
            self.log_result("Settings Get", False, "Request failed - no response")
            return False
            
        if response.status_code == 200:
            try:
                result = response.json()
                if 'geminiApiKey' in result and 'n8nWebhookUrl' in result:
                    self.log_result("Settings Get", True, f"Settings retrieved: geminiApiKey={bool(result['geminiApiKey'])}, n8nWebhookUrl={bool(result['n8nWebhookUrl'])}", result)
                    return True
                else:
                    self.log_result("Settings Get", False, f"Missing required fields in response: {result}")
                    return False
            except json.JSONDecodeError:
                self.log_result("Settings Get", False, f"Invalid JSON response: {response.text}")
                return False
        else:
            self.log_result("Settings Get", False, f"HTTP {response.status_code}: {response.text}")
            return False
    
    def test_settings_update(self):
        """Test PUT /api/settings"""
        print("\n=== Testing Settings Update ===")
        
        if not self.auth_token:
            self.log_result("Settings Update", False, "No auth token available")
            return False
            
        data = {
            "geminiApiKey": "test-gemini-api-key-12345",
            "n8nWebhookUrl": "https://test-webhook.example.com/webhook"
        }
        
        response = self.make_request('PUT', '/settings', data)
        
        if response is None:
            self.log_result("Settings Update", False, "Request failed - no response")
            return False
            
        if response.status_code == 200:
            try:
                result = response.json()
                if result.get('success'):
                    self.log_result("Settings Update", True, "Settings updated successfully", result)
                    return True
                else:
                    self.log_result("Settings Update", False, f"Unexpected response: {result}")
                    return False
            except json.JSONDecodeError:
                self.log_result("Settings Update", False, f"Invalid JSON response: {response.text}")
                return False
        else:
            self.log_result("Settings Update", False, f"HTTP {response.status_code}: {response.text}")
            return False
    
    def test_gabaritos_create(self):
        """Test POST /api/gabaritos"""
        print("\n=== Testing Gabaritos Create ===")
        
        if not self.auth_token:
            self.log_result("Gabaritos Create", False, "No auth token available")
            return False
            
        data = {
            "titulo": "Test Answer Key - Math Quiz",
            "conteudo": "1. A) 2+2=4\n2. B) 3*3=9\n3. C) 5-2=3\n4. D) 10/2=5\n5. A) 7+3=10"
        }
        
        response = self.make_request('POST', '/gabaritos', data)
        
        if response is None:
            self.log_result("Gabaritos Create", False, "Request failed - no response")
            return False
            
        if response.status_code == 200:
            try:
                result = response.json()
                if 'gabarito' in result and result['gabarito']['titulo'] == data['titulo']:
                    self.gabarito_id = result['gabarito']['id']
                    self.log_result("Gabaritos Create", True, f"Gabarito created with ID: {self.gabarito_id}", result)
                    return True
                else:
                    self.log_result("Gabaritos Create", False, f"Unexpected response: {result}")
                    return False
            except json.JSONDecodeError:
                self.log_result("Gabaritos Create", False, f"Invalid JSON response: {response.text}")
                return False
        else:
            self.log_result("Gabaritos Create", False, f"HTTP {response.status_code}: {response.text}")
            return False
    
    def test_gabaritos_create_missing_fields(self):
        """Test POST /api/gabaritos with missing fields"""
        print("\n=== Testing Gabaritos Create Missing Fields ===")
        
        if not self.auth_token:
            self.log_result("Gabaritos Create Missing Fields", False, "No auth token available")
            return False
            
        data = {
            "titulo": "Test Answer Key"
            # Missing conteudo
        }
        
        response = self.make_request('POST', '/gabaritos', data)
        
        if response and response.status_code == 400:
            try:
                result = response.json()
                if 'error' in result and 'missing required fields' in result['error'].lower():
                    self.log_result("Gabaritos Create Missing Fields", True, "Correctly rejected missing fields")
                    return True
                else:
                    self.log_result("Gabaritos Create Missing Fields", False, f"Unexpected error message: {result}")
                    return False
            except json.JSONDecodeError:
                self.log_result("Gabaritos Create Missing Fields", False, f"Invalid JSON response: {response.text}")
                return False
        else:
            self.log_result("Gabaritos Create Missing Fields", False, f"Expected 400 error, got {response.status_code if response else 'no response'}")
            return False
    
    def test_gabaritos_list(self):
        """Test GET /api/gabaritos"""
        print("\n=== Testing Gabaritos List ===")
        
        if not self.auth_token:
            self.log_result("Gabaritos List", False, "No auth token available")
            return False
            
        response = self.make_request('GET', '/gabaritos')
        
        if response is None:
            self.log_result("Gabaritos List", False, "Request failed - no response")
            return False
            
        if response.status_code == 200:
            try:
                result = response.json()
                if 'gabaritos' in result:
                    gabaritos = result['gabaritos']
                    if len(gabaritos) >= 1:
                        self.log_result("Gabaritos List", True, f"Retrieved {len(gabaritos)} gabaritos", result)
                        return True
                    else:
                        self.log_result("Gabaritos List", False, f"Expected at least 1 gabarito, got {len(gabaritos)}")
                        return False
                else:
                    self.log_result("Gabaritos List", False, f"Missing gabaritos in response: {result}")
                    return False
            except json.JSONDecodeError:
                self.log_result("Gabaritos List", False, f"Invalid JSON response: {response.text}")
                return False
        else:
            self.log_result("Gabaritos List", False, f"HTTP {response.status_code}: {response.text}")
            return False
    
    def test_upload_no_settings(self):
        """Test POST /api/upload without N8N webhook configured"""
        print("\n=== Testing Upload No Settings ===")
        
        if not self.auth_token:
            self.log_result("Upload No Settings", False, "No auth token available")
            return False
        
        # First clear settings to test error case
        clear_data = {
            "geminiApiKey": "",
            "n8nWebhookUrl": ""
        }
        self.make_request('PUT', '/settings', clear_data)
        
        # Create a dummy file
        files = {'image': ('test.jpg', b'fake image data', 'image/jpeg')}
        data = {'gabaritoId': 'test-gabarito-id'}
        
        response = self.make_request('POST', '/upload', data, files)
        
        if response and response.status_code == 400:
            try:
                result = response.json()
                if 'error' in result and 'webhook url not configured' in result['error'].lower():
                    self.log_result("Upload No Settings", True, "Correctly rejected upload without N8N webhook URL")
                    return True
                else:
                    self.log_result("Upload No Settings", False, f"Unexpected error message: {result}")
                    return False
            except json.JSONDecodeError:
                self.log_result("Upload No Settings", False, f"Invalid JSON response: {response.text}")
                return False
        else:
            self.log_result("Upload No Settings", False, f"Expected 400 error, got {response.status_code if response else 'no response'}: {response.text if response else 'no response'}")
            return False
    
    def test_upload_no_file(self):
        """Test POST /api/upload without file"""
        print("\n=== Testing Upload No File ===")
        
        if not self.auth_token:
            self.log_result("Upload No File", False, "No auth token available")
            return False
        
        # Set up settings first
        settings_data = {
            "geminiApiKey": "test-key",
            "n8nWebhookUrl": "https://test-webhook.example.com/webhook"
        }
        self.make_request('PUT', '/settings', settings_data)
        
        data = {'gabaritoId': 'test-gabarito-id'}
        
        response = self.make_request('POST', '/upload', data)
        
        if response and response.status_code == 400:
            try:
                result = response.json()
                if 'error' in result and 'no image provided' in result['error'].lower():
                    self.log_result("Upload No File", True, "Correctly rejected upload without image")
                    return True
                else:
                    self.log_result("Upload No File", False, f"Unexpected error message: {result}")
                    return False
            except json.JSONDecodeError:
                self.log_result("Upload No File", False, f"Invalid JSON response: {response.text}")
                return False
        else:
            self.log_result("Upload No File", False, f"Expected 400 error, got {response.status_code if response else 'no response'}: {response.text if response else 'no response'}")
            return False
    
    def test_avaliacoes_list(self):
        """Test GET /api/avaliacoes"""
        print("\n=== Testing Avaliacoes List ===")
        
        if not self.auth_token:
            self.log_result("Avaliacoes List", False, "No auth token available")
            return False
            
        response = self.make_request('GET', '/avaliacoes')
        
        if response is None:
            self.log_result("Avaliacoes List", False, "Request failed - no response")
            return False
            
        if response.status_code == 200:
            try:
                result = response.json()
                if 'avaliacoes' in result:
                    avaliacoes = result['avaliacoes']
                    self.log_result("Avaliacoes List", True, f"Retrieved {len(avaliacoes)} avaliacoes (should be empty initially)", result)
                    return True
                else:
                    self.log_result("Avaliacoes List", False, f"Missing avaliacoes in response: {result}")
                    return False
            except json.JSONDecodeError:
                self.log_result("Avaliacoes List", False, f"Invalid JSON response: {response.text}")
                return False
        else:
            self.log_result("Avaliacoes List", False, f"HTTP {response.status_code}: {response.text}")
            return False
    
    def run_all_tests(self):
        """Run all backend tests in sequence"""
        print(f"🚀 Starting Corretor 80/20 Backend API Tests")
        print(f"📍 Base URL: {BASE_URL}")
        print(f"📧 Test User: {self.test_user_email}")
        print("=" * 60)
        
        # Auth flow tests
        if not self.test_auth_register():
            print("❌ Registration failed - stopping tests")
            return False
            
        self.test_auth_register_duplicate()
        
        if not self.test_auth_login():
            print("❌ Login failed - stopping tests")
            return False
            
        self.test_auth_login_invalid()
        
        if not self.test_auth_me():
            print("❌ Auth me failed - stopping tests")
            return False
            
        self.test_auth_me_unauthorized()
        
        # Credits test
        self.test_credits_balance()
        
        # Settings tests
        self.test_settings_get()
        self.test_settings_update()
        
        # Gabaritos tests
        self.test_gabaritos_create()
        self.test_gabaritos_create_missing_fields()
        self.test_gabaritos_list()
        
        # Upload tests (error cases only)
        self.test_upload_no_settings()
        self.test_upload_no_file()
        
        # Avaliacoes test
        self.test_avaliacoes_list()
        
        # Summary
        print("\n" + "=" * 60)
        print("📊 TEST SUMMARY")
        print("=" * 60)
        
        passed = sum(1 for r in self.results if r['success'])
        total = len(self.results)
        
        print(f"✅ Passed: {passed}/{total}")
        print(f"❌ Failed: {total - passed}/{total}")
        
        if total - passed > 0:
            print("\n🔍 FAILED TESTS:")
            for result in self.results:
                if not result['success']:
                    print(f"  ❌ {result['test']}: {result['message']}")
        
        print(f"\n🎯 Overall Success Rate: {(passed/total)*100:.1f}%")
        
        return passed == total

if __name__ == "__main__":
    tester = CorretorAPITester()
    success = tester.run_all_tests()
    
    if success:
        print("\n🎉 All tests passed!")
        exit(0)
    else:
        print("\n⚠️  Some tests failed!")
        exit(1)