# Quran API Integration

This document describes the integration with the AlQuran Cloud API from [api.alquran.cloud](https://api.alquran.cloud).

## 🔗 API Integration

The backend now uses the AlQuran Cloud API instead of storing Quran in MongoDB. This provides:

- ✅ **Complete Quran** (114 Surahs, 6,236 Ayahs)
- ✅ **Multiple editions**: Arabic text, English translations, audio recitations
- ✅ **Real-time data** from the official API
- ✅ **Multiple formats**: Text, translations, audio
- ✅ **Automatic caching** for performance

## 📚 Available Editions

The API provides access to multiple editions:

### Text Editions
- **quran-uthmani**: Arabic text (default)
- **en.asad**: Muhammad Asad's English translation (default English)
- **en.pickthall**: Marmaduke Pickthall's translation
- **en.sahih**: Sahih International translation
- And many more...

### Audio Editions
- **ar.alafasy**: Mishary Alafasy's recitation (default audio)
- **ar.abdulbasitmurattal**: Abdul Basit Murattal
- And many more...

## 🔌 API Endpoints

### Get All Surahs (List)

```http
GET /api/v1/quran/surahs
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "number": 1,
      "name": "سُورَةُ ٱلْفَاتِحَةِ",
      "englishName": "Al-Faatiha",
      "englishNameTranslation": "The Opening",
      "revelationType": "Meccan"
    }
  ]
}
```

### Get Surah by Number

```http
GET /api/v1/quran/surahs/1?edition=en.asad
```

**Query Parameters:**
- `edition` (optional): Edition identifier (default: `quran-uthmani`)
- `editions` (optional): Multiple editions separated by comma

**Response:**
```json
{
  "success": true,
  "data": {
    "number": 1,
    "name": "سُورَةُ ٱلْفَاتِحَةِ",
    "englishName": "Al-Faatiha",
    "ayahs": [
      {
        "number": 1,
        "text": "In the name of God, The Most Gracious...",
        "numberInSurah": 1,
        "juz": 1,
        "page": 1
      }
    ]
  }
}
```

### Get Surah with Multiple Editions

```http
GET /api/v1/quran/surahs/1?editions=quran-uthmani,en.asad,ar.alafasy
```

Returns the surah in Arabic, English translation, and audio edition.

### Get Ayah by Reference

```http
GET /api/v1/quran/ayahs/2:255?edition=en.asad
```

**Reference formats:**
- `2:255` - Surah 2, Ayah 255 (Ayatul Kursi)
- `262` - Ayah number 262

**Response:**
```json
{
  "success": true,
  "data": {
    "number": 255,
    "text": "Allah! There is no deity except Him...",
    "numberInSurah": 255,
    "juz": 3,
    "page": 42
  }
}
```

### Get Ayah with Multiple Editions

```http
GET /api/v1/quran/ayahs/2:255?editions=quran-uthmani,en.asad,ar.alafasy
```

### Search Quran

```http
GET /api/v1/quran/search?query=mercy&surah=all&edition=en.asad
```

**Query Parameters:**
- `query` (required): Search keyword
- `surah` (optional): Surah number (1-114) or 'all' (default: 'all')
- `edition` (optional): Edition identifier
- `language` (optional): Language code (e.g., 'en', 'ar')

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "number": 1,
      "text": "...",
      "numberInSurah": 1
    }
  ],
  "count": 50
}
```

### Get Juz (Para)

```http
GET /api/v1/quran/juz/30?edition=en.asad
```

**Query Parameters:**
- `edition` (optional): Edition identifier
- `offset` (optional): Offset ayahs
- `limit` (optional): Limit number of ayahs

### Get Page

```http
GET /api/v1/quran/page/1?edition=quran-uthmani
```

**Query Parameters:**
- `edition` (optional): Edition identifier
- `offset` (optional): Offset ayahs
- `limit` (optional): Limit number of ayahs

### Get Manzil

```http
GET /api/v1/quran/manzil/7?edition=en.asad
```

The Quran has 7 Manzils (for weekly reading).

### Get Ruku

```http
GET /api/v1/quran/ruku/1?edition=quran-uthmani
```

The Quran has 556 Rukus.

### Get Hizb Quarter

```http
GET /api/v1/quran/hizb/1?edition=quran-uthmani
```

The Quran has 240 Hizb Quarters.

### Get Sajda Ayahs

```http
GET /api/v1/quran/sajda?edition=quran-uthmani
```

Returns all ayahs that require prostration (Sajda).

### Get Meta Data

```http
GET /api/v1/quran/meta
```

Returns metadata about Surahs, Pages, Hizbs, and Juzs.

### Get Available Editions

```http
GET /api/v1/quran/editions?format=text&language=en&type=translation
```

**Query Parameters:**
- `format` (optional): 'text' or 'audio'
- `language` (optional): Language code (e.g., 'en', 'ar')
- `type` (optional): Edition type (e.g., 'translation', 'tafsir')

### Get Default Editions

```http
GET /api/v1/quran/editions/default
```

**Response:**
```json
{
  "success": true,
  "data": {
    "arabic": "quran-uthmani",
    "english": "en.asad",
    "audio": "ar.alafasy"
  }
}
```

## 📊 Edition Examples

### Arabic Text
```bash
GET /api/v1/quran/surahs/1?edition=quran-uthmani
```

### English Translation
```bash
GET /api/v1/quran/surahs/1?edition=en.asad
```

### Audio with Text
```bash
GET /api/v1/quran/surahs/1?edition=ar.alafasy
```

Response includes:
- `text`: Arabic text
- `audio`: Primary audio URL
- `audioSecondary`: Secondary audio URLs (different quality)

## ⚡ Performance & Caching

The Quran API integration includes:

- **Redis Caching**: Frequently accessed data is cached
  - Surahs list: 24 hours
  - Individual surahs: 12 hours
  - Ayahs: 24 hours
  - Juz/Page/Manzil: 12 hours
  - Meta data: 24 hours
  - Editions: 24 hours

- **Smart Caching**: Search queries are not cached to ensure fresh results

- **Error Handling**: Graceful fallbacks if API is unavailable

## 🔧 Configuration

No API key required! The AlQuran Cloud API is free and open.

## 📱 Mobile App Integration

### Get All Surahs
```javascript
const response = await fetch(`${API_BASE_URL}/quran/surahs`);
const { data: surahs } = await response.json();
```

### Get Surah with Translation
```javascript
const surahNumber = 1;
const edition = 'en.asad'; // English translation
const response = await fetch(
  `${API_BASE_URL}/quran/surahs/${surahNumber}?edition=${edition}`
);
const { data: surah } = await response.json();
```

### Get Surah with Audio
```javascript
const surahNumber = 1;
const edition = 'ar.alafasy'; // Audio edition
const response = await fetch(
  `${API_BASE_URL}/quran/surahs/${surahNumber}?edition=${edition}`
);
const { data: surah } = await response.json();
// surah.ayahs[0].audio contains the audio URL
```

### Get Multiple Editions at Once
```javascript
const surahNumber = 1;
const editions = 'quran-uthmani,en.asad,ar.alafasy';
const response = await fetch(
  `${API_BASE_URL}/quran/surahs/${surahNumber}?editions=${editions}`
);
const { data } = await response.json();
// data contains: { 'quran-uthmani': {...}, 'en.asad': {...}, 'ar.alafasy': {...} }
```

### Search Quran
```javascript
const query = 'mercy';
const response = await fetch(
  `${API_BASE_URL}/quran/search?query=${encodeURIComponent(query)}&edition=en.asad`
);
const { data: results } = await response.json();
```

### Get Ayah (Ayatul Kursi)
```javascript
const reference = '2:255';
const edition = 'en.asad';
const response = await fetch(
  `${API_BASE_URL}/quran/ayahs/${reference}?edition=${edition}`
);
const { data: ayah } = await response.json();
```

## 🎯 Response Format

All ayah responses include:

- **number**: Global ayah number
- **text**: Ayah text (Arabic or translation)
- **numberInSurah**: Ayah number within the surah
- **juz**: Juz number (1-30)
- **manzil**: Manzil number (1-7)
- **page**: Page number (1-604)
- **ruku**: Ruku number (1-556)
- **hizbQuarter**: Hizb quarter number (1-240)
- **sajda**: Boolean indicating if prostration is required
- **audio**: Audio URL (if audio edition)
- **audioSecondary**: Secondary audio URLs (if audio edition)

## 🔄 Migration Notes

If you were using the MongoDB-based Quran storage:

1. **No database migration needed** - The API is now used directly
2. **No seeding required** - Quran is fetched in real-time from the API
3. **Old seed script** - The `seedQuran.ts` script now verifies API connection instead of seeding
4. **Caching** - Redis caching is automatically handled
5. **Multiple editions** - Now supports multiple translations and audio recitations

## ✅ Verification

To verify the Quran API is working correctly:

```bash
npm run verify:quran-api
```

This will:
- Test the API connection
- List all 114 surahs
- Show default editions
- Confirm the integration is ready

**No database seeding is needed for Quran** - it is fetched directly from the API in real-time!

## 📚 Additional Resources

- **Quran API Documentation**: [api.alquran.cloud](https://api.alquran.cloud)
- **API Examples**: See `API_EXAMPLES.md`
- **Mobile Integration**: See `MOBILE_APP_INTEGRATION.md`

---

**May this integration make accessing the Holy Quran easier for the Ummah. Barakallahu feekum!** 🤲

