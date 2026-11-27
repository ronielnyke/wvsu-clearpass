# WVSU–Lambunao Student Clearance Tracking and Management System (Group 6)

Real system: static front-end (`public/`) + Netlify Function API (`netlify/functions/api.mjs`)
+ Netlify Blobs database. Data is shared across all devices that open the same link.

## Deploy to wvsu-clearpass.netlify.app
Functions and the database do NOT work with drag-and-drop of a plain folder. Use ONE of these:

### Option A – GitHub (recommended)
1. Unzip, upload this whole folder to a new GitHub repository.
2. Netlify > your site `wvsu-clearpass` > Site configuration > Build & deploy > Link repository.
3. Deploy. Netlify installs `@netlify/blobs` automatically.

### Option B – Netlify CLI
```
npm install
npm install -g netlify-cli
netlify login
netlify link        # choose wvsu-clearpass
netlify deploy --prod
```

## Office staff access code
Managed only by the administrator: log in as admin > Admin Console > "Access Code" tab. The code is generated automatically the first time; the admin can copy it, generate a new one, or set a custom one. Staff need it to register as office staff.

## Administrator account (permanent)
Created automatically by the system, cannot be deleted or registered over.
- Login: `admin@wvsu.edu.ph` (or ID number `ADMIN`)
- Default password: `Admin@Group6`
CHANGE IT: Netlify > Environment variables > add `ADMIN_PASSWORD` (and optionally `ADMIN_EMAIL`), then redeploy.
The admin can monitor all students, staff, offices and activity, download files, reset passwords and delete accounts.

## Notes
- Uploaded files: max 4 MB (PDF, JPG, PNG, DOC, DOCX).
- Passwords are hashed (scrypt) on the server. Sessions last 30 days.
