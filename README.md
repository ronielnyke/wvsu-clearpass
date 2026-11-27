
🎓 WVSU CLEARPASS
Student Clearance Tracking & Management System
A centralized digital platform for student clearance submissions, office reviews, and approval tracking.


� � � �

📌 About the Project
WVSU ClearPass is a web-based student clearance prototype for West Visayas State University – Lambunao Campus. It brings student clearance requirements, document submissions, office review decisions, and clearance progress together in one user interface.
The project is designed to make the clearance process easier to follow by allowing students to monitor submitted requirements and office staff to review submissions assigned to their office.
[!IMPORTANT] This is a front-end prototype. Application records are stored in the browser using localStorage and sessionStorage. It does not currently have a shared backend database, production authentication, or cross-device synchronization.
✨ Features

🎒 Student Portal
Student registration and login
Student profile details
Clearance progress dashboard
View requirements and assigned offices
Submit and resubmit documents
Track review status
Read rejection remarks
Clearance history and notifications

🏢 Office Portal
Office staff registration and login
Office-specific review dashboard
View student submissions
Review submitted documents
Approve requirements
Reject submissions with remarks
Track submission decisions
Notifications for submission activity

🌐 Landing Page
Project introduction and campus branding
Overview of features and clearance workflow
Navigation to login and registration
Responsive layout and animated UI elements
🏛️ Participating Offices
#
Office
Clearance Role
01
Library
Library materials and borrowed books
02
Registrar's Office
Student registration and academic documents
03
Accounting Office
Payment and account verification
04
Guidance Office
Guidance-related clearance requirements
05
Dean's Office
Department clearance
06
Property Custodian
Return of school or laboratory property
📄 Requirements
The prototype includes these sample requirements:
Office
Requirement
Purpose
Library
Library Clearance Slip
Confirms return of borrowed books and materials
Registrar
Enrollment / Registration Form
Copy of the latest signed registration form
Registrar
Grade Slip
Grade slip for the current semester
Accounting
Official Receipt of Payment
Proof of payment
Accounting
Statement of Account
Statement showing zero balance
Guidance
Exit Interview Form
Accomplished exit interview form
Dean
Department Clearance Form
Signed department clearance
Property Custodian
Property Return Slip
Proof of returned school or laboratory property
🔄 How It Works
flowchart TD
    A[Student registers or logs in] --> B[Views clearance requirements]
    B --> C[Uploads required document]
    C --> D[Submission marked Pending Review]
    D --> E[Assigned office reviews document]
    E --> F{Review decision}
    F -->|Approved| G[Requirement marked Approved]
    F -->|Rejected| H[Remarks shown to student]
    H --> I[Student submits a revised file]
    I --> D
    G --> J{All requirements approved?}
    J -->|No| B
    J -->|Yes| K[Clearance Completed]
👥 Demo Accounts
Use these accounts to explore the prototype.
🎓 Student account
Email
Password
student@wvsu.edu.ph
Student@123

🏢 Office staff accounts
Office
Email
Password
Library
library@wvsu.edu.ph
Office@123
Registrar
registrar@wvsu.edu.ph
Office@123
Accounting
accounting@wvsu.edu.ph
Office@123
Guidance
guidance@wvsu.edu.ph
Office@123
Dean
dean@wvsu.edu.ph
Office@123
Property Custodian
property@wvsu.edu.ph
Office@123

[!WARNING] These credentials are intended for demonstration only. Do not use them for real student records or sensitive information.
🧰 Built With

Technology
Purpose
HTML5
Page structure
CSS3
Styling, layout, responsiveness, and animation
Vanilla JavaScript
UI behavior, validation, and clearance workflow
localStorage
Persistent browser-side demo data
sessionStorage
Temporary browser session data
File API / FileReader
Handling selected files in the browser

No framework or package installation is required for the current static prototype.
📁 Project Structure
wvsu-clearpass/
│
├── index.html              # Landing page
├── login.html              # Login page
├── register.html           # Registration page
├── dashboard.html          # Student dashboard
├── requirements.html       # Requirements and document submissions
├── tracking.html           # Clearance tracking
├── history.html            # Clearance history
├── office.html             # Office review dashboard
│
├── assets/
│   └── logo.jpg            # Project logo
│
├── css/
│   └── style.css           # Shared styles and responsive design
│
└── js/
    ├── app.js              # Shared helpers, storage, demo data, workflow
    ├── login.js            # Login functionality
    ├── register.js          # Registration functionality
    ├── dashboard.js         # Student dashboard
    ├── requirements.js      # Requirements and document submission
    ├── tracking.js          # Clearance status tracking
    ├── history.js           # Clearance history
    └── office.js             # Office review and approval
🚀 Run Locally
Download or clone the repository.
Open the project folder.
Open index.html in your browser, or use Live Server in Visual Studio Code.
Log in with a demo account or create a test account.
Recommended: Use a local development server for a smoother experience than opening files directly.
☁️ Deploy on Netlify
This project is a static site and can be hosted on Netlify.
Import the GitHub repository into Netlify or upload the project folder.
Set the publish directory to the folder containing index.html.
Leave the build command empty (no build step is required for this prototype).
Deploy the site.
Open your Netlify deployment URL.
💾 Storage & Upload Notes
Browser storage keys use the wvsu_ prefix.
Account details, submissions, history, and notifications are stored locally in the browser.
The Remember me option uses localStorage; otherwise, the session uses sessionStorage.
The upload limit is 5 MB.
Accepted file formats: PDF, JPG, JPEG, PNG, DOC, DOCX.
Files up to approximately 800 KB can be stored as browser-readable data URLs where supported by the application.
Larger accepted files retain file metadata, but the file's preview/download data is not stored.
Browser data is not automatically shared between devices, browsers, or profiles.
Clearing browser storage may remove saved prototype data.
⚠️ Current Limitations
This project is currently a front-end prototype and does not provide:
A cloud or server database
Cross-device shared records
Production-grade authentication or authorization
Secure server-side document storage
Server-side validation
Real-time updates between users or office devices
Production-ready handling of confidential student information
Future Development
Backend API and database integration
Secure authentication and office-role permissions
Cloud document storage
Shared student and office dashboards
Audit logs for approval decisions
Real-time status updates
Production security and privacy review
🎓 Academic Information

GROUP 6
CIT 206 – Platform Technology
West Visayas State University – Lambunao Campus


WVSU ClearPass
Making student clearance progress easier to manage and track.
