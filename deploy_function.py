import os
import requests
import zipfile
import json

token = os.environ.get('SUPABASE_ACCESS_TOKEN')
project_ref = 'aikqnvltuwwgifuocvto'
zip_path = 'stripe-payment-deploy-final.zip'
func_dir = 'supabase/functions/stripe-payment'

# Create zip with files at root
# Supabase extracts zip and prepends 'source/' to entrypoint_path
# So if entrypoint_path='index.ts', it looks for source/index.ts
# Therefore files should be at root of zip
if os.path.exists(zip_path):
    os.remove(zip_path)

z = zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED)
# Write files at root of zip using write() to preserve structure
z.write(f'{func_dir}/index.ts', 'index.ts')
z.write(f'{func_dir}/deno.json', 'deno.json')
z.close()
print('Zip created successfully')

# Verify zip contents
z2 = zipfile.ZipFile(zip_path, 'r')
print('Zip contents:')
for f in z2.filelist:
    print(f'  {f.filename}')
z2.close()

# Deploy
url = f'https://api.supabase.com/v1/projects/{project_ref}/functions/deploy'
metadata = {
    'name': 'stripe-payment',
    'entrypoint_path': 'index.ts',  # Supabase will prepend 'source/' and look for source/index.ts
    'import_map_path': 'deno.json',  # Supabase will prepend 'source/' and look for source/deno.json
    'verify_jwt': False
}

with open(zip_path, 'rb') as f:
    files = {
        'file': (zip_path, f, 'application/zip')
    }
    
    data = {
        'metadata': json.dumps(metadata)
    }
    
    headers = {
        'Authorization': f'Bearer {token}'
    }
    
    print('Deploying...')
    r = requests.post(url, headers=headers, files=files, data=data)
    print(f'Status: {r.status_code}')
    print(f'Response: {r.text}')
    
    if r.status_code == 200:
        print('SUCCESS! Function deployed!')
        result = r.json()
        if 'version' in result:
            print(f'Deployed as version: {result.get("version")}')
    else:
        print('FAILED - Check response above')

