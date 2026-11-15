# SkillNet — Academic Knowledge-Sharing Platform

## Project overview

SkillNet is a full-stack academic Q&A and knowledge-sharing web application. It helps students ask subject-related questions, share answers, participate in threaded discussions, and discover content through academic categories. The project also includes user profiles, notifications, and administration/moderation features.

## Main features

- User registration and login
- Password hashing with `bcryptjs`
- Email OTP verification during login
- JWT-based authentication and session handling
- User profiles with skills, interests, expertise, and biography
- Ask questions using a structured form, including code and expected/actual behaviour fields
- Post answers, vote, bookmark questions, and accept an answer
- Category-based question browsing and filtering
- Nested comments/replies on answers
- In-app notifications
- Admin tools for managing users, questions, and categories

> The feature list describes functionality represented in the supplied project files. Some features may require configuration (especially MongoDB and SMTP email) before they work locally.

## Technology stack

| Area | Technology |
|---|---|
| Frontend | HTML5, CSS3, Vanilla JavaScript |
| Backend | Node.js, Express.js |
| Database | MongoDB, Mongoose |
| Authentication | JSON Web Token, bcryptjs, express-session |
| Email | Nodemailer (SMTP) |

## Requirements

Install the following before running the project:

- Node.js (preferably a current LTS release)
- npm (included with Node.js)
- MongoDB running locally, or a MongoDB connection URI
- An SMTP account for sending login OTP emails

## Setup and installation

1. Extract the ZIP file.
2. Open a terminal in the extracted `skillnet_clean` project folder.
3. Install dependencies:

   ```bash
   npm install
   ```

4. Create your local environment file by copying `.env.example` to `.env`.

   On Windows Command Prompt:

   ```bat
   copy .env.example .env
   ```

   On macOS/Linux:

   ```bash
   cp .env.example .env
   ```

5. Edit `.env` and enter your own configuration:

   ```env
   MONGO_URI=mongodb://127.0.0.1:27017/skillnet
   SESSION_SECRET=replace_this_with_a_long_random_secret
   PORT=3000

   MAIL_HOST=smtp.gmail.com
   MAIL_PORT=587
   MAIL_SECURE=false
   MAIL_USER=your_email@gmail.com
   MAIL_PASS=your_email_app_password
   ```

   For Gmail, use an App Password (with 2-Step Verification enabled), not your normal account password. Keep `.env` private and never commit or share it.

6. Make sure MongoDB is running.
7. Start the application:

   ```bash
   npm start
   ```

   For development with automatic restart:

   ```bash
   npm run dev
   ```

8. Open the application in your browser:

   `http://localhost:3000`

## Environment variables

| Variable | Purpose |
|---|---|
| `MONGO_URI` | MongoDB connection string |
| `SESSION_SECRET` | Secret used for signing/verifying authentication tokens and session configuration |
| `PORT` | Local server port (defaults to `3000`) |
| `MAIL_HOST` | SMTP server host |
| `MAIL_PORT` | SMTP server port (commonly `587`) |
| `MAIL_SECURE` | Set to `true` when the SMTP provider requires implicit TLS |
| `MAIL_USER` | SMTP account username/email |
| `MAIL_PASS` | SMTP password or provider-generated app password |

Login uses email OTP, so valid SMTP settings are needed for the login flow.

## Project structure

```text
skillnet_clean/
├── server.js
├── package.json
├── .env.example
├── models/
│   ├── User.js
│   ├── Question.js
│   └── Category.js
├── middleware/
│   └── auth.js
├── routes/
│   ├── auth.js
│   ├── users.js
│   ├── questions.js
│   ├── answers.js
│   └── admin.js
├── utils/
│   └── mailer.js
├── public/
│   ├── index.html
│   ├── login.html
│   ├── register.html
│   ├── ask.html
│   ├── question.html
│   ├── profile.html
│   ├── category.html
│   ├── community.html
│   ├── notifications.html
│   ├── admin.html
│   ├── css/
│   │   └── style.css
│   ├── js/
│   │   └── app.js
│   └── images/
└── clearvotes.js
```

## API route groups

The Express application mounts these route groups:

- `/api/auth` — registration, login, OTP verification, resend OTP, logout, and current-user authentication
- `/api/questions` — question-related operations
- `/api/answers` — answer-related operations
- `/api/users` — user/profile-related operations
- `/api/admin` — administration and moderation operations

## Database notes

The application connects to MongoDB using `MONGO_URI`. The server seeds its default academic categories when the categories collection is empty. Start MongoDB before starting the application.

To grant administrator access for a local academic/demo deployment, update the intended account's role directly in MongoDB after registering. Confirm the exact role values used by the current `User` model before changing the record. Do not expose an admin account or database credentials publicly.

## Troubleshooting

- **MongoDB connection error:** Check that MongoDB is running and that `MONGO_URI` is correct.
- **OTP email is not sent:** Verify the SMTP host, port, security setting, username, and app password in `.env`. Check the terminal output for the mail error.
- **`npm` or package errors:** Confirm Node.js and npm are installed, then run `npm install` from the project folder.
- **Port already in use:** Change `PORT` in `.env` to an available port and restart the server.
- **Page does not load:** Confirm the server started successfully and visit the matching local URL.

## Security and sharing notes

- The ZIP intentionally does not include a live `.env` file. Create your own `.env` from `.env.example`.
- Never share SMTP passwords, app passwords, database credentials, or production secrets.
- Use a unique, strong `SESSION_SECRET` for each deployment.
- This project is supplied as an academic project package; review and test configuration and access controls before any public/production deployment.

## Team

SkillNet — BCA capstone project.

Update this section with the final approved guide/team details if this README is being used in a public project repository.
