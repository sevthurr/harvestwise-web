# Vercel Deployment Guide

## ✅ Current Configuration

Your HarvestWise app is configured for Vercel deployment.

### What Vercel Auto-Detects:
- ✅ **Framework**: Vite (automatically detected)
- ✅ **Build Command**: `npm run build` (from package.json)
- ✅ **Output Directory**: `dist` (Vite default)
- ✅ **Install Command**: `npm install`
- ✅ **Node Version**: 20.18.0 (from `.node-version` file)

### Files Vercel Uses:
1. **`.node-version`** - Specifies Node.js 20.18.0
2. **`package.json`** - Build scripts and dependencies
3. **`vite.config.js`** - Build configuration

### Files Removed (Not Needed for Vercel):
- ❌ `render.yaml` - Render-specific config (removed)
- ❌ `pnpm-workspace.yaml` - We use npm (removed)

---

## 🚀 Deployment Settings

### In Vercel Dashboard:
```
Framework Preset: Vite
Build Command: npm run build
Output Directory: dist
Install Command: npm install
Node.js Version: 20.x (auto-detected from .node-version)
```

### Environment Variables (if needed):
Add any environment variables in Vercel dashboard under:
`Settings > Environment Variables`

Example:
```
VITE_API_URL=https://api.harvestwise.com
VITE_APP_ENV=production
```

---

## 📦 Build Output

Vercel will:
1. Clone your GitHub repository
2. Install dependencies (`npm install`)
3. Run build command (`npm run build`)
4. Deploy `dist/` folder contents
5. Configure PWA service workers automatically

### Expected Build:
- **Build Time**: ~30-35 seconds
- **Output Size**: ~1.5-2MB (optimized)
- **PWA**: ✅ Service worker, manifest, icons included

---

## 🌐 Routing Configuration

### SPA Routing:
Vercel automatically handles SPA routing for Vite apps. All routes will fallback to `index.html`.

Your routes will work:
- ✅ `/` → Login page
- ✅ `/farmer` → Farmer dashboard
- ✅ `/farmer/prices` → Prices page
- ✅ `/admin` → Admin dashboard
- ✅ `/dftc` → DFTC dashboard

### If You Need Custom Rewrites:
Create `vercel.json` in root:
```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```
*(Not required - Vercel handles this automatically for Vite)*

---

## 🔧 Build Troubleshooting

### If Build Fails:

1. **Check Node Version**
   - Vercel uses `.node-version` (20.18.0)
   - Matches your local dev environment ✅

2. **Check Dependencies**
   - Run `npm install` locally
   - Verify `npm run build` works
   - Check for missing dependencies

3. **Check Build Logs**
   - Go to Vercel dashboard
   - Click on deployment
   - View "Build Logs" tab

4. **Clear Build Cache**
   - Go to deployment
   - Click "..." menu
   - Select "Redeploy" → "Clear cache and redeploy"

---

## 🎯 Performance Optimizations

Vercel automatically provides:
- ✅ **CDN**: Global edge network
- ✅ **Caching**: Static assets cached at edge
- ✅ **Compression**: Gzip/Brotli compression
- ✅ **HTTP/2**: Enabled by default
- ✅ **SSL**: Automatic HTTPS

### Build Optimizations Already Applied:
- ✅ Code splitting (Vite default)
- ✅ Tree shaking (Vite default)
- ✅ Minification (Vite default)
- ✅ Asset optimization (Vite default)

---

## 📱 PWA on Vercel

Your PWA will work on Vercel:
- ✅ Service worker deployed to `/sw.js`
- ✅ Manifest deployed to `/manifest.webmanifest`
- ✅ Icons served from `/public/` folder
- ✅ Offline support enabled

### To Test PWA:
1. Deploy to Vercel
2. Visit production URL (HTTPS required for PWA)
3. Open DevTools → Application → Service Workers
4. Check "Offline" and refresh - should still work!

---

## 🔄 Continuous Deployment

Vercel automatically deploys when you:
1. Push to `master` branch (production)
2. Push to any branch (preview deployment)
3. Create pull request (preview deployment)

### Deployment URLs:
- **Production**: `https://harvestwise.vercel.app`
- **Preview**: `https://harvestwise-{branch}-{user}.vercel.app`

---

## ✅ Deployment Checklist

Before pushing:
- [ ] Test build locally: `npm run build`
- [ ] Test preview locally: `npm run preview`
- [ ] Verify no console errors
- [ ] Check PWA install works
- [ ] Test all main routes
- [ ] Commit and push to GitHub
- [ ] Check Vercel deployment status
- [ ] Test production URL
- [ ] Verify PWA works in production

---

## 🆘 Support

### Vercel Docs:
- [Vite on Vercel](https://vercel.com/docs/frameworks/vite)
- [Build Configuration](https://vercel.com/docs/build-step)
- [Environment Variables](https://vercel.com/docs/environment-variables)

### Common Issues:
- **404 on routes**: Vercel handles automatically for Vite
- **Build fails**: Check Node version matches `.node-version`
- **Slow builds**: Clear cache and redeploy
- **PWA not installing**: Verify HTTPS and manifest.webmanifest

---

## 🎉 You're All Set!

Your app is configured and ready for Vercel deployment. Just push to GitHub and Vercel will handle the rest!
