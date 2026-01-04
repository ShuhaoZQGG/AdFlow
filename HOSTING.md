# Hosting AdFlow Inspector Website

This guide explains how to host the AdFlow Inspector landing page and privacy policy.

## Quick Start - GitHub Pages (Recommended)

GitHub Pages is free and perfect for hosting static sites.

### Step 1: Enable GitHub Pages

1. Go to your GitHub repository settings
2. Navigate to **Settings** → **Pages**
3. Under "Source", select **Deploy from a branch**
4. Choose branch: `main` (or `master`)
5. Choose folder: `/public` 
6. Click **Save**

Your site will be available at: `https://yourusername.github.io/AdFlow/`

### Step 2: Update Chrome Web Store Listing

Once your site is live:

1. Go to [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
2. Edit your extension listing
3. Add Privacy Policy URL: `https://yourusername.github.io/AdFlow/privacy-policy.html`
4. Add Homepage URL: `https://yourusername.github.io/AdFlow/`

### Step 3: Update Links in Your Files

Update the following placeholders in your HTML files:

**In `public/index.html`:**
- Replace email: `privacy@adflow-inspector.dev`
- Add your Chrome Web Store URL when published
- Add your GitHub repository URL

**In `public/privacy-policy.html`:**
- Replace email: `privacy@adflow-inspector.dev`
- Add your GitHub issues URL
- Replace `yourusername` with your actual GitHub username

## Alternative Hosting Options

### Option 1: Netlify (Free)

1. Sign up at [netlify.com](https://www.netlify.com/)
2. Connect your GitHub repository
3. Set build settings:
   - Base directory: `public`
   - Build command: (leave empty)
   - Publish directory: `/`
4. Deploy

Your site will be at: `https://your-site-name.netlify.app/`

### Option 2: Vercel (Free)

1. Sign up at [vercel.com](https://vercel.com/)
2. Import your GitHub repository
3. Set root directory: `public`
4. Deploy

Your site will be at: `https://your-project.vercel.app/`

### Option 3: Cloudflare Pages (Free)

1. Sign up at [pages.cloudflare.com](https://pages.cloudflare.com/)
2. Connect your repository
3. Set build settings:
   - Build output directory: `public`
4. Deploy

### Option 4: Custom Domain

If you have your own domain:

1. Use any of the above services
2. Add your custom domain in their settings
3. Update DNS records (CNAME or A record)
4. Enable HTTPS (usually automatic)

Example: `https://adflow-inspector.dev/`

## Adding Screenshots

To make your landing page more compelling:

1. Take screenshots of the extension in action:
   - Request list view
   - Timeline visualization
   - Payload decoder
   - AI insights panel
   - Issue detection

2. Save screenshots to `public/screenshots/`

3. Update `public/index.html`:
   ```html
   <!-- Replace the placeholder div -->
   <div class="screenshot-container">
       <img src="screenshots/main-interface.png" alt="AdFlow Inspector Interface">
   </div>
   ```

4. Create an Open Graph image (`1200x630px`):
   - Save as `public/og-image.png`
   - Update meta tag in `index.html`:
     ```html
     <meta property="og:image" content="https://yourdomain.com/og-image.png">
     ```

## File Structure

Your `public/` directory should contain:

```
public/
├── index.html              # Landing page
├── privacy-policy.html     # Privacy policy
├── injected.js            # Extension file (already exists)
├── icons/                 # Extension icons (already exists)
├── screenshots/           # (Create this)
│   ├── main-interface.png
│   ├── timeline.png
│   └── ai-insights.png
└── og-image.png          # (Create this - for social sharing)
```

## Testing Locally

Before deploying, test your pages locally:

```bash
# Option 1: Python
cd public
python -m http.server 8000

# Option 2: Node.js
npx serve public

# Option 3: PHP
php -S localhost:8000 -t public
```

Then visit: `http://localhost:8000/`

## SEO Checklist

- [ ] Add sitemap.xml (optional but recommended)
- [ ] Add robots.txt (optional)
- [ ] Verify all meta tags are filled
- [ ] Add Google Analytics (if desired)
- [ ] Test on mobile devices
- [ ] Check page load speed
- [ ] Validate HTML: https://validator.w3.org/

## Custom Domain Setup (Optional)

If using a custom domain like `adflow-inspector.dev`:

### DNS Settings

**For Netlify/Vercel/Cloudflare Pages:**
1. Add CNAME record: `www` → `your-site.netlify.app`
2. Add A record for apex domain (they'll provide IP)

**For GitHub Pages:**
1. Add CNAME file to `public/` with your domain
2. Update DNS:
   ```
   A records:
   185.199.108.153
   185.199.109.153
   185.199.110.153
   185.199.111.153
   ```

## Updating Content

To update your site:

1. Edit files in `public/` directory
2. Commit changes: `git add public/ && git commit -m "Update website"`
3. Push: `git push`
4. Changes will deploy automatically (usually within 1-2 minutes)

## Analytics (Optional)

Add Google Analytics to track visitors:

1. Create GA4 property at [analytics.google.com](https://analytics.google.com/)
2. Add tracking code before `</head>` in both HTML files:

```html
<!-- Google Analytics -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-XXXXXXXXXX');
</script>
```

## Next Steps

1. ✅ Enable GitHub Pages
2. ✅ Update privacy policy URL in Chrome Web Store
3. ⬜ Add screenshots to landing page
4. ⬜ Create social sharing image (og-image.png)
5. ⬜ Test on mobile devices
6. ⬜ Share the landing page URL in extension description

## Support

If you encounter issues:
- Check GitHub Pages status: https://www.githubstatus.com/
- Review build logs in your repository's Actions tab
- Ensure `public/` directory is committed to git
- Verify file names match exactly (case-sensitive)

## License

This website template is part of AdFlow Inspector and can be customized for your needs.

