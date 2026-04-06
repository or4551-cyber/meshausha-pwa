# 📧 הגדרת Gmail API למשאוושה

## שלב 1: יצירת Google Cloud Project

### 1.1 כניסה ל-Google Cloud Console
1. היכנס ל-[Google Cloud Console](https://console.cloud.google.com/)
2. לחץ על **"Select a project"** בפינה השמאלית העליונה
3. לחץ על **"NEW PROJECT"**
4. שם הפרויקט: `Meshausha Invoice System`
5. לחץ **CREATE**

### 1.2 הפעלת Gmail API
1. בתפריט הצד, לחץ על **"APIs & Services"** → **"Library"**
2. חפש **"Gmail API"**
3. לחץ על **Gmail API**
4. לחץ **ENABLE**

---

## שלב 2: יצירת OAuth 2.0 Credentials

### 2.1 הגדרת OAuth Consent Screen
1. לך ל-**"APIs & Services"** → **"OAuth consent screen"**
2. בחר **"External"** (אלא אם יש לך Google Workspace)
3. לחץ **CREATE**
4. מלא את הפרטים:
   - **App name:** Meshausha Invoice System
   - **User support email:** המייל שלך
   - **Developer contact:** המייל שלך
5. לחץ **SAVE AND CONTINUE**
6. ב-**Scopes**, לחץ **ADD OR REMOVE SCOPES**
7. חפש והוסף:
   - `https://www.googleapis.com/auth/gmail.readonly`
   - `https://www.googleapis.com/auth/gmail.modify`
8. לחץ **SAVE AND CONTINUE**
9. ב-**Test users**, הוסף את המייל שלך
10. לחץ **SAVE AND CONTINUE**

### 2.2 יצירת OAuth Client ID
1. לך ל-**"APIs & Services"** → **"Credentials"**
2. לחץ **"+ CREATE CREDENTIALS"** → **"OAuth client ID"**
3. **Application type:** Web application
4. **Name:** Meshausha Web Client
5. **Authorized JavaScript origins:**
   - `http://localhost:5173` (לפיתוח)
   - `https://meshaushapp.netlify.app` (לפרודקשן)
6. **Authorized redirect URIs:**
   - `http://localhost:5173/admin/gmail-callback`
   - `https://meshaushapp.netlify.app/admin/gmail-callback`
7. לחץ **CREATE**
8. **שמור את ה-Client ID ו-Client Secret!**

---

## שלב 3: יצירת Service Account (לבדיקות אוטומטיות)

### 3.1 יצירת Service Account
1. לך ל-**"APIs & Services"** → **"Credentials"**
2. לחץ **"+ CREATE CREDENTIALS"** → **"Service account"**
3. **Service account name:** meshausha-gmail-checker
4. **Service account ID:** meshausha-gmail-checker
5. לחץ **CREATE AND CONTINUE**
6. **Role:** בחר **"Project"** → **"Editor"**
7. לחץ **CONTINUE** → **DONE**

### 3.2 יצירת JSON Key
1. לחץ על ה-Service Account שיצרת
2. לך ל-**"KEYS"** tab
3. לחץ **"ADD KEY"** → **"Create new key"**
4. בחר **JSON**
5. לחץ **CREATE**
6. **הקובץ יורד אוטומטית - שמור אותו במקום בטוח!**

---

## שלב 4: הגדרת Environment Variables ב-Netlify

### 4.1 כניסה ל-Netlify Dashboard
1. היכנס ל-[Netlify](https://app.netlify.com/)
2. בחר את הפרויקט **meshaushapp**
3. לך ל-**"Site settings"** → **"Environment variables"**

### 4.2 הוספת המשתנים
לחץ **"Add a variable"** והוסף:

```
GOOGLE_CLIENT_ID=<Client ID מהשלב 2.2>
GOOGLE_CLIENT_SECRET=<Client Secret מהשלב 2.2>
GOOGLE_SERVICE_ACCOUNT_EMAIL=meshausha-gmail-checker@<project-id>.iam.gserviceaccount.com
GOOGLE_SERVICE_ACCOUNT_KEY=<תוכן הקובץ JSON מהשלב 3.2 - כל התוכן בשורה אחת>
```

**חשוב:** ב-`GOOGLE_SERVICE_ACCOUNT_KEY` העתק את **כל** תוכן קובץ ה-JSON (כולל הסוגריים המסולסלים).

---

## שלב 5: הגדרת Gmail Filters (אופציונלי)

כדי שהמערכת תזהה חשבוניות בקלות:

1. פתח Gmail
2. לחץ על ההגדרות (גלגל שיניים) → **"See all settings"**
3. לך ל-**"Filters and Blocked Addresses"**
4. לחץ **"Create a new filter"**
5. **From:** כתובת המייל של הספק
6. **Subject:** "חשבונית" או "Invoice"
7. לחץ **"Create filter"**
8. בחר **"Apply the label:"** → **"New label"** → `Invoices`
9. לחץ **"Create filter"**

חזור על זה לכל ספק.

---

## שלב 6: בדיקה

אחרי שהקוד יועלה, תוכל לבדוק:

1. היכנס לאדמין
2. לך ל-**"Gmail Settings"**
3. לחץ **"Connect Gmail"**
4. אשר את ההרשאות
5. לחץ **"Check for Invoices"**
6. המערכת תמשוך מיילים אוטומטית!

---

## ⚠️ אבטחה

**אל תשתף:**
- ❌ Client Secret
- ❌ Service Account JSON
- ❌ Access Tokens

**כל המידע הזה צריך להישאר ב-Netlify Environment Variables בלבד!**

---

## 🆘 פתרון בעיות

### "Access blocked: This app's request is invalid"
- ודא שהוספת את המייל שלך ל-Test users ב-OAuth consent screen

### "Invalid grant"
- ה-Redirect URI לא תואם - ודא שהוא מוגדר נכון ב-Google Cloud Console

### "Insufficient Permission"
- ודא שהוספת את ה-Scopes הנכונים (gmail.readonly, gmail.modify)

---

**המדריך מוכן! עכשיו אני בונה את הקוד...**
