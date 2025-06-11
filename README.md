# Samdani Group Dispatch Management System

A comprehensive ERP solution for factory supervisors to digitally measure slab dimensions with auto-calculations, PDF generation, and cloud storage.

## Features

### 🔧 Core Functionality
- **Digital Slab Measurement**: Input thickness, length/height, corner deductions
- **Auto-calculations**: Gross area, net area calculations in real-time
- **Multi-slab Entry**: Handle multiple slabs in a single dispatch
- **Copy Previous**: Copy measurements from previous slab for efficiency
- **Material Management**: Add new materials dynamically

### 📊 Data Management
- **Cloud Database**: MongoDB Atlas integration
- **Real-time Sync**: Instant data synchronization
- **View Database**: Browse all saved slab measurements
- **Search & Filter**: Find specific measurements quickly

### 📈 Analytics & Reports
- **Performance Reports**: Supervisor and party-wise analytics
- **Material Reports**: Material-wise breakdown
- **Dashboard**: Overview of key metrics

## Tech Stack

### Frontend
- **React 18** with TypeScript
- **Tailwind CSS** for styling
- **React Router** for navigation
- **Responsive Design** for mobile/desktop

### Backend
- **Node.js** with Express.js
- **MongoDB** with Mongoose ODM
- **RESTful API** architecture
- **Input validation** and error handling

### Database
- **MongoDB Atlas** (Cloud)
- **Structured schemas** for data integrity
- **Indexing** for performance

## Project Structure

```
Samdani Group Dispatch Management/
├── frontend/                 # React TypeScript application
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── pages/          # Page components
│   │   ├── services/       # API services
│   │   ├── types/          # TypeScript definitions
│   │   └── styles/         # CSS/Tailwind styles
│   └── package.json
├── backend/                 # Node.js Express server
│   ├── src/
│   │   ├── models/         # MongoDB schemas
│   │   └── routes/         # API endpoints
│   ├── server.js           # Main server file
│   └── package.json
└── README.md
```

## Installation & Setup

### Prerequisites
- Node.js (v16 or higher)
- MongoDB Atlas account
- Git

### 1. Clone Repository
```bash
git clone <repository-url>
cd "Samdani Group Dispatch Management"
```

### 2. Backend Setup
```bash
cd backend
npm install
```

Create `.env` file:
```env
PORT=5000
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/samdani_dispatch
NODE_ENV=development
```

### 3. Frontend Setup
```bash
cd frontend
npm install
```

### 4. Start Development Servers

**Backend:**
```bash
cd backend
npm start
```

**Frontend:**
```bash
cd frontend
npm start
```

## Usage

1. **Access Application**: Open http://localhost:3000
2. **Fill Dispatch Info**: Material, Lot Number, Vehicle Number, etc.
3. **Enter Measurements**: Add slab dimensions and corner deductions
4. **Save Data**: Click "Save All Measurements"
5. **View Database**: Navigate to "View Database" to see saved records

## API Endpoints

### Slabs
- `GET /api/slabs` - Get all slabs with filtering
- `POST /api/slabs` - Create new slab measurement
- `GET /api/slabs/:id` - Get specific slab
- `PUT /api/slabs/:id` - Update slab
- `DELETE /api/slabs/:id` - Delete slab

### Reports
- `GET /api/reports/analytics` - Get analytics data
- `GET /api/reports/daily` - Get daily reports

## Development

### Key Components
- `SlabEntry.tsx` - Main measurement entry form
- `SlabList.tsx` - Database view component
- `Dashboard.tsx` - Analytics dashboard
- `Reports.tsx` - Reporting interface

### Database Schema
- **SlabMeasurement**: Core slab data model
- **CornerDeduction**: Corner cut measurements
- **Indexes**: Performance optimization

## Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open Pull Request

## License

This project is proprietary software for Samdani Group.

## Support

For technical support or questions, contact the development team.

---

**Version**: 1.0.0  
**Last Updated**: December 2024  
**Developed by**: AI Assistant for Samdani Group 