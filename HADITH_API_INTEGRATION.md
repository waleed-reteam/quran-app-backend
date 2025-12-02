# Hadith API Integration

This document describes the integration with the Hadith API from [hadithapi.com](https://hadithapi.com).

## 🔗 API Integration

The backend now uses the Hadith API from `hadithapi.com` instead of storing hadiths in MongoDB. This provides:

- ✅ **40,465+ Hadiths** across 10 major collections
- ✅ **Real-time data** from the official API
- ✅ **Multiple languages**: English, Urdu, Arabic
- ✅ **Comprehensive search** capabilities
- ✅ **Automatic caching** for performance

## 📚 Available Collections

The API provides access to the following hadith collections:

1. **Sahih Bukhari** (7,276 hadiths, 99 chapters)
2. **Sahih Muslim** (7,564 hadiths, 56 chapters)
3. **Jami' Al-Tirmidhi** (3,956 hadiths, 50 chapters)
4. **Sunan Abu Dawood** (5,274 hadiths, 43 chapters)
5. **Sunan Ibn-e-Majah** (4,341 hadiths, 39 chapters)
6. **Sunan An-Nasa`i** (5,761 hadiths, 52 chapters)
7. **Mishkat Al-Masabih** (6,293 hadiths, 29 chapters)
8. **Musnad Ahmad** (14 chapters)
9. **Al-Silsila Sahiha** (28 chapters)

**Total: 40,465+ Hadiths**

## 🔌 API Endpoints

### Get All Collections (Books)

```http
GET /api/v1/hadiths/collections
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Sahih Bukhari",
      "slug": "sahih-bukhari",
      "writer": "Imam Bukhari",
      "writerDeath": "256 ہ",
      "hadithsCount": 7276,
      "chaptersCount": 99
    }
  ]
}
```

### Get Hadiths by Collection

```http
GET /api/v1/hadiths/collections/sahih-bukhari?page=1&limit=25
```

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 25)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "1",
      "collection": "sahih-bukhari",
      "book": "Sahih Bukhari",
      "bookNumber": 1,
      "hadithNumber": "1",
      "chapter": "Belief",
      "chapterNumber": 2,
      "arabicText": "...",
      "englishText": "The reward of deeds depends upon the intentions...",
      "urduText": "...",
      "narrator": "Narrated 'Umar bin Al-Khattab",
      "grade": "Sahih",
      "volume": "1"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 25,
    "total": 7276,
    "pages": 292,
    "from": 1,
    "to": 25
  }
}
```

### Get Chapters by Book

```http
GET /api/v1/hadiths/books/sahih-bukhari/chapters?paginate=50
```

**Query Parameters:**
- `paginate` (optional): Number of chapters to return

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "chapterNumber": "1",
      "chapterEnglish": "Revelation",
      "chapterUrdu": "وحی کا بیان میں",
      "chapterArabic": "كتاب الوحي",
      "bookSlug": "sahih-bukhari"
    }
  ],
  "count": 99
}
```

### Get Hadiths by Chapter

```http
GET /api/v1/hadiths/books/sahih-bukhari/chapters/2?page=1&limit=25
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "2",
      "collection": "sahih-bukhari",
      "chapter": "Belief",
      "englishText": "...",
      "grade": "Sahih"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 25,
    "total": 50,
    "pages": 2
  }
}
```

### Search Hadiths

```http
GET /api/v1/hadiths/search?query=prayer&language=en&collection=sahih-bukhari&page=1&limit=25
```

**Query Parameters:**
- `query` (required): Search term
- `language` (optional): `en`, `ur`, or `ar` (default: `en`)
- `collection` (optional): Book slug to filter by
- `status` (optional): `Sahih`, `Hasan`, or `Da`eef`
- `chapter` (optional): Chapter number
- `hadithNumber` (optional): Specific hadith number
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 25)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "123",
      "collection": "sahih-bukhari",
      "englishText": "...",
      "grade": "Sahih"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 25,
    "total": 150,
    "pages": 6
  }
}
```

### Get Hadith by ID

```http
GET /api/v1/hadiths/1
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "1",
    "collection": "sahih-bukhari",
    "book": "Sahih Bukhari",
    "hadithNumber": "1",
    "chapter": "Revelation",
    "arabicText": "...",
    "englishText": "The reward of deeds depends upon the intentions...",
    "urduText": "...",
    "narrator": "Narrated 'Umar bin Al-Khattab",
    "grade": "Sahih",
    "volume": "1",
    "bookInfo": {
      "id": 1,
      "name": "Sahih Bukhari",
      "writer": "Imam Bukhari"
    },
    "chapterInfo": {
      "id": 1,
      "number": "1",
      "english": "Revelation"
    }
  }
}
```

## 🔍 Search Examples

### Search in English
```bash
curl "http://localhost:5000/api/v1/hadiths/search?query=patience&language=en"
```

### Search in Urdu
```bash
curl "http://localhost:5000/api/v1/hadiths/search?query=صبر&language=ur"
```

### Search in Arabic
```bash
curl "http://localhost:5000/api/v1/hadiths/search?query=الصبر&language=ar"
```

### Search by Status
```bash
curl "http://localhost:5000/api/v1/hadiths/search?status=Sahih&collection=sahih-bukhari"
```

### Search by Hadith Number
```bash
curl "http://localhost:5000/api/v1/hadiths/search?hadithNumber=1&collection=sahih-bukhari"
```

### Search by Chapter
```bash
curl "http://localhost:5000/api/v1/hadiths/search?chapter=2&collection=sahih-bukhari"
```

## 📊 Book Slugs Reference

| Book | Slug |
|------|------|
| Sahih Bukhari | `sahih-bukhari` |
| Sahih Muslim | `sahih-muslim` |
| Jami' Al-Tirmidhi | `al-tirmidhi` |
| Sunan Abu Dawood | `abu-dawood` |
| Sunan Ibn-e-Majah | `ibn-e-majah` |
| Sunan An-Nasa`i | `sunan-nasai` |
| Mishkat Al-Masabih | `mishkat` |
| Musnad Ahmad | `musnad-ahmad` |
| Al-Silsila Sahiha | `al-silsila-sahiha` |

## ⚡ Performance & Caching

The Hadith API integration includes:

- **Redis Caching**: Frequently accessed data is cached
  - Books: 24 hours
  - Chapters: 12 hours
  - Hadiths: 1 hour (non-search queries)
  - Individual Hadith: 24 hours

- **Smart Caching**: Search queries are not cached to ensure fresh results

- **Error Handling**: Graceful fallbacks if API is unavailable

## 🔧 Configuration

Add the Hadith API key to your `.env` file:

```env
HADITH_API_KEY=$2y$10$unZvEIUjLokiEp5auSAYpe6uqmglNe17sOkYbSi62ibUEqVdPNyS
```

The default API key is included, but you can get your own from [hadithapi.com](https://hadithapi.com).

## 📱 Mobile App Integration

### Get All Collections
```javascript
const response = await fetch(`${API_BASE_URL}/hadiths/collections`);
const { data: collections } = await response.json();
```

### Get Hadiths from Collection
```javascript
const collection = 'sahih-bukhari';
const page = 1;
const response = await fetch(
  `${API_BASE_URL}/hadiths/collections/${collection}?page=${page}&limit=25`
);
const { data: hadiths, pagination } = await response.json();
```

### Search Hadiths
```javascript
const query = 'prayer';
const language = 'en';
const response = await fetch(
  `${API_BASE_URL}/hadiths/search?query=${encodeURIComponent(query)}&language=${language}`
);
const { data: results } = await response.json();
```

### Get Chapters
```javascript
const bookSlug = 'sahih-bukhari';
const response = await fetch(
  `${API_BASE_URL}/hadiths/books/${bookSlug}/chapters`
);
const { data: chapters } = await response.json();
```

### Get Hadiths by Chapter
```javascript
const bookSlug = 'sahih-bukhari';
const chapterNumber = '2';
const response = await fetch(
  `${API_BASE_URL}/hadiths/books/${bookSlug}/chapters/${chapterNumber}?page=1&limit=25`
);
const { data: hadiths } = await response.json();
```

## 🎯 Response Format

All hadith responses include:

- **id**: Hadith ID
- **collection**: Book slug
- **book**: Book name
- **bookNumber**: Book ID
- **hadithNumber**: Hadith number in the book
- **chapter**: Chapter name (English)
- **chapterNumber**: Chapter number
- **chapterUrdu**: Chapter name (Urdu)
- **chapterArabic**: Chapter name (Arabic)
- **arabicText**: Hadith text in Arabic
- **englishText**: Hadith text in English
- **urduText**: Hadith text in Urdu
- **narrator**: Narrator information
- **grade**: Hadith status (Sahih, Hasan, Da`eef)
- **volume**: Volume number
- **headingEnglish**: Chapter heading (English)
- **headingUrdu**: Chapter heading (Urdu)
- **bookInfo**: Complete book information
- **chapterInfo**: Complete chapter information

## 🔄 Migration Notes

If you were using the MongoDB-based hadith storage:

1. **No database migration needed** - The API is now used directly
2. **No seeding required** - Hadiths are fetched in real-time from the API
3. **Old seed script** - The `seedHadiths.ts` script now verifies API connection instead of seeding
4. **Caching** - Redis caching is automatically handled
5. **API Key** - Make sure to set `HADITH_API_KEY` in your `.env` file

## ✅ Verification

To verify the Hadith API is working correctly:

```bash
npm run verify:hadith-api
```

This will:
- Test the API connection
- List all available collections
- Show hadith counts for each collection
- Confirm the integration is ready

**No database seeding is needed for hadiths** - they are fetched directly from the API in real-time!

## 📚 Additional Resources

- **Hadith API Documentation**: [hadithapi.com](https://hadithapi.com)
- **API Examples**: See `API_EXAMPLES.md`
- **Mobile Integration**: See `MOBILE_APP_INTEGRATION.md`

---

**May this integration make accessing authentic Hadiths easier for the Ummah. Barakallahu feekum!** 🤲

