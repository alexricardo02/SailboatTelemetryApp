# Sailboat Telemetry Dashboard & Watchdog

A full-stack Next.js 14+ (App Router, TypeScript) IoT monitoring station and watchdog dashboard designed for private single-user remote boat monitoring.

## Tech Stack

- **Framework**: Next.js 14 (App Router, Server-side Route Handlers)
- **Language**: TypeScript
- **Database**: Firebase Admin SDK (Firestore Server-side) + In-Memory Fallback
- **Auth**: NextAuth.js Credentials provider with bcrypt hash verification
- **Rate Limiting**: `@upstash/ratelimit` with Redis and sliding-window in-memory fallback
- **Charts**: Recharts & Lucide Icons
- **Styling**: Tailwind CSS with custom Red Night theme & Space Tech / HUD Design System

---

## Overview

![Sailboat Telemetry Dashboard Overview](./app.png)

---

## Key Features

1. **Live Station Overview**: Real-time cabin temperature, relative humidity, bilge water float switch status, and sensor health with live "time ago" ticker.
2. **Dead Man's Switch / Connection Watchdog**: Tracks reporting intervals based on the active mode (e.g. every 8h). If two consecutive expected transmissions are missed, a prominent "Link Lost / Possible Dead Battery" alert is triggered.
3. **Dew Point & Condensation / Mold Alert**: Calculates the saturation dew point using the Magnus-Tetens formula. If cabin temperature drops within 2.0°C of the dew point, a mold/condensation warning is triggered.
4. **Preservation Traffic Light Indicator**: Green / Yellow / Red indicator based on sustained relative humidity levels to protect stored sails, upholstery, and electronics.
5. **Bilge Pump Activation Log & Frequency Chart**: Append-only log of every bilge float switch trigger with editable notes (e.g. "rainstorm runoff") and a daily frequency chart to spot weather/packing gland patterns.
6. **Graceful Battery Autonomy Support**: Designed to handle missing/null voltage gracefully while providing full UI and discharge curve modeling for future voltage divider hardware upgrades.
7. **Downlink Command Queue**: Configure the ESP32 mode from the dashboard (Normal 3x/day, Navigation 1h, Winter Storage 24h). Queued commands are picked up by the ESP32 on its next wake cycle.
8. **Cockpit Red Night Vision Theme**: Pure `#000000` black with red-only `#ef4444` accents designed for reading in the cockpit at night without impairing night vision.
9. **Mobile-First Responsive PWA**: Optimized for narrow mobile screens with high contrast for outdoor sunlight readability.

## Environment Variables Setup

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

| Variable | Description | Default / Example |
|---|---|---|
| `AUTH_USERNAME` | Single-user dashboard login username | `skipper` |
| `AUTH_PASSWORD_HASH` | Bcrypt hash of password (NEVER plaintext) | (Pre-set for `father2024`) |
| `NEXTAUTH_SECRET` | 32+ char secret for JWT session encryption | Generate via `openssl rand -base64 32` |
| `NEXTAUTH_URL` | Application root URL | `http://localhost:3000` or production URL |
| `DEVICE_API_KEY` | Secret key checked on `x-api-key` header | `sailboat-dev-device-key-2024` |
| `FIREBASE_PROJECT_ID` | GCP / Firebase Project ID | `your-firebase-project` |
| `FIREBASE_CLIENT_EMAIL` | Firebase Admin service account email | `firebase-adminsdk@...` |
| `FIREBASE_PRIVATE_KEY` | Firebase Admin private key | `-----BEGIN PRIVATE KEY-----\n...` |
| `UPSTASH_REDIS_REST_URL` | Upstash Redis REST URL (optional) | `https://...upstash.io` |
| `UPSTASH_REDIS_REST_TOKEN`| Upstash Redis REST token (optional) | `your-token` |
| `CRON_SECRET` | Secret Bearer token for watchdog cron | `your-cron-secret` |

Generating a new password hash:
```bash
node -e "console.log(require('bcryptjs').hashSync('your_new_password', 10))"
```

---

## Quick Start & Local Preview

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Seed realistic mock telemetry data (7 days)**:
   ```bash
   npm run seed
   ```

3. **Start local development server**:
   ```bash
   npm run dev
   ```

4. **Log in**:
   - URL: `http://localhost:3000/login`
   - Username: `skipper`
   - Password: `father2024`

---

## ESP32 Hardware & Firmware Guide

### 1. Wiring Diagram

- **ESP32 DevKit V1** (or ESP32-C3 / S3)
- **HTU21D (GY-21) I2C Sensor**:
  - `VCC` -> `3.3V`
  - `GND` -> `GND`
  - `SDA` -> `GPIO 21`
  - `SCL` -> `GPIO 22`
- **Bilge Float Switch**:
  - One lead to `GND`, other lead to `GPIO 4` (with internal `INPUT_PULLUP`). When water lifts the float, circuit closes to GND (`LOW`).

### 2. ESP32 Arduino / C++ Firmware Snippet

```cpp
#include <WiFi.h>
#include <HTTPClient.h>
#include <Wire.h>
#include <Adafruit_HTU21DF.h>
#include <ArduinoJson.h>

const char* ssid = "YOUR_CELLULAR_OR_MARINA_WIFI";
const char* password = "YOUR_WIFI_PASSWORD";
const char* telemetryUrl = "https://your-domain.com/api/telemetry";
const char* commandsUrl = "https://your-domain.com/api/commands";
const char* apiKey = "sailboat-dev-device-key-2024";

#define BILGE_PIN 4
#define DEFAULT_SLEEP_MINUTES 480 // 8 hours

Adafruit_HTU21DF htu = Adafruit_HTU21DF();
RTC_DATA_ATTR int sleepMinutes = DEFAULT_SLEEP_MINUTES;

void setup() {
  Serial.begin(115200);
  pinMode(BILGE_PIN, INPUT_PULLUP);
  
  bool sensorOk = htu.begin();
  float temp = sensorOk ? htu.readTemperature() : -999.0;
  float humid = sensorOk ? htu.readHumidity() : -1.0;
  bool bilgeAlert = (digitalRead(BILGE_PIN) == LOW);

  // Connect WiFi
  WiFi.begin(ssid, password);
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;

    // 1. POST /api/telemetry
    http.begin(telemetryUrl);
    http.addHeader("Content-Type", "application/json");
    http.addHeader("x-api-key", apiKey);

    StaticJsonDocument<256> doc;
    doc["temperature"] = temp;
    doc["humidity"] = humid;
    doc["bilgeAlert"] = bilgeAlert;
    doc["sensorOk"] = sensorOk;

    String requestBody;
    serializeJson(doc, requestBody);
    http.POST(requestBody);
    http.end();

    // 2. GET /api/commands (Fetch downlink config)
    http.begin(commandsUrl);
    http.addHeader("x-api-key", apiKey);
    int httpCode = http.GET();
    if (httpCode == 200) {
      String payload = http.getString();
      StaticJsonDocument<256> cmdDoc;
      deserializeJson(cmdDoc, payload);
      if (cmdDoc.containsKey("reportIntervalMinutes")) {
        sleepMinutes = cmdDoc["reportIntervalMinutes"];
      }
    }
    http.end();
  }

  // Configure Deep Sleep & Wake on Bilge Float Switch
  esp_sleep_enable_ext0_wakeup((gpio_num_t)BILGE_PIN, 0); // Wake on float switch LOW
  esp_sleep_enable_timer_wakeup((uint64_t)sleepMinutes * 60 * 1000000ULL);
  esp_deep_sleep_start();
}

void loop() {}
```

---

## Security Architecture

1. **Zero Client Secrets**: The Firebase Admin SDK runs strictly server-side in Next.js Route Handlers. Direct Firestore client access is locked down by `firestore.rules`.
2. **Device Authentication**: ESP32 endpoints require the `x-api-key` header with constant-time check and generic 401 errors.
3. **Zod Validation**: All external payloads are strictly validated, rejecting unknown fields and malformed structures.
4. **Multi-tier Rate Limiting**:
   - `POST /api/telemetry`: Max 1 request per 2 min.
   - `GET /api/commands`: Max 1 request per 1 min.
   - `POST /api/commands`: Max 10 requests per 1 min.
   - `POST /api/auth/callback/credentials`: Max 5 attempts per 15 min with IP lockout.
5. **Security Headers**: HSTS, CSP, X-Frame-Options (`DENY`), X-Content-Type-Options (`nosniff`), Referrer-Policy.

