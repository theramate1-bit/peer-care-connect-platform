# Fix User imports from lucide-react
$files = Get-ChildItem -Path src -Recurse -Filter "*.tsx" -File

foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw
    
    # Check if file imports User from lucide-react without alias
    if ($content -match 'lucide-react' -and $content -match '\bUser\b' -and $content -notmatch 'User as UserIcon') {
        # Fix the import
        $newContent = $content -replace '(import\s*\{[^}]*)\bUser\b([,\s}][^}]*from\s+[''"]lucide-react)', '$1User as UserIcon$2'
        
        # Fix JSX usage
        $newContent = $newContent -replace '<User\s', '<UserIcon '
        $newContent = $newContent -replace '<User>', '<UserIcon>'
        $newContent = $newContent -replace '</User>', '</UserIcon>'
        
        if ($content -ne $newContent) {
            $newContent | Set-Content $file.FullName -NoNewline
            Write-Host "Fixed: $($file.Name)"
        }
    }
}

Write-Host "`nDone! All files processed."

