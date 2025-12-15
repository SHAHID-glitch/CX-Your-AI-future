# Per-User Image Storage - Testing Guide

## Quick Start Testing

### Test 1: Verify Images Are Per-User

**Steps:**
1. Open terminal and start the server: `node server.js`
2. Open browser and navigate to http://localhost:3000
3. Sign in as **User A** (create account or use existing)
4. Generate 2-3 images (e.g., "Create a sunset image", "Create a forest")
5. Navigate to **Library** section - should see 2-3 images
6. Sign out

**Expected Result:**
- Library shows User A's generated images
- Console shows: "✅ Loaded X images from backend"

---

### Test 2: Verify Other Users Don't See Your Images

**Steps:**
1. Sign in as **User B** (different account)
2. Navigate to **Library** section
3. Verify NO images from User A are visible
4. Generate 1 image as User B
5. Navigate back to Library - should see only 1 image
6. Sign out

**Expected Result:**
- Library shows 0 images initially
- After generation, shows only 1 image (User B's)
- User A's images are completely hidden
- Console shows: "✅ Loaded 1 images from backend"

---

### Test 3: Verify User Can See Their Own Images After Logout/Login

**Steps:**
1. Sign in as **User A**
2. Navigate to Library - should see User A's previously generated images
3. Sign out
4. Sign in as **User A** again
5. Navigate to Library

**Expected Result:**
- All of User A's images still appear
- Images persist across sessions
- Console shows correct image count loaded

---

### Test 4: Verify Image Deletion Works

**Steps:**
1. Sign in as **User A**
2. Navigate to Library - note number of images
3. Click delete button on one image
4. Confirm deletion
5. Verify image is removed from display

**Expected Result:**
- Image disappears from UI
- Image count decreases by 1
- File is deleted from `/uploads/images/user-{userId}/`
- Console shows: "✅ Image deleted: {filename}"

---

### Test 5: Verify Non-Authenticated Users Fall Back to LocalStorage

**Steps:**
1. Open browser in private/incognito mode (no login)
2. Generate an image (if allowed for non-auth users)
3. Navigate to Library
4. Refresh page

**Expected Result:**
- Library uses localStorage as fallback
- Console shows: "ℹ️  No authenticated user - using localStorage fallback"
- Images persist in current session

---

## Debug Commands

### View Image Directory Structure
```bash
# Linux/Mac
tree uploads/images/

# Windows PowerShell
Get-ChildItem -Path "uploads\images\" -Recurse | Format-Table FullName
```

### Check Images for Specific User
```bash
# Linux/Mac
ls -la uploads/images/user-{userId}/

# Windows PowerShell
Get-ChildItem "uploads/images/user-{userId}/"
```

### Monitor Backend Logs
Watch console output for:
- `📸 Fetching images for user {userId}` - library load
- `✅ Loaded X images from backend` - successful load
- `🎨 Generating image for user {userId}` - image generation
- `✅ Image generated for user {userId}` - generation complete
- `🗑️  Image deleted for user {userId}` - deletion

---

## Browser Console Commands

### Check Loaded Images Array
```javascript
// Shows all loaded images in memory
console.log('Generated Images:', generatedImages);

// Shows count
console.log('Image Count:', generatedImages.length);

// List all image URLs
generatedImages.forEach((img, i) => {
    console.log(`${i+1}. ${img.url}`);
});
```

### Manually Reload Library from Backend
```javascript
await loadLibraryFromStorage();
displayLibrary();
```

### Check Current User
```javascript
console.log('Current User:', currentUser);
console.log('User ID:', currentUser?.id);
```

---

## Expected Console Output

### On Library Load (Authenticated User):
```
📸 Loading user images from backend for user: 507f1f77bcf86cd799439011
📸 Fetching images for user 507f1f77bcf86cd799439011
📂 Image directory: /path/to/uploads/images/user-507f1f77bcf86cd799439011
📸 Found 3 images for user 507f1f77bcf86cd799439011
✅ Loaded 3 images from backend
```

### On Image Generation:
```
🎨 Generating image for user 507f1f77bcf86cd799439011 with prompt: sunset image
✅ Image generated successfully: {result}
✅ Image generated and saved on backend for user: 507f1f77bcf86cd799439011
```

### On Image Deletion:
```
🗑️  Image deleted for user 507f1f77bcf86cd799439011: 1702000000000-generated.png
✅ Image deleted: {filename}
Image deleted from library
```

---

## Troubleshooting

### Problem: Library shows "No Images Yet" but user generated images before

**Solution:**
1. Check console for errors
2. Verify user is authenticated (check currentUser in console)
3. Check `/uploads/images/user-{userId}/` directory exists and has files
4. Try manually reloading: `await loadLibraryFromStorage(); displayLibrary();`

### Problem: Images from other users are visible

**Solution:**
1. Check that loadLibraryFromStorage() is fetching from `/api/ai/my-images`
2. Verify currentUser.id is correct
3. Check server logs for authentication issues
4. Clear browser cache and localStorage

### Problem: Delete button not working

**Solution:**
1. Check network tab in Developer Tools
2. Verify DELETE request returns 200 status
3. Check console for error messages
4. Verify authentication token is present

### Problem: File not found when viewing generated image

**Solution:**
1. Verify image file exists in `/uploads/images/user-{userId}/`
2. Check file permissions on server
3. Verify image URL in response matches actual file location
4. Check server logs for path issues

---

## Security Testing

### Test: Prevent User from Accessing Other User's Images

**Attempt:**
```javascript
// Try to access another user's image directly
fetch('http://localhost:3000/api/ai/images/user-OTHER_USER_ID/image.png')
```

**Expected Result:**
- Status: 403 Forbidden
- Response: `{"error": "Access denied - you can only access your own images"}`

### Test: Prevent Directory Traversal

**Attempt:**
```javascript
// Try to delete a file outside user directory
fetch('http://localhost:3000/api/ai/images/../../config/database.js', {
    method: 'DELETE'
})
```

**Expected Result:**
- Status: 403 Forbidden
- Response: `{"error": "Access denied"}`

---

## Performance Metrics to Monitor

- Image load time for library view
- API response time for `/api/ai/my-images`
- Number of files in each user directory
- Total storage used across all users

---

## Success Criteria

- ✅ Each user sees only their own images
- ✅ Images persist across sessions
- ✅ Other users cannot access or see other users' images
- ✅ Image deletion removes files from backend
- ✅ Non-auth users can still use localStorage fallback
- ✅ No cross-user image visibility
- ✅ Proper error handling for API failures
