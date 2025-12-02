# Fallback Mechanism Documentation

## Overview

The application implements a robust fallback mechanism for Quran and Hadith data. When external APIs are unavailable, the system automatically falls back to data stored in MongoDB, ensuring continuous service availability.

## Architecture

### Data Flow

```
┌─────────────────┐
│   API Request   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Try API First  │
└────────┬────────┘
         │
    ┌────┴────┐
    │        │
    ▼        ▼
┌──────┐  ┌──────────┐
│ API  │  │  Failed  │
│ OK   │  │          │
└──┬───┘  └────┬─────┘
   │           │
   │           ▼
   │      ┌──────────┐
   │      │ Fallback │
   │      │   to     │
   │      │ MongoDB  │
   │      └────┬─────┘
   │           │
   └───────┬───┘
           │
           ▼
    ┌──────────┐
    │ Response │
    └──────────┘
```

## Implementation Details

### 1. Seeding Process

#### Quran Seeding (`seedQuran.ts`)

**Purpose:** Fetch Quran data from AlQuran Cloud API and store in MongoDB

**Process:**
1. Connects to MongoDB
2. Clears existing surahs
3. Fetches Arabic text from API
4. Fetches English translation from API
5. Fetches metadata (surah info)
6. Transforms and stores in MongoDB

**Usage:**
```bash
npm run seed:quran
```

**Data Stored:**
- All 114 surahs
- All 6,236 ayahs
- Arabic text
- English translation
- Metadata (juz, page, ruku, etc.)

#### Hadith Seeding (`seedHadiths.ts`)

**Purpose:** Fetch Hadith data from Hadith API and store in MongoDB

**Process:**
1. Connects to MongoDB
2. Clears existing hadiths
3. Fetches books/collections from API
4. Fetches hadiths from each collection
5. Transforms and stores in MongoDB

**Usage:**
```bash
npm run seed:hadiths
```

**Data Stored:**
- All hadith collections
- Hadiths from each collection (limited to avoid too many API calls)
- Arabic, English, and Urdu text
- Metadata (collection, book, chapter, grade, etc.)

### 2. Service Layer Fallback

#### Quran API Service (`quranApiService.ts`)

**Fallback Strategy:**
1. **Try API First:**
   - Makes API request with 5-second timeout
   - Caches successful responses in Redis
   - Returns API data if successful

2. **Fallback to Database:**
   - If API fails (timeout, error, etc.)
   - Queries MongoDB for data
   - Transforms MongoDB data to API format
   - Caches fallback data (shorter cache time)
   - Returns database data

**Functions with Fallback:**
- `getSurahsList()` - List of all surahs
- `getSurah()` - Get surah by number
- `getSurahMultipleEditions()` - Get surah in multiple editions
- `getAyah()` - Get ayah by reference
- `getAyahMultipleEditions()` - Get ayah in multiple editions
- `getJuz()` - Get juz
- `getPage()` - Get page
- `getManzil()` - Get manzil
- `getRuku()` - Get ruku
- `getHizbQuarter()` - Get hizb quarter
- `getSajdaAyahs()` - Get sajda ayahs
- `searchQuran()` - Search Quran text

**Example:**
```typescript
// Try API first
try {
  const response = await axios.get(`${QURAN_API_BASE}/surah/${surahNumber}`, {
    timeout: 5000
  });
  // Cache and return
} catch (apiError) {
  // Fallback to database
  const surah = await Surah.findOne({ number: surahNumber });
  // Transform and return
}
```

#### Hadith API Service (`hadithApiService.ts`)

**Fallback Strategy:**
1. **Try API First:**
   - Makes API request with 5-second timeout
   - Caches successful responses in Redis
   - Returns API data if successful

2. **Fallback to Database:**
   - If API fails (timeout, error, etc.)
   - Queries MongoDB for data
   - Transforms MongoDB data to API format
   - Caches fallback data (shorter cache time)
   - Returns database data

**Functions with Fallback:**
- `getBooks()` - List of all hadith collections
- `getChaptersByBook()` - Get chapters by book
- `getHadiths()` - Get hadiths with filters
- `getHadithById()` - Get hadith by ID

**Example:**
```typescript
// Try API first
try {
  const response = await axios.get(`${HADITH_API_BASE}/hadiths/`, {
    params: { ...filters },
    timeout: 5000
  });
  // Cache and return
} catch (apiError) {
  // Fallback to database
  const hadiths = await Hadith.find(query);
  // Transform and return
}
```

## Caching Strategy

### API Responses
- **Cache Duration:** 12-24 hours
- **Cache Key:** Based on request parameters
- **Purpose:** Reduce API calls, improve performance

### Fallback Data
- **Cache Duration:** 1 hour (shorter)
- **Cache Key:** Same as API cache key
- **Purpose:** Reduce database queries, but refresh more often

### Cache Invalidation
- Automatic expiration based on TTL
- Manual invalidation on data updates
- Redis handles cache management

## Error Handling

### API Failures
- **Timeout:** 5 seconds
- **Network Errors:** Caught and logged
- **API Errors:** Caught and logged
- **Fallback:** Automatic to database

### Database Failures
- **Connection Errors:** Logged and propagated
- **Query Errors:** Logged and handled gracefully
- **No Data:** Returns empty array/null

### Logging
- **API Failures:** Warn level
- **Fallback Activations:** Info level
- **Database Errors:** Error level

## Benefits

### 1. **Reliability**
- Service continues even if APIs are down
- No single point of failure
- Graceful degradation

### 2. **Performance**
- Faster responses from local database
- Reduced dependency on external APIs
- Better user experience

### 3. **Offline Capability**
- Works without internet connection
- Local data always available
- Reduced bandwidth usage

### 4. **Cost Efficiency**
- Fewer API calls
- Reduced external API dependency
- Lower operational costs

## Usage

### Initial Setup

1. **Seed Database:**
   ```bash
   # Seed all data
   npm run seed:all
   
   # Or seed individually
   npm run seed:quran
   npm run seed:hadiths
   npm run seed:duas
   ```

2. **Verify Seeding:**
   ```bash
   # Check data in MongoDB
   # Or use verification scripts
   npm run verify:quran-api
   npm run verify:hadith-api
   ```

### Regular Updates

**Recommended:** Run seeding scripts periodically to keep data fresh:

```bash
# Daily or weekly
npm run seed:quran
npm run seed:hadiths
```

### Monitoring

**Check Logs:**
- Look for "falling back to database" messages
- Monitor API failure rates
- Track fallback usage

**Metrics to Watch:**
- API success rate
- Fallback activation frequency
- Database query performance
- Cache hit rates

## Configuration

### Environment Variables

```env
# MongoDB
MONGODB_URI=mongodb://localhost:27017/quran_app

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# APIs
ALQURAN_API_URL=https://api.alquran.cloud/v1
HADITH_API_KEY=your_api_key
```

### Timeout Settings

**API Timeout:** 5 seconds (configurable in service files)

**Cache TTL:**
- API responses: 12-24 hours
- Fallback data: 1 hour

## Troubleshooting

### Issue: Fallback Not Working

**Check:**
1. MongoDB connection
2. Data exists in database
3. Service layer error handling
4. Logs for errors

**Solution:**
- Verify MongoDB is running
- Run seeding scripts
- Check service code
- Review error logs

### Issue: Stale Data

**Check:**
1. Last seeding time
2. Cache expiration
3. Data freshness

**Solution:**
- Re-run seeding scripts
- Clear Redis cache
- Update cache TTL

### Issue: Performance Issues

**Check:**
1. Database indexes
2. Cache hit rates
3. Query optimization

**Solution:**
- Add database indexes
- Increase cache duration
- Optimize queries

## Best Practices

1. **Regular Seeding:**
   - Run seeding scripts periodically
   - Keep data fresh and up-to-date
   - Monitor data changes

2. **Cache Management:**
   - Use appropriate cache TTLs
   - Monitor cache hit rates
   - Clear cache when needed

3. **Error Monitoring:**
   - Track API failures
   - Monitor fallback activations
   - Alert on high failure rates

4. **Performance Optimization:**
   - Add database indexes
   - Optimize queries
   - Use connection pooling

5. **Testing:**
   - Test fallback mechanisms
   - Verify data consistency
   - Load test with fallback

## Summary

The fallback mechanism ensures:
- ✅ **Reliability:** Service continues even if APIs fail
- ✅ **Performance:** Faster responses from local database
- ✅ **Offline Capability:** Works without internet
- ✅ **Cost Efficiency:** Reduced API dependency

**All functionality is preserved with automatic fallback to database when APIs are unavailable!** 🎉

