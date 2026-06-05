# DevBlog

A full-stack developer blogging platform with real-time chat, AI assistant, and community features.

## Features

- **Blog Feed** — Create, read, and search posts
- **Real-time Chat** — Group channels + direct messages
- **Betty AI** — AI assistant for developers
- **Notifications** — Like, comment, follow alerts
- **User Profiles** — Custom avatars, bios, stats
- **Admin Panel** — Clear chats, manage users

## Tech Stack

**Frontend:** React, Vite, Tailwind CSS, Socket.IO Client  
**Backend:** Node.js, Express, Socket.IO, Prisma, CockroachDB  
**AI:** Groq API  
**Image Upload:** Cloudinary  

## Getting Started

### Backend
```bash
cd devblog-backend
npm install
# Add .env file with your credentials
npm run dev

cd devblog-frontend
npm install
npm run dev


Backend .env
DATABASE_URL=
JWT_SECRET=
GROQ_API_KEY=
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

Author
Built by Softcode Web Studio

---

## **Step 3: Git Commands**

Open terminal in your **project root** (the folder that contains both `devblog-backend` and `devblog-frontend`):

```bash
# 1. Initialize git
git init

# 2. Add all files
git add .

# 3. First commit
git commit -m "Initial commit: DevBlog full-stack platform"

# 4. Create GitHub repo
# Go to https://github.com/new
# Name: devblog
# Create repository (DON'T initialize with README)

# 5. Connect to GitHub (replace with your actual URL)
git remote add origin https://github.com/softcodestudio44-tech/devblog.git

# 6. Push
git branch -M main
git push -u origin main



