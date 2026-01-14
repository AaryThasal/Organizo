# 🏢 Organizo

Organizo is an organization-based project management application that helps teams manage projects and tasks within a single workspace using role-based access.

The system supports Admins, Managers, and Employees, each with clearly defined responsibilities and access levels.

## ✨ Features

### 👥 Role-Based Access Control
- **Admin** - Full organization control, user management, settings
- **Manager** - Project creation, task assignment, team management
- **Employee** - View assigned tasks, update status

### 🔐 Authentication & Authorization
- Secure JWT-based authentication
- Organization join codes for easy onboarding
- Admin approval workflow for new members
- Password hashing with bcrypt

### 📁 Project Management
- Create and manage multiple projects
- Add/remove team members per project
- Track project status (Active, On Hold, Completed)
- Due date tracking

### ✅ Task Management
- Create tasks with descriptions and due dates
- Assign tasks to multiple team members
- Update task status (To-Do, In Progress, Completed, On Hold)
- View all assigned tasks in one place

---

## 🛠️ Tech Stack

### Frontend
- **React 18** - UI library
- **Redux Toolkit** - State management
- **React Router** - Client-side routing
- **TailwindCSS** - Styling
- **Axios** - API calls
- **Vite** - Build tool

### Backend
- **Node.js** - Runtime
- **Express.js** - Web framework
- **PostgreSQL** - Database (Neon serverless)
- **JWT** - Authentication
- **bcrypt** - Password hashing

---

## 👤 User Flows

### Admin Flow
1. Register → Creates organization
2. Share join code with team
3. Approve/reject join requests
4. Manage projects and has whole organization control

### Manager Flow
1. Register → Enter join code
2. Wait for admin approval
3. Create projects and tasks
4. Assign tasks to employees

### Employee Flow
1. Register → Enter join code
2. Wait for admin approval
3. View assigned tasks
4. Update task status

---
