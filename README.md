# React Router 7 Starter App

A modern starter application built with React Router 7, featuring a custom Express server with WebSocket support, comprehensive authentication, role-based access control (RBAC), and UI built with shadcn/ui and Tailwind CSS.

## 🚀 Features

### Core Framework

- **React Router 7** - Latest version with modern routing patterns
- **Custom Express Server** - Built for WebSocket and WebRTC integration
- **TypeScript** - Full type safety throughout the application
- **Vite** - Fast development and build tooling

### Authentication & Security

- **Email/Password Authentication** - Secure login and registration
- **Session Management** - Persistent user sessions
- **Password Reset** - Email-based password recovery
- **Email Verification** - TOTP-based verification system
- **CSRF Protection** - Built-in CSRF token validation
- **Rate Limiting** - Configurable rate limiting for API endpoints

### Database & ORM

- **SQLite** - Lightweight, file-based database
- **Prisma** - Type-safe database client and migrations
- **User Management** - Complete user CRUD operations
- **Image Upload** - User avatar and image management

### UI/UX

- **shadcn/ui** - Beautiful, accessible component library
- **Tailwind CSS** - Utility-first CSS framework
- **Dark/Light Mode** - Theme switching with system preference detection
- **Responsive Design** - Mobile-first responsive layout
- **Toast Notifications** - User feedback with Sonner
- **Form Validation** - Conform + Zod validation

### Role-Based Access Control (RBAC)

- **Flexible Permission System** - Action-based permissions (create, read, update, delete)
- **Role Management** - Assign roles to users
- **Entity-Based Access** - Control access to different resources
- **Granular Permissions** - Own vs. any access levels

### Real-time Features

- **WebSocket Support** - Socket.IO integration ready
- **WebRTC Ready** - Infrastructure for real-time communication
- **Custom Server Context** - Pass WebSocket instances to routes

### Development Experience

- **Hot Reload** - Fast development with Vite
- **Type Generation** - Automatic React Router type generation
- **Database Seeding** - Sample data for development
- **Error Boundaries** - Graceful error handling
- **Loading States** - Skeleton and loading components

## 📁 Project Structure

```
tradingchat/
├── app/
│   ├── components/          # Reusable UI components
│   │   ├── ui/             # shadcn/ui components
│   │   └── ...             # Custom components
│   ├── hooks/              # Custom React hooks
│   ├── lib/                # Utility libraries
│   ├── routes/             # React Router routes
│   │   ├── app/            # Protected app routes
│   │   ├── auth/           # Authentication routes
│   │   ├── layouts/        # Layout components
│   │   └── user/           # User management routes
│   ├── types/              # TypeScript type definitions
│   └── utils/              # Server utilities
├── prisma/                 # Database schema and migrations
├── server/                 # Custom Express server
├── public/                 # Static assets
└── package.json
```

## 🛠️ Tech Stack

### Frontend

- **React 19** - Latest React with concurrent features
- **React Router 7** - Modern routing with data loading
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first styling
- **shadcn/ui** - Component library
- **Framer Motion** - Animations
- **Lucide React** - Icons

### Backend

- **Express.js** - Custom server framework
- **Socket.IO** - Real-time communication
- **Prisma** - Database ORM
- **SQLite** - Database
- **bcryptjs** - Password hashing
- **Zod** - Schema validation
- **Conform** - Form handling

### Development Tools

- **Vite** - Build tool and dev server
- **TSX** - TypeScript execution
- **Morgan** - HTTP request logging
- **Compression** - Response compression

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

1. **Clone the repository**

   ```bash
   git clone <your-repo-url>
   cd tradingchat
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Set up environment variables**

   ```bash
   cp .env.example .env
   ```

   Configure your `.env` file:

   ```env
   DATABASE_URL="file:./dev.db"
   SESSION_SECRET="your-session-secret"
   EMAIL_SERVER_HOST="smtp.example.com"
   EMAIL_SERVER_PORT=587
   EMAIL_SERVER_USER="your-email"
   EMAIL_SERVER_PASSWORD="your-password"
   EMAIL_FROM="noreply@example.com"
   ```

4. **Set up the database**

   ```bash
   npx prisma migrate dev
   npx prisma db seed
   ```

5. **Start the development server**

   ```bash
   npm run dev
   ```

6. **Open your browser**
   Navigate to `http://localhost:3000`

## 📝 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run typecheck` - Run TypeScript type checking
- `npm run db:seed` - Seed the database with sample data

## 🔐 Authentication Flow

1. **Registration** - Users can register with email and password
2. **Email Verification** - TOTP-based email verification
3. **Login** - Secure login with session management
4. **Password Reset** - Email-based password recovery
5. **Session Management** - Persistent sessions with secure cookies

## 🎨 UI Components

The app includes a comprehensive set of UI components from shadcn/ui:

- **Navigation** - Menus, breadcrumbs, tabs
- **Forms** - Inputs, selects, checkboxes, toggles
- **Feedback** - Alerts, toasts, progress bars
- **Layout** - Cards, sheets, dialogs, modals
- **Data Display** - Tables, lists, avatars
- **Interactive** - Buttons, sliders, tooltips

## 🔒 Security Features

- **CSRF Protection** - Built-in CSRF token validation
- **Rate Limiting** - Configurable rate limits for different endpoints
- **Password Hashing** - Secure bcrypt password hashing
- **Session Security** - Secure session management
- **Input Validation** - Zod schema validation
- **XSS Protection** - Built-in XSS protection

## 🌐 WebSocket Integration

The custom server is configured with Socket.IO for real-time features:

```typescript
// WebSocket instance is available in route loaders
export async function loader({ context }: LoaderFunctionArgs) {
  const { io } = context;
  // Use io for real-time communication
}
```

## 🎯 RBAC System

The role-based access control system provides:

- **Permissions** - Action-based permissions (create, read, update, delete)
- **Roles** - User roles with multiple permissions
- **Entity Access** - Control access to different resources
- **Granular Control** - Own vs. any access levels

## 📱 Responsive Design

The app is built with a mobile-first approach using Tailwind CSS:

- **Mobile Optimized** - Touch-friendly interfaces
- **Tablet Support** - Responsive layouts for tablets
- **Desktop Experience** - Full-featured desktop interface
- **Dark Mode** - Automatic theme switching

## 🚀 Deployment

### Production Build

```bash
npm run build
npm run start
```

### Docker Deployment

```dockerfile
# Use the included Dockerfile
docker build -t tradingchat .
docker run -p 3000:3000 tradingchat
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- [React Router](https://reactrouter.com/) - Modern routing for React
- [shadcn/ui](https://ui.shadcn.com/) - Beautiful component library
- [Prisma](https://www.prisma.io/) - Type-safe database client
- [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS framework
- [Socket.IO](https://socket.io/) - Real-time communication

---

**Ready to build amazing real-time applications! 🚀**
