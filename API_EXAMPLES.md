# API Usage Examples

Complete examples for all API endpoints with request/response samples.

## Authentication

### 1. Register New User

**Request:**
```bash
curl -X POST http://localhost:5000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "SecurePass123!",
    "name": "John Doe"
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "john@example.com",
      "name": "John Doe",
      "profilePicture": null
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### 2. Login

**Request:**
```bash
curl -X POST http://localhost:5000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "SecurePass123!"
  }'
```

### 3. Google Sign-In

**Request:**
```bash
curl -X POST http://localhost:5000/api/v1/auth/google \
  -H "Content-Type: application/json" \
  -d '{
    "idToken": "google_id_token_here",
    "email": "john@gmail.com",
    "name": "John Doe",
    "profilePicture": "https://lh3.googleusercontent.com/...",
    "providerId": "123456789"
  }'
```

### 4. Update Profile

**Request:**
```bash
curl -X PUT http://localhost:5000/api/v1/auth/profile \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "name": "John Updated",
    "language": "ar",
    "timezone": "Asia/Riyadh",
    "prayerNotifications": true,
    "reminderSettings": {
      "fajr": true,
      "dhuhr": true,
      "asr": true,
      "maghrib": true,
      "isha": true,
      "beforeMinutes": 15
    }
  }'
```

## Quran

### 1. Get All Surahs (List)

**Request:**
```bash
curl http://localhost:5000/api/v1/quran/surahs
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "...",
      "number": 1,
      "name": "Al-Fatihah",
      "nameArabic": "الفاتحة",
      "nameTranslation": "The Opening",
      "revelationType": "Meccan",
      "numberOfAyahs": 7
    },
    {
      "_id": "...",
      "number": 2,
      "name": "Al-Baqarah",
      "nameArabic": "البقرة",
      "nameTranslation": "The Cow",
      "revelationType": "Medinan",
      "numberOfAyahs": 286
    }
  ]
}
```

### 2. Get Specific Surah with Ayahs

**Request:**
```bash
curl http://localhost:5000/api/v1/quran/surahs/1
```

**Response:**
```json
{
  "success": true,
  "data": {
    "number": 1,
    "name": "Al-Fatihah",
    "nameArabic": "الفاتحة",
    "nameTranslation": "The Opening",
    "revelationType": "Meccan",
    "numberOfAyahs": 7,
    "ayahs": [
      {
        "number": 1,
        "numberInSurah": 1,
        "text": "In the name of Allah, the Entirely Merciful, the Especially Merciful.",
        "textArabic": "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ",
        "translation": "In the name of Allah, the Entirely Merciful, the Especially Merciful.",
        "juz": 1,
        "page": 1
      }
    ]
  }
}
```

### 3. Get Specific Ayah

**Request:**
```bash
curl http://localhost:5000/api/v1/quran/surahs/2/ayahs/255
```

**Response (Ayatul Kursi):**
```json
{
  "success": true,
  "data": {
    "number": 255,
    "numberInSurah": 255,
    "textArabic": "اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ...",
    "translation": "Allah - there is no deity except Him, the Ever-Living, the Sustainer of existence...",
    "juz": 3,
    "page": 42
  }
}
```

### 4. Search Quran

**Request:**
```bash
curl "http://localhost:5000/api/v1/quran/search?query=patience&language=en"
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "number": 2,
      "name": "Al-Baqarah",
      "nameArabic": "البقرة",
      "ayahs": [
        {
          "numberInSurah": 153,
          "textArabic": "يَا أَيُّهَا الَّذِينَ آمَنُوا اسْتَعِينُوا بِالصَّبْرِ وَالصَّلَاةِ",
          "translation": "O you who have believed, seek help through patience and prayer..."
        }
      ]
    }
  ],
  "count": 15
}
```

### 5. Get Juz (Para)

**Request:**
```bash
curl http://localhost:5000/api/v1/quran/juz/30
```

## Hadiths

### 1. Get All Collections

**Request:**
```bash
curl http://localhost:5000/api/v1/hadiths/collections
```

**Response:**
```json
{
  "success": true,
  "data": [
    "sahih-bukhari",
    "sahih-muslim",
    "sunan-abu-dawud",
    "jami-at-tirmidhi"
  ]
}
```

### 2. Get Hadiths from Collection

**Request:**
```bash
curl "http://localhost:5000/api/v1/hadiths/collections/sahih-bukhari?page=1&limit=10"
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "...",
      "collection": "sahih-bukhari",
      "book": "Revelation",
      "bookNumber": 1,
      "hadithNumber": "1",
      "chapter": "How the Divine Inspiration started",
      "arabicText": "إِنَّمَا الأَعْمَالُ بِالنِّيَّاتِ",
      "englishText": "The reward of deeds depends upon the intentions...",
      "narrator": "Umar bin Al-Khattab",
      "grade": "Sahih"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 7563,
    "pages": 757
  }
}
```

### 3. Search Hadiths

**Request:**
```bash
curl "http://localhost:5000/api/v1/hadiths/search?query=prayer&language=en&page=1&limit=5"
```

## Duas

### 1. Get All Categories

**Request:**
```bash
curl http://localhost:5000/api/v1/duas/categories
```

**Response:**
```json
{
  "success": true,
  "data": [
    "daily",
    "after-salah",
    "morning",
    "evening",
    "selected"
  ]
}
```

### 2. Get Duas by Category

**Request:**
```bash
curl http://localhost:5000/api/v1/duas/categories/morning
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "...",
      "title": "Morning Dhikr - Ayatul Kursi",
      "category": "morning",
      "arabic": "اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ...",
      "latin": "Allahu laa ilaaha illa huwal hayyul qayyum...",
      "translation": "Allah! There is no deity except Him, the Ever-Living, the Sustainer...",
      "benefits": "Whoever recites this in the morning will be protected until evening",
      "source": "Quran 2:255"
    }
  ],
  "count": 15
}
```

### 3. Search Duas

**Request:**
```bash
curl "http://localhost:5000/api/v1/duas/search?query=sleep&language=en"
```

## Prayer Times

### 1. Get Prayer Times by Coordinates

**Request:**
```bash
curl "http://localhost:5000/api/v1/prayer/times?latitude=21.4225&longitude=39.8262&date=2024-01-15"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "date": {
      "readable": "15 Jan 2024",
      "gregorian": {
        "date": "15-01-2024"
      },
      "hijri": {
        "date": "03-07-1445"
      }
    },
    "timings": {
      "Fajr": "05:45",
      "Sunrise": "07:05",
      "Dhuhr": "12:25",
      "Asr": "15:35",
      "Maghrib": "17:45",
      "Isha": "19:15"
    },
    "meta": {
      "timezone": "Asia/Riyadh"
    }
  }
}
```

### 2. Get Prayer Times by City

**Request:**
```bash
curl "http://localhost:5000/api/v1/prayer/times/city?city=Mecca&country=Saudi%20Arabia"
```

### 3. Get Next Prayer

**Request:**
```bash
curl "http://localhost:5000/api/v1/prayer/next?latitude=21.4225&longitude=39.8262"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "nextPrayer": {
      "name": "Dhuhr",
      "time": "12:25",
      "minutesUntil": 45
    },
    "allTimings": {
      "Fajr": "05:45",
      "Dhuhr": "12:25",
      "Asr": "15:35",
      "Maghrib": "17:45",
      "Isha": "19:15"
    }
  }
}
```

### 4. Get Qibla Direction

**Request:**
```bash
curl "http://localhost:5000/api/v1/prayer/qibla?latitude=40.7128&longitude=-74.0060"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "latitude": 40.7128,
    "longitude": -74.0060,
    "direction": 58.48
  }
}
```

## Bookmarks

### 1. Create Bookmark

**Request:**
```bash
curl -X POST http://localhost:5000/api/v1/bookmarks \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "contentType": "quran",
    "contentId": "2:255",
    "note": "Ayatul Kursi - for protection"
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "...",
    "userId": "...",
    "contentType": "quran",
    "contentId": "2:255",
    "note": "Ayatul Kursi - for protection",
    "createdAt": "2024-01-15T10:30:00.000Z"
  }
}
```

### 2. Get User Bookmarks

**Request:**
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:5000/api/v1/bookmarks?contentType=quran&page=1&limit=20"
```

### 3. Check if Content is Bookmarked

**Request:**
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:5000/api/v1/bookmarks/check?contentType=quran&contentId=2:255"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "isBookmarked": true,
    "bookmark": {
      "id": "...",
      "note": "Ayatul Kursi - for protection"
    }
  }
}
```

### 4. Delete Bookmark

**Request:**
```bash
curl -X DELETE http://localhost:5000/api/v1/bookmarks/BOOKMARK_ID \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## AI Features

### 1. Semantic Search

**Request:**
```bash
curl "http://localhost:5000/api/v1/ai/search?query=verses%20about%20gratitude&contentType=quran&limit=5"
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "score": 0.89,
      "contentType": "quran",
      "content": {
        "surahNumber": 14,
        "surahName": "Ibrahim",
        "numberInSurah": 7,
        "textArabic": "وَإِذْ تَأَذَّنَ رَبُّكُمْ لَئِن شَكَرْتُمْ لَأَزِيدَنَّكُمْ",
        "translation": "And [remember] when your Lord proclaimed, 'If you are grateful, I will surely increase you [in favor]...'"
      }
    }
  ],
  "count": 5
}
```

### 2. Ask Question

**Request:**
```bash
curl -X POST http://localhost:5000/api/v1/ai/ask \
  -H "Content-Type: application/json" \
  -d '{
    "question": "What does Islam say about patience during hardship?"
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "question": "What does Islam say about patience during hardship?",
    "answer": "Islam emphasizes patience (sabr) as a fundamental virtue, especially during times of hardship. The Quran states in Surah Al-Baqarah (2:153): 'O you who have believed, seek help through patience and prayer. Indeed, Allah is with the patient.' Additionally, Surah Al-Baqarah (2:155-157) mentions that believers will be tested with fear, hunger, and loss, but those who remain patient will receive blessings and mercy from Allah...",
    "relevantContent": [
      {
        "contentType": "quran",
        "content": {
          "surahName": "Al-Baqarah",
          "ayah": 153
        }
      }
    ]
  }
}
```

### 3. AI Chat

**Request:**
```bash
curl -X POST http://localhost:5000/api/v1/ai/chat \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {
        "role": "user",
        "content": "Tell me about the importance of Surah Al-Fatiha"
      }
    ]
  }'
```

## Error Responses

### 400 Bad Request
```json
{
  "success": false,
  "message": "Validation error: Email is required"
}
```

### 401 Unauthorized
```json
{
  "success": false,
  "message": "Not authorized to access this route"
}
```

### 404 Not Found
```json
{
  "success": false,
  "message": "Surah not found"
}
```

### 429 Too Many Requests
```json
{
  "success": false,
  "message": "Too many requests from this IP, please try again later."
}
```

### 500 Server Error
```json
{
  "success": false,
  "message": "Server error"
}
```

## Rate Limiting

- **General API**: 100 requests per 15 minutes
- **Authentication**: 5 requests per 15 minutes

## Pagination

Most list endpoints support pagination:
```
?page=1&limit=20
```

Response includes pagination info:
```json
{
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 286,
    "pages": 15
  }
}
```

---

**For more examples, check the Postman collection or test with the provided curl commands.**

