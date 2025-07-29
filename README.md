# Duck Auth - Roblox Script Security System

A comprehensive authentication and whitelist system for securing Roblox scripts with a modern web dashboard.

## Features

- 🔐 **Secure Authentication** - JWT-based user authentication
- 📁 **Project Management** - Organize scripts into projects
- 📜 **Script Protection** - Upload and manage protected scripts
- 👥 **User Management** - Manage users per project with role-based access
- 📊 **Analytics Dashboard** - Track usage and performance metrics
- 🎨 **Modern UI** - Beautiful blue-themed interface with light/dark mode
- 🔑 **API Key Management** - Generate and manage API keys
- 📈 **Monthly Limits** - Track obfuscations and user limits

## Quick Start

1. **Clone the repository**
   ```bash
   git clone https://github.com/Lethal-Luka/duck-auth.git
   cd duck-auth
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the server**
   ```bash
   npm start
   ```

4. **Open your browser**
   Navigate to `http://localhost:3000`

## Project Structure

```
duck-auth/
├── index.js                 # Main server file
├── package.json            # Dependencies and scripts
├── README.md              # This file
├── config/
│   └── database.js        # Database configuration
├── middleware/
│   └── auth.js           # Authentication middleware
├── models/
│   ├── User.js           # User model
│   ├── Project.js        # Project model
│   ├── Script.js         # Script model
│   └── ApiKey.js         # API Key model
├── routes/
│   ├── auth.js           # Authentication routes
│   ├── projects.js       # Project management routes
│   ├── scripts.js        # Script management routes
│   ├── users.js          # User management routes
│   └── dashboard.js      # Dashboard API routes
├── utils/
│   ├── helpers.js        # Utility functions
│   └── validation.js     # Input validation
└── public/
    ├── index.html        # Landing page
    └── dashboard.html    # Dashboard interface
```

## License

MIT License