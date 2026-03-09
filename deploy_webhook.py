import os
import requests
import zipfile
import json

token = os.environ.get('SUPABASE_ACCESS_TOKEN')
project_ref = 'aikqnvltuwwgifuocvto'
function_slug = 'stripe-webhook'
func_dir = 'supabase/functions/stripe-webhook'
zip_path = 'stripe-webhook-deploy.zip'

# Ensure SUPABASE_ACCESS_TOKEN is set
if not token:
    print("Error: SUPABASE_ACCESS_TOKEN environment variable is not set.")
    exit(1)

# 1. Create the zip file with files at root (Supabase will prepend 'source/' automatically)
try:
    if os.path.exists(zip_path):
        os.remove(zip_path)
    
    with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as z:
        z.write(os.path.join(func_dir, 'index.ts'), 'source/index.ts')
    print("Zip created successfully")
    
    # Verify zip contents
    with zipfile.ZipFile(zip_path, 'r') as z:
        print("Zip contents:")
        for name in z.namelist():
            print(f"  {name}")

except Exception as e:
    print(f"Error creating zip file: {e}")
    exit(1)

# 2. Define the deployment endpoint and headers
url = f'https://api.supabase.com/v1/projects/{project_ref}/functions/deploy'
headers = {
    'Authorization': f'Bearer {token}'
}

# 3. Define the metadata payload
metadata_payload = {
    'name': function_slug,
    'entrypoint_path': 'index.ts',  # Supabase will prepend 'source/' and look for source/index.ts
    'verify_jwt': False
}

# Convert metadata to a JSON string
metadata_json_string = json.dumps(metadata_payload)

# 4. Prepare the multipart/form-data
files = {
    'file': (zip_path, open(zip_path, 'rb'), 'application/zip'),
    'metadata': (None, metadata_json_string, 'application/json') # Send metadata as a JSON string
}

print("Deploying...")
# 5. Send the request
try:
    response = requests.post(url, headers=headers, files=files)
    response.raise_for_status()  # Raise an exception for HTTP errors (4xx or 5xx)
    print(f"Status: {response.status_code}")
    print(f"Response: {response.json()}")
    print("Deployment successful!")
except requests.exceptions.RequestException as e:
    print(f"Deployment failed: {e}")
    if e.response is not None:
        print(f"Status: {e.response.status_code}")
        print(f"Response: {e.response.text}")
    print("FAILED - Check response above")
finally:
    # Clean up the created zip file
    if os.path.exists(zip_path):
        os.remove(zip_path)

