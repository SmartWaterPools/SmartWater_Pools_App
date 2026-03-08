# SmartWater Pools - Pool Service Management System

## Project Overview

SmartWater Pools Management System is a comprehensive web-based application designed to streamline and manage pool service operations. The system connects office staff, technicians, and clients through a unified platform for managing construction projects, maintenance scheduling, repair services, and client relationships.

## Features

### Project Management
- Track pool construction and renovation projects
- Assign technicians to specific projects
- Monitor project status, timeline, and budget
- Store project specifications and client requirements

### Maintenance Scheduling
- Schedule recurring maintenance visits
- Assign technicians to maintenance tasks
- Track maintenance history for each client
- Generate maintenance reports

### Repair Services
- Create and track repair requests
- Prioritize repairs based on urgency
- Assign technicians with appropriate skills
- Document repair details and outcomes

### Client Portal
- Allow clients to view their project status
- Enable clients to schedule maintenance or request repairs
- Provide access to invoices and payment history
- Facilitate communication between clients and service staff

### Technician Management
- Maintain profiles with skills and certifications
- Optimize scheduling based on location and expertise
- Track technician performance and workload
- Enable mobile access for field updates

## Technical Stack

- **Frontend**: React with TypeScript, TailwindCSS, shadcn/ui components
- **Backend**: Express.js with TypeScript
- **Database**: PostgreSQL via Drizzle ORM and Neon serverless driver
- **State Management**: TanStack Query for data fetching and caching
- **Form Handling**: React Hook Form with Zod validation
- **Styling**: Tailwind CSS with custom theme

## Architecture

The application follows a modern web application architecture:

- **Frontend**: Single-page application built with React
- **Backend**: RESTful API built with Express
- **Data Layer**: Storage interface implemented against PostgreSQL
- **Shared Types**: Common type definitions shared between frontend and backend

## Getting Started

1. Clone the repository.
2. Install dependencies with `npm install`.
3. Copy `.env.example` to `.env` and fill in at least:
   - `DATABASE_URL`
   - `SESSION_SECRET`
   - `APP_URL`
4. Start the development server with `npm run dev`.
5. Access the application at [http://localhost:5000](http://localhost:5000).

## Local Development Notes

- `npm run dev` and `npm run start` are configured to work on Windows and Unix-like shells.
- The app currently requires a PostgreSQL database. It will not boot without `DATABASE_URL`.
- Google OAuth can use either `GOOGLE_CALLBACK_URL` or derive the callback from `APP_URL`.
- `npm run build` currently succeeds. `npm run check` still reports broader TypeScript drift that should be cleaned up separately.

## Future Enhancements

- Authentication and authorization system
- Mobile application for technicians
- Automated invoicing system
- GPS tracking for service routes
- Integration with inventory management
- Weather-based scheduling adjustments

## Screenshots

(Screenshots will be added as the project develops)
