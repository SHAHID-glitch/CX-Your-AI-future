"""
Test script for Stable Diffusion API
Run this to verify your API is working correctly
"""
import requests
import base64
import json
from datetime import datetime

# API endpoint
API_URL = "http://127.0.0.1:7860"

def test_api_connection():
    """Test if API is accessible"""
    try:
        response = requests.get(f"{API_URL}/sdapi/v1/sd-models")
        if response.status_code == 200:
            print("✅ API Connection: SUCCESS")
            models = response.json()
            if models:
                print(f"✅ Available Models: {len(models)}")
                print(f"   Current Model: {models[0]['title']}")
            return True
        else:
            print(f"❌ API Connection Failed: Status {response.status_code}")
            return False
    except requests.exceptions.ConnectionError:
        print("❌ Cannot connect to API. Is WebUI running?")
        print("   Start it with: .\\webui-user.bat")
        return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def generate_image(prompt, output_filename="output.png"):
    """Generate an image using text-to-image API"""
    print(f"\n🎨 Generating image...")
    print(f"   Prompt: {prompt}")
    
    payload = {
        "prompt": prompt,
        "negative_prompt": "blurry, low quality, distorted",
        "steps": 20,
        "width": 512,
        "height": 512,
        "cfg_scale": 7,
        "sampler_name": "Euler a",
        "seed": -1
    }
    
    try:
        response = requests.post(f"{API_URL}/sdapi/v1/txt2img", json=payload)
        
        if response.status_code == 200:
            result = response.json()
            
            # Save the image
            image_base64 = result["images"][0]
            image_data = base64.b64decode(image_base64)
            
            with open(output_filename, "wb") as f:
                f.write(image_data)
            
            print(f"✅ Image saved: {output_filename}")
            
            # Show generation info
            info = json.loads(result.get("info", "{}"))
            if info:
                print(f"   Seed: {info.get('seed', 'N/A')}")
                print(f"   Steps: {info.get('steps', 'N/A')}")
            
            return True
        else:
            print(f"❌ Generation failed: Status {response.status_code}")
            print(f"   Response: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Error during generation: {e}")
        return False

def main():
    print("=" * 60)
    print("Stable Diffusion API Test")
    print("=" * 60)
    
    # Test connection
    if not test_api_connection():
        print("\n⚠️  Please start Stable Diffusion WebUI first:")
        print("   .\\webui-user.bat")
        return
    
    # Generate test image
    prompt = "a beautiful landscape with mountains and sunset, detailed, 4k"
    success = generate_image(prompt, f"test_output_{datetime.now().strftime('%Y%m%d_%H%M%S')}.png")
    
    if success:
        print("\n🎉 All tests passed!")
        print("✅ Your Stable Diffusion API is ready to use in your project")
        print("\n📚 Next steps:")
        print("   1. Check the generated image")
        print("   2. Modify the prompt and test again")
        print("   3. Integrate into your backend (see node_backend_example.js)")
    else:
        print("\n❌ Tests failed. Check the error messages above.")

if __name__ == "__main__":
    main()
