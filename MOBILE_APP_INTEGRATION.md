# Mobile App Integration Guide

Complete guide for integrating your mobile app (iOS/Android) with the Quran App Backend.

## 🎯 Overview

This backend provides a complete REST API for your Islamic mobile app with:
- Authentication (JWT, Google, Apple)
- Complete Quran with translations
- Hadiths and Duas
- Prayer times and reminders
- Bookmarks
- AI-powered search

## 🔗 API Base URL

```
Development: http://localhost:5000/api/v1
Production:  https://api.yourdomain.com/api/v1
```

## 🚀 Quick Integration Steps

### 1. Authentication Flow

#### Register New User
```javascript
// POST /auth/register
const response = await fetch(`${API_BASE_URL}/auth/register`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'SecurePass123!',
    name: 'John Doe'
  })
});

const data = await response.json();
// Save token and refreshToken to secure storage
const { token, refreshToken, user } = data.data;
```

#### Login
```javascript
// POST /auth/login
const response = await fetch(`${API_BASE_URL}/auth/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'SecurePass123!'
  })
});

const data = await response.json();
const { token, refreshToken, user } = data.data;
```

#### Google Sign-In
```javascript
// After getting Google ID token from Google Sign-In SDK
const response = await fetch(`${API_BASE_URL}/auth/google`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    idToken: googleIdToken,
    email: googleUser.email,
    name: googleUser.name,
    profilePicture: googleUser.photoUrl,
    providerId: googleUser.id
  })
});
```

#### Apple Sign-In
```javascript
// After getting Apple identity token
const response = await fetch(`${API_BASE_URL}/auth/apple`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    identityToken: appleIdToken,
    email: appleUser.email,
    name: appleUser.fullName,
    providerId: appleUser.user
  })
});
```

### 2. Making Authenticated Requests

```javascript
// Include JWT token in Authorization header
const response = await fetch(`${API_BASE_URL}/bookmarks`, {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});
```

### 3. Token Refresh

```javascript
// When token expires (7 days by default)
const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ refreshToken })
});

const data = await response.json();
const { token: newToken, refreshToken: newRefreshToken } = data.data;
```

## 📱 Core Features Integration

### Quran

#### Get All Surahs (for list view)
```javascript
const response = await fetch(`${API_BASE_URL}/quran/surahs`);
const data = await response.json();
const surahs = data.data; // Array of surahs without ayahs
```

#### Get Specific Surah with Ayahs
```javascript
const surahNumber = 1; // Al-Fatiha
const response = await fetch(`${API_BASE_URL}/quran/surahs/${surahNumber}`);
const data = await response.json();
const surah = data.data; // Includes all ayahs
```

#### Search Quran
```javascript
const query = 'patience';
const response = await fetch(
  `${API_BASE_URL}/quran/search?query=${encodeURIComponent(query)}&language=en`
);
const data = await response.json();
const results = data.data;
```

### Prayer Times

#### Get Today's Prayer Times
```javascript
const { latitude, longitude } = await getCurrentLocation();
const response = await fetch(
  `${API_BASE_URL}/prayer/times?latitude=${latitude}&longitude=${longitude}`
);
const data = await response.json();
const { timings } = data.data;
// timings: { Fajr, Dhuhr, Asr, Maghrib, Isha }
```

#### Get Next Prayer
```javascript
const response = await fetch(
  `${API_BASE_URL}/prayer/next?latitude=${latitude}&longitude=${longitude}`
);
const data = await response.json();
const { nextPrayer } = data.data;
// nextPrayer: { name, time, minutesUntil }
```

#### Get Qibla Direction
```javascript
const response = await fetch(
  `${API_BASE_URL}/prayer/qibla?latitude=${latitude}&longitude=${longitude}`
);
const data = await response.json();
const { direction } = data.data; // Degrees from North
```

### Duas

#### Get Duas by Category
```javascript
const category = 'morning'; // daily, after-salah, morning, evening, selected
const response = await fetch(`${API_BASE_URL}/duas/categories/${category}`);
const data = await response.json();
const duas = data.data;
```

### Hadiths

#### Get Hadiths from Collection
```javascript
const collection = 'sahih-bukhari';
const page = 1;
const response = await fetch(
  `${API_BASE_URL}/hadiths/collections/${collection}?page=${page}&limit=20`
);
const data = await response.json();
const { data: hadiths, pagination } = data;
```

### Bookmarks

#### Create Bookmark
```javascript
const response = await fetch(`${API_BASE_URL}/bookmarks`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    contentType: 'quran', // or 'hadith', 'dua'
    contentId: '2:255', // Ayatul Kursi
    note: 'My favorite verse'
  })
});
```

#### Get User Bookmarks
```javascript
const response = await fetch(`${API_BASE_URL}/bookmarks?contentType=quran`, {
  headers: { 'Authorization': `Bearer ${token}` }
});
const data = await response.json();
const bookmarks = data.data;
```

#### Check if Content is Bookmarked
```javascript
const response = await fetch(
  `${API_BASE_URL}/bookmarks/check?contentType=quran&contentId=2:255`,
  { headers: { 'Authorization': `Bearer ${token}` } }
);
const data = await response.json();
const { isBookmarked } = data.data;
```

### AI Search

#### Semantic Search
```javascript
const query = 'verses about gratitude';
const response = await fetch(
  `${API_BASE_URL}/ai/search?query=${encodeURIComponent(query)}&limit=5`
);
const data = await response.json();
const results = data.data; // Ranked by relevance
```

#### Ask Question
```javascript
const response = await fetch(`${API_BASE_URL}/ai/ask`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    question: 'What does Islam say about patience?'
  })
});
const data = await response.json();
const { answer, relevantContent } = data.data;
```

## 🔔 Push Notifications Setup

### 1. Get FCM Token (Firebase)

```javascript
// React Native example with @react-native-firebase/messaging
import messaging from '@react-native-firebase/messaging';

async function getFCMToken() {
  const token = await messaging().getToken();
  return token;
}
```

### 2. Send FCM Token to Backend

```javascript
const fcmToken = await getFCMToken();

await fetch(`${API_BASE_URL}/auth/fcm-token`, {
  method: 'PUT',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ fcmToken })
});
```

### 3. Configure Notification Preferences

```javascript
await fetch(`${API_BASE_URL}/auth/profile`, {
  method: 'PUT',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    prayerNotifications: true,
    reminderSettings: {
      fajr: true,
      dhuhr: true,
      asr: true,
      maghrib: true,
      isha: true,
      beforeMinutes: 15 // Notify 15 minutes before
    }
  })
});
```

### 4. Handle Incoming Notifications

```javascript
// React Native example
messaging().onMessage(async remoteMessage => {
  const { title, body } = remoteMessage.notification;
  const { type, prayerName } = remoteMessage.data;
  
  if (type === 'prayer_reminder') {
    // Show local notification or update UI
    showNotification(title, body);
  }
});
```

## 💾 Data Caching Strategy

### Recommended Caching

1. **Quran Data**: Cache entire Quran locally after first download
2. **Prayer Times**: Cache for current day, fetch next day's times
3. **Duas**: Cache all duas locally
4. **Hadiths**: Cache viewed hadiths
5. **Bookmarks**: Sync when online

### Example with AsyncStorage (React Native)

```javascript
import AsyncStorage from '@react-native-async-storage/async-storage';

// Cache Quran
async function cacheQuran(surahs) {
  await AsyncStorage.setItem('quran_data', JSON.stringify(surahs));
}

// Get cached Quran
async function getCachedQuran() {
  const data = await AsyncStorage.getItem('quran_data');
  return data ? JSON.parse(data) : null;
}

// Fetch with cache
async function fetchSurahs() {
  const cached = await getCachedQuran();
  if (cached) return cached;
  
  const response = await fetch(`${API_BASE_URL}/quran/surahs`);
  const data = await response.json();
  await cacheQuran(data.data);
  return data.data;
}
```

## 🔄 Offline Support

### Strategy

1. **Download on First Launch**:
   - Complete Quran
   - All Duas
   - Sample Hadiths

2. **Sync When Online**:
   - User bookmarks
   - Prayer times
   - User preferences

3. **Queue Actions**:
   - Queue bookmark creation/deletion
   - Sync when connection restored

### Example Implementation

```javascript
class OfflineQueue {
  constructor() {
    this.queue = [];
  }
  
  async addAction(action) {
    this.queue.push(action);
    await this.saveQueue();
    await this.processQueue();
  }
  
  async processQueue() {
    if (!navigator.onLine) return;
    
    while (this.queue.length > 0) {
      const action = this.queue[0];
      try {
        await this.executeAction(action);
        this.queue.shift();
        await this.saveQueue();
      } catch (error) {
        break; // Stop if request fails
      }
    }
  }
  
  async executeAction(action) {
    const { method, url, body, headers } = action;
    await fetch(url, { method, body, headers });
  }
  
  async saveQueue() {
    await AsyncStorage.setItem('offline_queue', JSON.stringify(this.queue));
  }
}
```

## 🎨 UI/UX Recommendations

### Loading States
```javascript
const [loading, setLoading] = useState(true);
const [data, setData] = useState(null);

useEffect(() => {
  fetchData();
}, []);

async function fetchData() {
  setLoading(true);
  try {
    const response = await fetch(`${API_BASE_URL}/quran/surahs`);
    const result = await response.json();
    setData(result.data);
  } catch (error) {
    // Handle error
  } finally {
    setLoading(false);
  }
}
```

### Error Handling
```javascript
async function fetchWithErrorHandling(url, options = {}) {
  try {
    const response = await fetch(url, options);
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.message);
    }
    
    return data;
  } catch (error) {
    if (error.message.includes('Network')) {
      showError('No internet connection');
    } else if (error.message.includes('401')) {
      // Token expired, refresh
      await refreshToken();
    } else {
      showError(error.message);
    }
    throw error;
  }
}
```

### Pagination
```javascript
const [page, setPage] = useState(1);
const [hadiths, setHadiths] = useState([]);
const [hasMore, setHasMore] = useState(true);

async function loadMore() {
  const response = await fetch(
    `${API_BASE_URL}/hadiths/collections/sahih-bukhari?page=${page}&limit=20`
  );
  const data = await response.json();
  
  setHadiths([...hadiths, ...data.data]);
  setPage(page + 1);
  setHasMore(page < data.pagination.pages);
}
```

## 🧪 Testing

### Test API Connection
```javascript
async function testConnection() {
  try {
    const response = await fetch(`${API_BASE_URL}/health`);
    const data = await response.json();
    console.log('API Status:', data.success ? 'OK' : 'Error');
  } catch (error) {
    console.error('API Connection Failed:', error);
  }
}
```

### Test Authentication
```javascript
async function testAuth() {
  // Register
  const registerRes = await fetch(`${API_BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'test@test.com',
      password: 'Test123!',
      name: 'Test User'
    })
  });
  
  const { token } = (await registerRes.json()).data;
  console.log('Token received:', !!token);
  
  // Test authenticated request
  const meRes = await fetch(`${API_BASE_URL}/auth/me`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
  const user = (await meRes.json()).data;
  console.log('User fetched:', user.email);
}
```

## 📊 Performance Tips

1. **Lazy Load Images**: Load Quran page images on demand
2. **Virtualized Lists**: Use FlatList/RecyclerView for long lists
3. **Debounce Search**: Delay search API calls
4. **Batch Requests**: Combine multiple requests when possible
5. **Compress Images**: Use optimized images for profiles

## 🔐 Security Best Practices

1. **Store Tokens Securely**: Use Keychain (iOS) / Keystore (Android)
2. **HTTPS Only**: Never use HTTP in production
3. **Validate Inputs**: Validate all user inputs
4. **Handle Errors Gracefully**: Don't expose sensitive info
5. **Logout on Token Expiry**: Clear all user data

## 📞 Support & Resources

- **API Documentation**: See `API_EXAMPLES.md`
- **Backend Setup**: See `SETUP.md`
- **Quick Reference**: See `QUICK_REFERENCE.md`

## 🎯 Next Steps

1. ✅ Setup authentication flow
2. ✅ Implement Quran reading feature
3. ✅ Add prayer times widget
4. ✅ Setup push notifications
5. ✅ Implement bookmarks
6. ✅ Add search functionality
7. ✅ Test offline mode
8. ✅ Deploy and test

---

**Happy coding! May Allah make this project successful. Barakallahu feekum! 🚀**

