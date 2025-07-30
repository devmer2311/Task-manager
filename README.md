# Admin Dashboard - Agent Management System

A modern admin dashboard for managing agents, tasks, and file upload.

## Features

- **Admin Dashboard**: Manage team members, upload CSV files, view analytics
- **Agent Dashboard**: View assigned tasks, update task status
- **Authentication**: Role-based access (Admin/Agent)
- **File Upload**: Bulk CSV upload with automatic distribution
- **Real-time Analytics**: Task completion tracking


## Quick Start

1. **Install dependencies:**
   ```bash
   npm run install:all
   ```

2. **Setup environment:**
   - Copy `backend/.env.example` to `backend/.env`
   - Update MongoDB URI and other settings

3. **Start the application:**
   ```bash
   npm run dev:full
   ```

4. **Access the application:**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:3001

## Deployment

### Frontend (Netlify/Vercel)
1. Build the frontend: `npm run build`
2. Deploy the `out` folder to your hosting provider
3. Update `NEXT_PUBLIC_API_URL` to your backend URL

### Backend (Railway/Render/Heroku)
1. Deploy backend folder to your hosting provider
2. Set environment variables:
   - `MONGODB_URI`: Your MongoDB connection string
   - `JWT_SECRET`: Strong random string
   - `CORS_ORIGINS`: Your frontend URL
3. Ensure MongoDB is accessible from your hosting provider

### Environment Variables

**Backend (.env):**
```env
MONGODB_URI=mongodb://localhost:27017/admin-dashboard
JWT_SECRET=your-super-secret-jwt-key
PORT=3001
CORS_ORIGINS=http://localhost:3000,https://your-frontend-url.com
```

**Frontend:**
```env
NEXT_PUBLIC_API_URL=https://your-backend-url.com
```

## File Upload Format

CSV files should contain these columns:
- `FirstName` (required)
- `Phone` (required) 
- `Notes` (optional)

## Tech Stack

- **Frontend**: Next.js, React, TypeScript, Tailwind CSS
- **Backend**: Node.js, Express.js, MongoDB
- **Authentication**: JWT
- **File Processing**: CSV Parser, XLSX

