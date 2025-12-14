# HexaSuite Frontend

Frontend application for HexaSuite HR Management System with Biometric Integration.

## Features

- 👤 User & Admin Dashboard
- 📊 Attendance Management with Biometric Device Integration
- 🔐 JWT Authentication
- 📱 Responsive Design with Tailwind CSS
- ⚡ Built with React + Vite
- 🎨 Modern UI/UX

## Tech Stack

- **React 18** - UI Framework
- **Vite** - Build tool
- **React Router** - Navigation
- **Axios** - HTTP client
- **Tailwind CSS** - Styling
- **Vercel** - Hosting

## Getting Started

### Prerequisites

- Node.js >= 18.0.0
- npm or yarn

### Installation

1. Clone the repository
```bash
git clone https://github.com/Kazuchan1889/hexasuite-revamp.git
cd hexasuite-revamp
```

2. Install dependencies
```bash
npm install
```

3. Create environment file
```bash
cp .env.example .env
```

4. Update `.env` with your backend API URL
```env
VITE_API_URL=http://localhost:4000/api
```

5. Run development server
```bash
npm run dev
```

The app will be available at http://localhost:3000

## Build for Production

```bash
npm run build
```

The build output will be in the `dist` directory.

## Deploy to Vercel

### Option 1: Automatic (Recommended)

1. Push your code to GitHub
2. Go to [Vercel Dashboard](https://vercel.com/dashboard)
3. Click "Add New Project"
4. Import your GitHub repository
5. Vercel will auto-detect Vite configuration
6. Add environment variable:
   - `VITE_API_URL` = your backend API URL
7. Click "Deploy"

### Option 2: Vercel CLI

```bash
npm install -g vercel
vercel login
vercel --prod
```

## Environment Variables

Set these in Vercel dashboard (Settings → Environment Variables):

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_API_URL` | Backend API URL | `https://your-api.com/api` |

## Project Structure

```
FE - Copy/
├── src/
│   ├── components/      # Reusable components
│   ├── config/          # Configuration files
│   ├── contexts/        # React contexts
│   ├── pages/          # Page components
│   │   ├── Admin*.jsx  # Admin pages
│   │   └── User*.jsx   # User pages
│   ├── utils/          # Utility functions
│   ├── App.jsx         # Main app component
│   ├── main.jsx        # Entry point
│   └── index.css       # Global styles
├── vite.config.js      # Vite configuration
├── vercel.json         # Vercel deployment config
├── tailwind.config.cjs # Tailwind configuration
└── package.json        # Dependencies
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build locally

## Features Overview

### User Features
- Dashboard with attendance overview
- Check-in/Check-out
- Leave requests
- Daily reports
- Performance tracking
- Profile management

### Admin Features
- User management
- Attendance monitoring
- Biometric device management
- Leave approval
- Report management
- Payroll calculation
- Settings configuration

## Biometric Integration

The frontend integrates with biometric devices through the backend API:

- Device management
- Face recognition
- Palm print registration
- Real-time attendance sync
- Auto-detect middleware IP

## Troubleshooting

### Build fails on Vercel

1. Check if all dependencies are in `package.json`
2. Make sure `vite.config.js` exists
3. Verify `vercel.json` configuration
4. Check environment variables are set

### API connection errors

1. Verify `VITE_API_URL` is set correctly
2. Check backend is running and accessible
3. Ensure CORS is configured on backend

### Styling issues

1. Run `npm install` to ensure Tailwind is installed
2. Check `tailwind.config.cjs` configuration
3. Verify `postcss.config.cjs` is present

## Support

For issues and questions, please open an issue on GitHub.

## License

Private - All rights reserved
