# Testing Guide: Login Flow

## 🔍 Problem: Auto-redirect to /farmer on refresh

If you're being automatically redirected to `/farmer` when you refresh the page, it's because you have a logged-in user stored in your browser's localStorage from previous testing.

## ✅ Solution: Clear localStorage

### Method 1: Browser DevTools (Recommended)
1. Open your app in the browser
2. Press `F12` to open DevTools
3. Go to **Application** tab (Chrome) or **Storage** tab (Firefox)
4. Click **Local Storage** in the left sidebar
5. Click your domain (`localhost:5173` or `harvestwise-three.vercel.app`)
6. Find the key `hw_auth_user`
7. Right-click → **Delete** or press Delete key
8. Refresh the page

### Method 2: Console Command
1. Open DevTools (`F12`)
2. Go to **Console** tab
3. Run this command:
```javascript
localStorage.removeItem('hw_auth_user');
location.reload();
```

### Method 3: Logout Button
1. If you can access the app, click your profile
2. Click "Log out"
3. This will clear the auth and redirect to login

---

## 🧪 Testing the Login Flow

### Test 1: Fresh User (Not Logged In)
1. Clear localStorage (use methods above)
2. Visit `http://localhost:5173` or your deployed URL
3. **Expected**: You see the login page at `/`
4. **Expected**: No automatic redirect

### Test 2: Login and Navigate
1. On login page, enter any email and password
2. Click "Sign in"
3. **Expected**: Redirects to `/farmer` (or `/admin`, `/dftc` based on email)
4. Navigate to `/farmer/prices`
5. **Expected**: You see the prices page

### Test 3: Refresh While Logged In
1. While on `/farmer/prices`
2. Press `F5` or refresh the page
3. **Expected**: You stay on `/farmer/prices` (no redirect to login)
4. **Expected**: No 404 error

### Test 4: Direct URL Access (Logged In)
1. While logged in, paste `/farmer/crops` in address bar
2. **Expected**: You see the crops page
3. **Expected**: No 404 error

### Test 5: Direct URL Access (Not Logged In)
1. Clear localStorage
2. Paste `/farmer/crops` in address bar
3. **Expected**: Redirects to `/login`
4. After login → Should go to `/farmer` (dashboard)

### Test 6: Logout
1. While logged in, click profile → Log out
2. **Expected**: Redirects to `/login`
3. **Expected**: localStorage is cleared
4. Try accessing `/farmer/prices`
5. **Expected**: Redirects to `/login`

---

## 🐛 Debugging Tips

### Check if you're logged in:
Open console and run:
```javascript
JSON.parse(localStorage.getItem('hw_auth_user'))
```
- If it returns `null` → You're not logged in ✅
- If it returns an object → You're logged in

### Force logout:
```javascript
localStorage.removeItem('hw_auth_user');
location.href = '/';
```

### Check current route:
```javascript
console.log(window.location.pathname);
```

---

## 📋 Expected Behavior Summary

| Scenario | Action | Expected Result |
|----------|--------|----------------|
| Not logged in | Visit `/` | See login page |
| Not logged in | Visit `/farmer` | Redirect to `/login` |
| Not logged in | Refresh on `/farmer/prices` | Redirect to `/login` |
| Logged in | Visit `/` or `/login` | See login page (can access other pages via nav) |
| Logged in | Visit `/farmer` | See farmer dashboard |
| Logged in | Refresh on `/farmer/prices` | Stay on `/farmer/prices` |
| Logged in | Logout | Redirect to `/login`, clear storage |

---

## 🚨 Common Issues

### Issue: Still redirecting to /farmer
**Cause**: Old user data in localStorage
**Fix**: Clear localStorage using methods above

### Issue: 404 on refresh
**Cause**: Missing route or incorrect path
**Fix**: Check that the route exists in `src/app/routes.jsx`

### Issue: Can't access any pages
**Cause**: Not logged in and all routes are protected
**Fix**: Go to `/login` and sign in

---

## 🎯 Quick Test Script

Run this in the browser console to test the full flow:

```javascript
// 1. Clear auth
localStorage.removeItem('hw_auth_user');
console.log('✅ Cleared auth');

// 2. Check we're logged out
const user = localStorage.getItem('hw_auth_user');
console.log('User:', user === null ? 'Not logged in ✅' : 'Still logged in ❌');

// 3. Reload to login page
setTimeout(() => {
  console.log('Reloading to login page...');
  location.href = '/';
}, 1000);
```

After login, test navigation:
```javascript
// Test route access
const routes = ['/farmer', '/farmer/prices', '/farmer/crops', '/farmer/market'];
routes.forEach(route => {
  console.log(`Testing ${route}...`);
  history.pushState({}, '', route);
  setTimeout(() => {
    console.log(`Current: ${window.location.pathname}`);
  }, 100);
});
```
