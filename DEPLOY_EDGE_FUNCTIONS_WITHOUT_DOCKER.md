# Deploy Edge Functions Without Docker

## Overview

This document describes how to deploy Supabase Edge Functions without Docker Desktop using the Supabase MCP (Model Context Protocol) API.

## Prerequisites

- Supabase CLI installed (for project linking)
- Supabase MCP access configured
- Project ID available
- Edge function code ready in `supabase/functions/[function-name]/index.ts`

## Method: Using Supabase MCP API

### Step 1: Read the Function File

Read the complete function file content:

```powershell
cd "C:\Users\rayma\Desktop\New folder\peer-care-connect"
$functionContent = Get-Content "supabase\functions\send-email\index.ts" -Raw -Encoding UTF8
```

### Step 2: Deploy via Supabase MCP

Use the `mcp_supabase_deploy_edge_function` tool with the following parameters:

**Parameters:**
- `project_id`: Your Supabase project ID (e.g., `aikqnvltuwwgifuocvto`)
- `name`: Function name (e.g., `send-email`)
- `entrypoint_path`: Entry point file (usually `index.ts`)
- `files`: Array containing file objects with:
  - `name`: File name (e.g., `index.ts`)
  - `content`: Complete file content as string

**Example Deployment:**

```typescript
mcp_supabase_deploy_edge_function({
  project_id: "aikqnvltuwwgifuocvto",
  name: "send-email",
  entrypoint_path: "index.ts",
  files: [{
    name: "index.ts",
    content: "<complete file content>"
  }]
})
```

### Step 3: Verify Deployment

After deployment, verify the function was deployed correctly:

```typescript
mcp_supabase_get_edge_function({
  project_id: "aikqnvltuwwgifuocvto",
  function_slug: "send-email"
})
```

Check the response for:
- `status`: Should be `"ACTIVE"`
- `version`: Should increment with each deployment
- `updated_at`: Should reflect recent deployment time

## Important Notes

### File Size Limitations

- **Large Files**: If the function file is very large (>75KB), the MCP tool may have token limits
- **Workaround**: For very large files, you may need to deploy via Supabase Dashboard manually or split the function into smaller modules

### What Gets Deployed

- The MCP tool deploys the exact content you provide in the `files` array
- Make sure to include the complete file content, not just a snippet
- All imports and dependencies should be included

### Deployment Status

- Deployment is **synchronous** - you'll get immediate feedback
- The function becomes active immediately after successful deployment
- Previous versions remain available but the latest version is active

## Alternative Methods

### Method 1: Supabase Dashboard (Manual)

1. Go to: `https://supabase.com/dashboard/project/[project-id]/functions/[function-name]`
2. Click "Edit" or open the function editor
3. Copy entire content from local file
4. Paste into editor
5. Click "Deploy"

**Pros:**
- No Docker required
- Works for files of any size
- Visual confirmation

**Cons:**
- Manual process
- Requires browser access

### Method 2: Supabase CLI with Docker

```powershell
cd "C:\Users\rayma\Desktop\New folder\peer-care-connect"
supabase functions deploy send-email --project-ref aikqnvltuwwgifuocvto
```

**Pros:**
- Automated
- Handles large files well
- Standard deployment method

**Cons:**
- Requires Docker Desktop installed and running

## Troubleshooting

### Issue: Token Limit Exceeded

**Symptom:** Error message about exceeding maximum tokens

**Solution:**
- Use Supabase Dashboard method instead
- Or split large functions into smaller modules

### Issue: Partial Deployment

**Symptom:** Only part of the function gets deployed

**Solution:**
- Ensure you're passing the complete file content
- Check file encoding (should be UTF-8)
- Verify file size isn't causing truncation

### Issue: Function Not Active

**Symptom:** Deployment succeeds but function shows as inactive

**Solution:**
- Check function logs in Supabase Dashboard
- Verify environment variables are set
- Check for syntax errors in the deployed code

## Example: Complete Deployment Script

```powershell
# Deploy Edge Function Without Docker
# Using Supabase MCP API

$projectId = "aikqnvltuwwgifuocvto"
$functionName = "send-email"
$functionPath = "supabase\functions\send-email\index.ts"

# Read function file
Write-Host "Reading function file..." -ForegroundColor Yellow
$functionContent = Get-Content $functionPath -Raw -Encoding UTF8

Write-Host "File size: $($functionContent.Length) characters" -ForegroundColor Green

# Deploy via MCP (this would be done via the MCP tool, not PowerShell)
# mcp_supabase_deploy_edge_function({
#   project_id: $projectId,
#   name: $functionName,
#   entrypoint_path: "index.ts",
#   files: [{
#     name: "index.ts",
#     content: $functionContent
#   }]
# })

Write-Host "Deployment complete!" -ForegroundColor Green
```

## Verification Checklist

After deployment, verify:

- [ ] Function status is `ACTIVE`
- [ ] Version number incremented
- [ ] `updated_at` timestamp is recent
- [ ] Function code matches local file
- [ ] Critical changes (like fee percentages) are present
- [ ] No syntax errors in deployed code

## Date Created

Created: January 2025
Last Updated: January 2025

## Related Files

- Edge Function: `supabase/functions/send-email/index.ts`
- Project Config: `supabase/config.toml`
- Deployment Script: `deploy-send-email-function.ps1`

