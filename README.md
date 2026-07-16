````markdown
# CostaSpanish Academy LMS

A full-stack Learning Management System designed for independent language teachers, combining student management, course and lesson planning, scheduling, resource distribution, and credit-based billing in a single platform.

**Next.js · TypeScript · MongoDB · NextAuth · Firebase · Google Calendar API**

## About the Project

CostaSpanish Academy is an LMS and CRM platform designed to centralize the internal operations of a private language academy and address its main administrative and teaching challenges.

The platform replaces fragmented and repetitive workflows that would otherwise require teachers and administrators to switch between calendars, documents, messaging applications, and spreadsheets. It brings together lesson scheduling, student management, course organization, and the administration of vouchers and lesson credits.

A central part of the system is its content-reuse model. Courses, lessons, teaching resources, and curriculum structures can be reused and adapted, significantly reducing lesson-preparation time while maintaining a consistent standard of teaching.

This workflow is supported by a structured metadata system that makes educational content easier to classify, search, manage, and reuse throughout the platform.

## Core Features

### Authentication and Authorization

- Authentication powered by NextAuth.
- JWT-based user sessions.
- Role-based access for administrators, teachers, and students.
- Protected dashboard pages and API endpoints.
- Google OAuth connection for Google Calendar integration.

### Student Management

- Teacher-owned student profiles.
- Student status and contact information.
- Active plans, vouchers, and available lesson credits.
- Support for private, paired, and group learning models.

### Courses and Curriculum

- Reusable `CourseTemplate` blueprints.
- Structured modules, submodules, and curriculum units.
- Independent `CourseProfile` instances created from reusable templates.
- Support for regular groups, intensive groups, and flexible private courses.
- Configurable storefront, scheduling, and credit-consumption policies.

### Lessons and Credits

- Scheduled, completed, and cancelled lesson states.
- Student and course assignment.
- Voucher and lesson-credit consumption.
- Trial lesson support.
- Foundations for teacher notes and homework management.
- Google Calendar synchronization.

### Resource Library

- Support for PDF, image, audio, video, and external-link resources.
- Firebase Storage integration.
- Automatic file metadata extraction.
- PDF thumbnail generation.
- Upload progress tracking.
- Resource search and pagination.
- Archive and permanent file-cleanup workflows.
- Server-side removal of replaced and deleted Firebase files.

## Technology Stack

| Area                 | Technologies                             |
| -------------------- | ---------------------------------------- |
| Frontend             | Next.js, React, TypeScript, Tailwind CSS |
| Forms and validation | React Hook Form, Zod                     |
| Data fetching        | SWR                                      |
| Backend              | Next.js Route Handlers, Node.js          |
| Database             | MongoDB, Mongoose                        |
| Authentication       | NextAuth, JWT                            |
| File storage         | Firebase Storage, Firebase Admin SDK     |
| Integrations         | Google Calendar API, Google OAuth        |
| Internationalization | Spanish and English i18n                 |
| Deployment           | Vercel                                   |

## Project Architecture

The application follows a modular, domain-oriented structure inspired by Domain-Driven Design principles. The user interface, server-side logic, domain models, and infrastructure integrations are separated while using the **Next.js App Router** as the main application framework.

<details>
  <summary><b>Click to expand the project structure</b></summary>

```text
📦 project-root
├── 📁 app/                 # Routing, Server Components, and Next.js Route Handlers
│   ├── 🌐 [locale]/        # Internationalized routes and language support
│   │   └── 📊 dashboard/   # Main system views: lessons, courses, students, and resources
│   └── ⚙️ api/             # Backend endpoints, OAuth flows, and storage operations
│
├── 🧩 components/          # React components organized by domain
│   ├── 🛠️ dashboard/       # Feature components, complex wizards, and data tables
│   └── 💅 ui/              # Reusable design-system components
│
├── 🧠 lib/                 # Business logic, integrations, and shared utilities
│   ├── 🪝 hooks/           # Custom hooks for data fetching and mutations
│   ├── 🛡️ validators/      # Shared Zod validation schemas
│   ├── 🗃️ dto/             # Data Transfer Objects and database-to-UI mappers
│   ├── 🔌 services/        # Database and external API abstractions
│   └── 🔥 firebase/        # Firebase Storage integration and file-management logic
│
├── 🗄️ models/              # Mongoose models such as CourseProfile, Lesson, and User
│
├── 📝 messages/            # Spanish and English translation dictionaries
│
└── ⚙️ middleware.ts        # Route protection and authentication redirects
```
````

</details>

## Engineering Highlights

The project addresses several technical and architectural challenges beyond standard CRUD operations:

- Role-based authorization applied to both pages and API endpoints.
- Shared Zod schemas used across client-side forms and server operations.
- Separation between reusable course templates and operational course instances.
- Firebase uploads with progress tracking and generated resource metadata.
- Server-side cleanup of replaced, cancelled, and deleted files.
- Archive and deletion workflows that keep MongoDB and Firebase Storage synchronized.
- Signed OAuth state for secure Google Calendar connections.
- Typed DTOs for list and detail API responses.
- Paginated and searchable resource endpoints.
- Resource-specific processing pipelines for different file formats.
- Internationalized routes, validation messages, and user interfaces.
- Domain modelling for students, courses, lessons, vouchers, and teaching resources.

## Local Development

### 1. Clone the repository

```bash
git clone <repository-url>
cd <repository-directory>
```

### 2. Install the dependencies

```bash
npm install
```

### 3. Configure the environment variables

Create a `.env.local` file in the project root and configure the required credentials:

```env
MONGODB_URI=

NEXTAUTH_SECRET=
NEXTAUTH_URL=

GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=
```

Do not commit real credentials or private keys to the repository.

### 4. Start the development server

```bash
npm run dev
```

Open `http://localhost:3000` in your browser.

## Author

Developed by **Michael Rodríguez Iranzo** as a full-stack solution for the real-world operational and teaching workflows of a private language academy.

The project focuses on domain modelling, reusable educational content, external service integrations, secure file lifecycle management, and maintainable product architecture.

## Links

- [LinkedIn](https://www.linkedin.com/in/michaelrodrigueziranzo)
- [Portfolio](https://www.michael-rodriguez.dev/)

```

```
