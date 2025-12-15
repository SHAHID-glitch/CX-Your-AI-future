// Test script to verify per-user image endpoints
// Run after server is running

const API_BASE = 'http://localhost:3000/api';

async function testImageEndpoints() {
    console.log('🧪 Testing Image Endpoints...\n');
    
    try {
        // First, we need to login to get a token
        console.log('1️⃣ Testing Login...');
        const loginRes = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                email: 'test@example.com', 
                password: 'password123' 
            })
        });
        
        const loginData = await loginRes.json();
        console.log('Login Status:', loginRes.status);
        console.log('Login Response:', loginData);
        
        if (!loginData.success || !loginData.token) {
            console.log('⚠️ Login failed - creating test user first...\n');
            
            // Try to register first
            const regRes = await fetch(`${API_BASE}/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: 'testuser',
                    email: 'test@example.com',
                    password: 'password123'
                })
            });
            
            const regData = await regRes.json();
            console.log('Register Status:', regRes.status);
            console.log('Register Response:', regData);
            
            if (!regData.success) {
                console.log('❌ Could not register user');
                return;
            }
            
            var token = regData.token;
            console.log('✅ User registered, got token');
        } else {
            var token = loginData.token;
            console.log('✅ Login successful, got token');
        }
        
        console.log('\n2️⃣ Testing GET /api/ai/my-images...');
        const imagesRes = await fetch(`${API_BASE}/ai/my-images`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });
        
        console.log('Status:', imagesRes.status);
        console.log('Status Text:', imagesRes.statusText);
        
        if (imagesRes.status === 404) {
            console.log('❌ ERROR 404 - Endpoint not found!');
            console.log('Check if routes/ai.js endpoints are mounted correctly');
        } else if (imagesRes.ok) {
            const imagesData = await imagesRes.json();
            console.log('✅ Success!');
            console.log('Response:', imagesData);
        } else {
            const errorData = await imagesRes.text();
            console.log('❌ Error:', errorData);
        }
        
        console.log('\n3️⃣ Testing DELETE /api/ai/images/test.png...');
        const deleteRes = await fetch(`${API_BASE}/ai/images/test.png`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });
        
        console.log('Status:', deleteRes.status);
        console.log('Status Text:', deleteRes.statusText);
        
        if (deleteRes.status === 404) {
            console.log('❌ ERROR 404 - Endpoint not found!');
        } else {
            const deleteData = await deleteRes.json();
            console.log('Response:', deleteData);
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error);
    }
}

// Run the test
testImageEndpoints();
