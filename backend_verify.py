#!/usr/bin/env python3
"""
Simple Backend API Verification for Corretor 80/20
Focus on core functionality verification
"""

import requests
import json
from datetime import datetime

BASE_URL = "https://correct80-20.preview.emergentagent.com"
API_BASE = f"{BASE_URL}/api"

def test_core_functionality():
    """Test core API functionality"""
    print("🔍 Testing Core Backend Functionality")
    print("=" * 50)
    
    # Test user registration and login flow
    test_email = f"verify_{datetime.now().strftime('%Y%m%d_%H%M%S')}@example.com"
    test_password = "TestPass123!"
    test_name = "Verify User"
    
    try:
        # 1. Register user
        print("1. Testing user registration...")
        register_data = {
            "email": test_email,
            "password": test_password,
            "name": test_name
        }
        
        response = requests.post(f"{API_BASE}/auth/register", json=register_data, timeout=10)
        if response.status_code == 200:
            result = response.json()
            token = result.get('token')
            user_id = result.get('user', {}).get('id')
            print(f"   ✅ Registration successful - User ID: {user_id}")
        else:
            print(f"   ❌ Registration failed: {response.status_code} - {response.text}")
            return False
        
        # 2. Test login
        print("2. Testing user login...")
        login_data = {
            "email": test_email,
            "password": test_password
        }
        
        response = requests.post(f"{API_BASE}/auth/login", json=login_data, timeout=10)
        if response.status_code == 200:
            result = response.json()
            token = result.get('token')
            print(f"   ✅ Login successful - Token received")
        else:
            print(f"   ❌ Login failed: {response.status_code} - {response.text}")
            return False
        
        # 3. Test auth/me
        print("3. Testing authenticated user info...")
        headers = {'Authorization': f'Bearer {token}'}
        response = requests.get(f"{API_BASE}/auth/me", headers=headers, timeout=10)
        if response.status_code == 200:
            result = response.json()
            user_email = result.get('user', {}).get('email')
            print(f"   ✅ User info retrieved - Email: {user_email}")
        else:
            print(f"   ❌ Auth/me failed: {response.status_code} - {response.text}")
            return False
        
        # 4. Test credits
        print("4. Testing credits balance...")
        response = requests.get(f"{API_BASE}/credits", headers=headers, timeout=10)
        if response.status_code == 200:
            result = response.json()
            credits = result.get('saldoAtual')
            print(f"   ✅ Credits retrieved - Balance: {credits}")
            if credits != 10:
                print(f"   ⚠️  Expected 10 initial credits, got {credits}")
        else:
            print(f"   ❌ Credits failed: {response.status_code} - {response.text}")
            return False
        
        # 5. Test settings
        print("5. Testing settings...")
        response = requests.get(f"{API_BASE}/settings", headers=headers, timeout=10)
        if response.status_code == 200:
            result = response.json()
            print(f"   ✅ Settings retrieved - Keys present: {list(result.keys())}")
        else:
            print(f"   ❌ Settings get failed: {response.status_code} - {response.text}")
            return False
        
        # Update settings
        settings_data = {
            "geminiApiKey": "test-key-12345",
            "n8nWebhookUrl": "https://test.example.com/webhook"
        }
        response = requests.put(f"{API_BASE}/settings", json=settings_data, headers=headers, timeout=10)
        if response.status_code == 200:
            print(f"   ✅ Settings updated successfully")
        else:
            print(f"   ❌ Settings update failed: {response.status_code} - {response.text}")
            return False
        
        # 6. Test gabaritos
        print("6. Testing gabaritos...")
        gabarito_data = {
            "titulo": "Test Math Quiz",
            "conteudo": "1. A) 2+2=4\n2. B) 3*3=9\n3. C) 5-2=3"
        }
        response = requests.post(f"{API_BASE}/gabaritos", json=gabarito_data, headers=headers, timeout=10)
        if response.status_code == 200:
            result = response.json()
            gabarito_id = result.get('gabarito', {}).get('id')
            print(f"   ✅ Gabarito created - ID: {gabarito_id}")
        else:
            print(f"   ❌ Gabarito creation failed: {response.status_code} - {response.text}")
            return False
        
        # List gabaritos
        response = requests.get(f"{API_BASE}/gabaritos", headers=headers, timeout=10)
        if response.status_code == 200:
            result = response.json()
            count = len(result.get('gabaritos', []))
            print(f"   ✅ Gabaritos listed - Count: {count}")
        else:
            print(f"   ❌ Gabaritos list failed: {response.status_code} - {response.text}")
            return False
        
        # 7. Test avaliacoes
        print("7. Testing avaliacoes...")
        response = requests.get(f"{API_BASE}/avaliacoes", headers=headers, timeout=10)
        if response.status_code == 200:
            result = response.json()
            count = len(result.get('avaliacoes', []))
            print(f"   ✅ Avaliacoes listed - Count: {count}")
        else:
            print(f"   ❌ Avaliacoes list failed: {response.status_code} - {response.text}")
            return False
        
        print("\n🎉 All core functionality tests passed!")
        return True
        
    except requests.exceptions.RequestException as e:
        print(f"❌ Network error: {e}")
        return False
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        return False

def test_error_cases():
    """Test error handling"""
    print("\n🔍 Testing Error Cases")
    print("=" * 50)
    
    try:
        # Test duplicate registration
        print("1. Testing duplicate registration...")
        register_data = {
            "email": "test_20251101_161010@example.com",  # Already exists
            "password": "test123",
            "name": "Test"
        }
        response = requests.post(f"{API_BASE}/auth/register", json=register_data, timeout=10)
        if response.status_code == 400:
            print("   ✅ Duplicate registration correctly rejected")
        else:
            print(f"   ⚠️  Expected 400, got {response.status_code}: {response.text}")
        
        # Test invalid login
        print("2. Testing invalid login...")
        login_data = {
            "email": "test_20251101_161010@example.com",
            "password": "wrongpassword"
        }
        response = requests.post(f"{API_BASE}/auth/login", json=login_data, timeout=10)
        if response.status_code == 401:
            print("   ✅ Invalid login correctly rejected")
        else:
            print(f"   ⚠️  Expected 401, got {response.status_code}: {response.text}")
        
        # Test unauthorized access
        print("3. Testing unauthorized access...")
        response = requests.get(f"{API_BASE}/auth/me", timeout=10)
        if response.status_code == 401:
            print("   ✅ Unauthorized access correctly rejected")
        else:
            print(f"   ⚠️  Expected 401, got {response.status_code}: {response.text}")
        
        print("\n✅ Error case testing completed")
        
    except Exception as e:
        print(f"❌ Error case testing failed: {e}")

if __name__ == "__main__":
    print(f"🚀 Corretor 80/20 Backend Verification")
    print(f"📍 Base URL: {BASE_URL}")
    print("=" * 60)
    
    success = test_core_functionality()
    test_error_cases()
    
    if success:
        print(f"\n🎯 RESULT: Backend core functionality is working correctly!")
        exit(0)
    else:
        print(f"\n⚠️  RESULT: Some core functionality issues detected!")
        exit(1)