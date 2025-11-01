# TeamUp - Professional Real-time Collaborative Application

<div align="center">
  <img src="https://img.shields.io/badge/version-2.0.0-blue.svg" alt="Version">
  <img src="https://img.shields.io/badge/node-%3E%3D16.0.0-green.svg" alt="Node Version">
  <img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="License">
  <img src="https://img.shields.io/badge/PRs-welcome-brightgreen.svg" alt="PRs Welcome">
</div>

## 🚀 Overview

TeamUp is a modern, professional-grade real-time collaborative application that enables teams to work together seamlessly. Built with cutting-edge web technologies, it offers real-time text editing, file sharing, user management, and advanced collaboration features.

### ✨ Key Features

- **Real-time Collaboration**: Synchronized text editing with typing locks and indicators
- **File Sharing**: Drag-and-drop file uploads with support for multiple formats
- **User Management**: Admin controls, user roles, and moderation features
- **Room System**: Public and private rooms with LAN support
- **Modern UI/UX**: Responsive design with dark mode and professional styling
- **Performance Optimized**: Efficient memory usage and file cleanup
- **Security**: Input sanitization and file type validation

## 🛠️ Technology Stack

- **Backend**: Node.js, Express.js, Socket.IO
- **Frontend**: Vanilla JavaScript (ES6+), Modern CSS3
- **File Handling**: Multer with security validations
- **Real-time**: WebSocket connections with Socket.IO
- **Architecture**: Event-driven, modular design

## 📋 Prerequisites

- Node.js >= 16.0.0
- npm >= 8.0.0
- Modern web browser with WebSocket support

## 🚀 Quick Start

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/teamup-collaborative-app.git
   cd teamup-collaborative-app
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the server**
   ```bash
   # Development mode
   npm run dev
   
   # Production mode
   npm run prod
   
   # Default start
   npm start
   ```

4. **Access the application**
   Open your browser and navigate to `http://localhost:3000`

### Environment Variables

Create a `.env` file in the root directory (optional):

```env
PORT=3000
HOST=localhost
NODE_ENV=development
```

## 🏗️ Architecture

### Project Structure

```
teamup/
├── public/                 # Static frontend files
│   ├── css/
│   │   └── styles.css     # Modern CSS with design system
│   ├── js/
│   │   └── app.js         # Optimized ES6+ JavaScript
│   └── index.html         # Main HTML file
├── uploads/               # File upload directory
├── server.js             # Main server file
├── package.json          # Project configuration
└── README.md            # Documentation
```

### Key Components

#### Frontend Architecture
- **TeamUpApp Class**: Main application controller
- **Event-driven Design**: Modular event handling
- **State Management**: Centralized application state
- **Performance Optimized**: DOM caching and efficient updates

#### Backend Architecture
- **Express Server**: RESTful API endpoints
- **Socket.IO Integration**: Real-time communication
- **File Management**: Secure upload and cleanup system
- **Room Management**: Multi-room support with persistence

## 🎯 Features Deep Dive

### Real-time Collaboration
- **Typing Locks**: Prevents conflicts during simultaneous editing
- **Live Cursors**: See who's typing in real-time
- **Instant Sync**: Changes appear immediately across all clients

### File Sharing System
- **Drag & Drop**: Intuitive file upload interface
- **File Type Validation**: Security through MIME type checking
- **Size Limits**: 10MB maximum file size
- **Auto Cleanup**: Automatic removal of expired files

### User Management
- **Role-based Access**: Admin and member roles
- **Moderation Tools**: Mute and kick capabilities
- **User Persistence**: Names and preferences saved locally

### Room System
- **Public Rooms**: Open collaboration spaces
- **Private Rooms**: Password-protected environments
- **LAN Rooms**: Local network collaboration
- **Room Discovery**: Browse available rooms

## 🔧 Configuration

### Server Configuration

The server can be configured through environment variables:

- `PORT`: Server port (default: 3000)
- `HOST`: Server host (default: localhost)
- `NODE_ENV`: Environment mode (development/production)

### File Upload Limits

- **Maximum file size**: 10MB
- **Allowed file types**: Documents, images, videos, archives
- **Concurrent uploads**: 1 file at a time

### Cleanup Settings

- **Public room files**: Expire after 15 minutes
- **Private room files**: Expire after 30 minutes
- **Unused rooms**: Cleaned after 24 hours of inactivity

## 🚀 Performance Optimizations

### Frontend Optimizations
- **DOM Caching**: Elements cached for faster access
- **Event Delegation**: Efficient event handling
- **Debounced Operations**: Reduced server requests
- **CSS Animations**: Hardware-accelerated transitions

### Backend Optimizations
- **Async/Await**: Non-blocking operations
- **Memory Management**: Efficient data structures
- **File Streaming**: Large file handling
- **Connection Pooling**: Optimized Socket.IO configuration

## 🔒 Security Features

### Input Validation
- **Filename Sanitization**: Prevents directory traversal
- **File Type Checking**: MIME type validation
- **Size Limits**: Prevents DoS attacks
- **Rate Limiting**: Built-in Express protections

### Data Protection
- **No Persistent Storage**: Messages not stored permanently
- **Secure File Handling**: Temporary file management
- **CORS Configuration**: Controlled cross-origin requests

## 🎨 UI/UX Features

### Modern Design System
- **CSS Custom Properties**: Consistent theming
- **Responsive Layout**: Mobile-first approach
- **Dark Mode**: User preference support
- **Accessibility**: WCAG compliant components

### Interactive Elements
- **Smooth Animations**: CSS transitions and keyframes
- **Loading States**: User feedback during operations
- **Toast Notifications**: Non-intrusive messaging
- **Keyboard Shortcuts**: Power user features

## 🧪 Development

### Code Structure
- **ES6+ Features**: Modern JavaScript syntax
- **Modular Design**: Separated concerns
- **Error Handling**: Comprehensive error management
- **Logging**: Detailed server and client logging

### Best Practices
- **Clean Code**: Readable and maintainable
- **Performance First**: Optimized for speed
- **Security Minded**: Built with security in mind
- **User Focused**: Excellent user experience

## 🚀 Deployment

### Production Deployment

1. **Set environment variables**
   ```bash
   export NODE_ENV=production
   export PORT=80
   ```

2. **Start the server**
   ```bash
   npm run prod
   ```

### Docker Deployment (Optional)

Create a `Dockerfile`:

```dockerfile
FROM node:16-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

## 📊 Monitoring

The application includes built-in monitoring:

- **Memory Usage**: Tracked and logged
- **Active Connections**: Real-time statistics
- **Room Analytics**: Usage patterns
- **Error Logging**: Comprehensive error tracking

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines
- Follow existing code style
- Add comments for complex logic
- Test your changes thoroughly
- Update documentation as needed

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Socket.IO team for real-time capabilities
- Express.js community for the robust framework
- Contributors and testers who helped improve the application

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/your-username/teamup-collaborative-app/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-username/teamup-collaborative-app/discussions)
- **Email**: support@teamup-app.com

---

<div align="center">
  <p>Made with ❤️ by the TeamUp Development Team</p>
  <p>⭐ Star this repo if you find it helpful!</p>
</div>