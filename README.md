# WVSU–Lambunao Student Clearance Tracking and Management System (Group 6)

Real system: static front-end (`public/`) + Netlify Function API (`netlify/functions/api.mjs`)
+ Netlify Blobs database. Data is shared across all devices that open the same link.

## Key features (all working)
1. Student Login  2. Requirements Checklist  3. Clearance Tracking  4. Online Document Submission
5. Office Dashboard  6. Notifications  7. Final Clearance Confirmation ("Clearance Completed")  + Clearance History

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

## Office staff activation (EmailJS)
Staff register WITHOUT any code. On their first login the system emails a one-time activation code to their real email
(EmailJS). They paste it once; after that they enter automatically on every login. The code is random, single-use,
expires in 15 minutes and is locked after 5 wrong tries.

Set up EmailJS (https://www.emailjs.com, free plan = 200 emails/month):
1. Add an Email Service (e.g. Gmail) -> copy the **Service ID**.
2. Create an Email Template. In the template settings set **To Email** = `{{to_email}}`.
   Subject: `Your {{app_name}} access code`. Body example:
   `Hello {{to_name}}, your office access code for {{office}} is: {{code}}. It expires in {{expires_in}}.`
   Copy the **Template ID**.
3. Account > General: copy the **Public Key**. Account > Security: turn ON **"Allow EmailJS API for non-browser applications"** and copy the **Private Key**.
4. In Netlify > Site configuration > Environment variables add:
   `EMAILJS_SERVICE_ID`, `EMAILJS_TEMPLATE_ID`, `EMAILJS_PUBLIC_KEY`, `EMAILJS_PRIVATE_KEY`, then redeploy.
Until EmailJS is configured, the admin can press **Activate** next to a staff member (Admin Console > Staff).

## Clean start
On the first request after this version is deployed, ALL existing registered users, submissions, files, messages and
history are deleted once. Only the administrator account is kept. (Admin Console > System also has a "Delete all data" button.)

## Online / offline status
Admin Console shows who is online (active in the last ~45 seconds) and refreshes automatically every 8 seconds.

## Administrator account (permanent)
Created automatically by the system, cannot be deleted or registered over.
- Login: `admin@wvsu.edu.ph` (or ID number `ADMIN`)
- Default password: `Admin@Group6`
CHANGE IT: Netlify > Environment variables > add `ADMIN_PASSWORD` (and optionally `ADMIN_EMAIL`), then redeploy.
The admin can monitor all students, staff, offices and activity, download files, reset passwords and delete accounts.

## Notes
- Uploaded files: max 4 MB (PDF, JPG, PNG, DOC, DOCX).
- Passwords are hashed (scrypt) on the server. Sessions last 30 days.
