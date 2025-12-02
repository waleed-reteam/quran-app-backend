# Quran App Backend

A comprehensive REST API backend for an Islamic mobile application featuring Quran, Hadiths, Duas, Prayer Times, AI-powered search, and push notifications.

## 🚀 Features

- **Authentication**: JWT-based auth with Google and Apple Sign-In support
- **Quran**: Complete Quran (114 Surahs, 6,236 Ayahs) via AlQuran Cloud API with multiple editions (Arabic, English translations, audio recitations)
- **Hadiths**: 40,465+ Hadiths from 10 major collections via Hadith API (Sahih Bukhari, Muslim, Tirmidhi, etc.)
- **Duas**: Daily, morning, evening, and after-prayer supplications
- **Prayer Times**: Accurate prayer times based on location with Qibla direction
- **Bookmarks**: Save and manage favorite verses, hadiths, and duas
- **AI Search**: Semantic search powered by OpenAI and Pinecone
- **Push Notifications**: Prayer reminders and daily dhikr notifications
- **Multi-language**: Support for Arabic, English, and Urdu

## 🛠️ Tech Stack

### Backend Framework
- **Node.js** with **Express** and **TypeScript**
- RESTful API architecture

### Databases
- **PostgreSQL**: User data, bookmarks, prayer times
- **MongoDB**: Duas (flexible schema)
- **Quran API**: Real-time Quran data from api.alquran.cloud
- **Hadith API**: Real-time Hadith data from hadithapi.com
- **Redis**: Caching and performance optimization

### AI & Search
- **OpenAI API**: Embeddings and chat completions
- **Pinecone**: Vector database for semantic search

### Services
- **Firebase Admin**: Push notifications
- **Aladhan API**: Prayer times integration
- **AWS S3**: Audio file storage (optional)

## 📋 Prerequisites

- Node.js (v18 or higher)
- PostgreSQL (v14 or higher)
- MongoDB (v6 or higher)
- Redis (v7 or higher)
- OpenAI API key (for AI features)
- Pinecone account (for vector search)
- Firebase project (for push notifications)

## 🔧 Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd quran-app-backend
```

2. **Install dependencies**
```bash
npm install
```

3. **Setup environment variables**
```bash
cp .env.example .env
```

Edit `.env` with your configuration:
- Database credentials
- API keys (OpenAI, Pinecone, Firebase)
- OAuth credentials (Google, Apple)

4. **Setup databases**

Start PostgreSQL:
```bash
# Create database
createdb quran_app
```

Start MongoDB:
```bash
# MongoDB should be running on localhost:27017
mongod
```

Start Redis:
```bash
redis-server
```

5. **Seed the database**
```bash
# Seed Duas (only Duas need seeding)
npm run seed:duas

# Verify Quran API (no seeding needed - Quran comes from API)
npm run verify:quran-api

# Verify Hadith API (no seeding needed - hadiths come from API)
npm run verify:hadith-api

# Or verify all APIs at once
npm run verify:all-apis
```

**Note:** 
- **Quran** is fetched directly from the [AlQuran Cloud API](https://api.alquran.cloud) in real-time
- **Hadiths** are fetched directly from the [Hadith API](https://hadithapi.com) in real-time
- Only **Duas** need to be seeded into MongoDB

6. **Index content for AI search (optional)**
```bash
npx ts-node src/scripts/indexContentForAI.ts
```

## 🚀 Running the Application

### Development
```bash
npm run dev
```

### Production
```bash
npm run build
npm start
```

The API will be available at `http://localhost:5000/api/v1`

## 📚 API Documentation

### Base URL
```
http://localhost:5000/api/v1
```

### Authentication Endpoints

#### Register
```http
POST /auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123",
  "name": "John Doe"
}
```

#### Login
```http
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

#### Google Sign-In
```http
POST /auth/google
Content-Type: application/json

{
  "idToken": "google_id_token",
  "email": "user@gmail.com",
  "name": "John Doe",
  "profilePicture": "https://...",
  "providerId": "google_user_id"
}
```

#### Get Current User
```http
GET /auth/me
Authorization: Bearer <token>
```

### Quran Endpoints

#### Get All Surahs
```http
GET /quran/surahs
```

#### Get Surah by Number
```http
GET /quran/surahs/:number?edition=en.asad
GET /quran/surahs/:number?editions=quran-uthmani,en.asad,ar.alafasy
```

#### Get Ayah by Reference
```http
GET /quran/ayahs/:reference?edition=en.asad
GET /quran/surahs/:surahNumber/ayahs/:ayahNumber?edition=en.asad
```

#### Search Quran
```http
GET /quran/search?query=mercy&surah=all&edition=en.asad
```

#### Get Juz, Page, Manzil, Ruku, Hizb
```http
GET /quran/juz/:juzNumber?edition=en.asad
GET /quran/page/:pageNumber?edition=quran-uthmani
GET /quran/manzil/:manzilNumber?edition=en.asad
GET /quran/ruku/:rukuNumber?edition=quran-uthmani
GET /quran/hizb/:hizbNumber?edition=quran-uthmani
```

#### Get Sajda Ayahs
```http
GET /quran/sajda?edition=quran-uthmani
```

#### Get Meta & Editions
```http
GET /quran/meta
GET /quran/editions?format=text&language=en
GET /quran/editions/default
```

### Hadith Endpoints

#### Get All Collections
```http
GET /hadiths/collections
```

#### Get Hadiths by Collection
```http
GET /hadiths/collections/sahih-bukhari?page=1&limit=25
```

#### Get Chapters by Book
```http
GET /hadiths/books/sahih-bukhari/chapters
```

#### Get Hadiths by Chapter
```http
GET /hadiths/books/sahih-bukhari/chapters/2?page=1&limit=25
```

#### Search Hadiths
```http
GET /hadiths/search?query=prayer&language=en&collection=sahih-bukhari&status=Sahih
```

### Dua Endpoints

#### Get All Duas
```http
GET /duas?category=daily
```

#### Get Duas by Category
```http
GET /duas/categories/morning
```

#### Search Duas
```http
GET /duas/search?query=sleep
```

### Prayer Times Endpoints

#### Get Prayer Times by Coordinates
```http
GET /prayer/times?latitude=21.4225&longitude=39.8262&date=2024-01-15
```

#### Get Prayer Times by City
```http
GET /prayer/times/city?city=Mecca&country=Saudi Arabia
```

#### Get Next Prayer
```http
GET /prayer/next?latitude=21.4225&longitude=39.8262
```

#### Get Qibla Direction
```http
GET /prayer/qibla?latitude=40.7128&longitude=-74.0060
```

### Bookmark Endpoints

#### Create Bookmark
```http
POST /bookmarks
Authorization: Bearer <token>
Content-Type: application/json

{
  "contentType": "quran",
  "contentId": "2:255",
  "note": "Ayatul Kursi"
}
```

#### Get User Bookmarks
```http
GET /bookmarks?contentType=quran
Authorization: Bearer <token>
```

#### Delete Bookmark
```http
DELETE /bookmarks/:id
Authorization: Bearer <token>
```

### AI Endpoints

#### Semantic Search
```http
GET /ai/search?query=verses about patience&contentType=quran&limit=10
```

#### Ask Question
```http
POST /ai/ask
Content-Type: application/json

{
  "question": "What does Islam say about patience?"
}
```

#### AI Chat
```http
POST /ai/chat
Content-Type: application/json

{
  "messages": [
    { "role": "user", "content": "Tell me about Surah Al-Fatiha" }
  ]
}
```

## 🔐 Authentication

The API uses JWT (JSON Web Tokens) for authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your_jwt_token>
```

Tokens expire after 7 days by default (configurable in `.env`).

## 📱 Push Notifications

The app supports push notifications for:
- Prayer time reminders (configurable minutes before)
- Morning dhikr reminders (6:00 AM)
- Evening dhikr reminders (6:00 PM)

Users can configure notification preferences through the `/auth/profile` endpoint.

## 🤖 AI Features

### Semantic Search
Uses OpenAI embeddings and Pinecone vector database to find relevant content based on meaning, not just keywords.

### AI Chat
Powered by GPT-4, provides intelligent answers to Islamic questions with citations from Quran and Hadith.

## 📊 Database Schema

### PostgreSQL Tables
- **users**: User accounts and preferences
- **bookmarks**: User bookmarks
- **prayer_times**: Cached prayer times

### MongoDB Collections
- **surahs**: Complete Quran with ayahs
- **hadiths**: Hadith collections
- **duas**: Supplications and dhikr

## 🔄 Cron Jobs

The following cron jobs run automatically in production:
- **Prayer Reminders**: Every minute (checks for upcoming prayers)
- **Morning Dhikr**: Daily at 6:00 AM
- **Evening Dhikr**: Daily at 6:00 PM
- **Prayer Times Update**: Daily at midnight

## 🧪 Testing

```bash
npm test
```

## 📝 Scripts

- `npm run dev`: Start development server
- `npm run build`: Build for production
- `npm start`: Start production server
- `npm run seed:quran`: Seed Quran data
- `npm run seed:hadiths`: Seed Hadith data
- `npm run seed:duas`: Seed Dua data
- `npm run seed:all`: Seed all data

## 🚀 Deployment

### Environment Variables
Ensure all production environment variables are set:
- Database URLs (PostgreSQL, MongoDB, Redis)
- API keys (OpenAI, Pinecone, Firebase)
- OAuth credentials
- CORS origins

### Recommended Hosting
- **Backend**: AWS EC2, DigitalOcean, Heroku, Railway
- **Databases**: 
  - PostgreSQL: AWS RDS, DigitalOcean Managed Database
  - MongoDB: MongoDB Atlas
  - Redis: Redis Cloud, AWS ElastiCache
- **Audio Files**: AWS S3, Cloudflare R2

## 📈 Performance Optimization

- **Redis Caching**: Frequently accessed data is cached
- **Database Indexing**: Optimized queries with proper indexes
- **Rate Limiting**: Prevents API abuse
- **Compression**: Gzip compression for responses
- **Connection Pooling**: Efficient database connections

## 🔒 Security Features

- **Helmet.js**: Security headers
- **Rate Limiting**: Prevents brute force attacks
- **Input Validation**: Validates all user inputs
- **JWT Authentication**: Secure token-based auth
- **CORS**: Configurable cross-origin requests
- **Password Hashing**: bcrypt for password security

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## 📄 License

MIT License

## 👥 Support

For issues and questions, please open an issue on GitHub.

## 🙏 Acknowledgments

- [Aladhan API](https://aladhan.com/) for prayer times
- [AlQuran Cloud API](https://api.alquran.cloud) for complete Quran data (114 Surahs, 6,236 Ayahs) with multiple editions
- [Fitrahive](https://github.com/fitrahive/dua-dhikr) for Dua collections
- [Hadith API](https://hadithapi.com) for comprehensive Hadith data (40,465+ hadiths)

## 📞 Contact

For questions or support, please contact the development team.

---

**May Allah accept this work and make it beneficial for the Ummah. Ameen.**

