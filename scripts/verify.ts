import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

import { calculateDewPoint, getComfortMetrics, getBatteryMetrics, calculateWatchdogStatus } from '../src/lib/utils';
import { TelemetryPayloadSchema, CommandUpdateSchema } from '../src/lib/validation';

async function runTests() {
  console.log('🧪 Starting Full System Verification Suite...\n');
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`  ✅ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${testName}`);
      failed++;
    }
  }

  // 1. Magnus-Tetens Dew Point Tests
  console.log('1. Psychrometric & Dew Point Verification:');
  const dp1 = calculateDewPoint(20, 50); // Standard room: 20C, 50% RH -> ~9.3C
  assert(dp1 !== null && dp1 >= 9.0 && dp1 <= 9.6, `Dew Point 20°C / 50% RH = ${dp1}°C (Expected ~9.3°C)`);

  const dp2 = calculateDewPoint(15, 90); // High humidity marina night: 15C, 90% RH -> ~13.4C
  assert(dp2 !== null && dp2 >= 13.0 && dp2 <= 13.8, `Dew Point 15°C / 90% RH = ${dp2}°C (Expected ~13.4°C)`);

  // Sensor failure handling
  const dpFail = calculateDewPoint(-999, -1);
  assert(dpFail === null, 'Sensor failure (-999, -1) returns null dew point');

  // 2. Condensation / Mold Alert Margin Tests
  console.log('\n2. Mold / Condensation Risk Warning:');
  const comfortRisk = getComfortMetrics(14.0, 92); // Dew point will be ~12.7°C, margin 1.3°C <= 2.0°C
  assert(comfortRisk.isCondensationRisk === true, 'Triggers condensation warning when cabin temp is within 2°C of dew point');

  const comfortSafe = getComfortMetrics(22.0, 45);
  assert(comfortSafe.isCondensationRisk === false, 'Safe margin when cabin temp is well above dew point');

  // 3. Humidity Traffic Light Indicator Tests
  console.log('\n3. Sustained Humidity Traffic Light Indicator:');
  assert(getComfortMetrics(20, 80).humidityStatus === 'red', 'Humidity > 75% triggers RED traffic light');
  assert(getComfortMetrics(20, 70).humidityStatus === 'yellow', 'Humidity 65-75% triggers YELLOW traffic light');
  assert(getComfortMetrics(20, 55).humidityStatus === 'green', 'Humidity < 65% triggers GREEN traffic light');

  // 4. Dead Man\'s Switch / Connection Watchdog Tests
  console.log('\n4. Dead Man\'s Switch Watchdog Verification:');
  const now = Date.now();
  // Case A: Last report 2 hours ago on an 8 hour (480 min) schedule -> Online
  const watchdogOnline = calculateWatchdogStatus(new Date(now - 2 * 60 * 60 * 1000), 480);
  assert(watchdogOnline.isOnline === true && !watchdogOnline.isDeadManTriggered, 'Active station is marked ONLINE');

  // Case B: Last report 18 hours ago on an 8 hour schedule -> 2 consecutive missed cycles (18h > 2 * 8h = 16h) -> Dead Man Triggered!
  const watchdogDeadMan = calculateWatchdogStatus(new Date(now - 18 * 60 * 60 * 1000), 480);
  assert(watchdogDeadMan.isDeadManTriggered === true, 'Missed 2 consecutive cycles triggers DEAD MAN\'S SWITCH ALERT');

  // 5. Battery / Autonomy Model Graceful Handling
  console.log('\n5. Battery Model Graceful Degradation:');
  const battMissing = getBatteryMetrics(null);
  assert(battMissing.hasVoltage === false && battMissing.status === 'unknown', 'Null/missing voltage gracefully returns hasVoltage: false');

  const battPresent = getBatteryMetrics(12.6);
  assert(battPresent.hasVoltage === true && battPresent.percentage !== null && battPresent.percentage >= 80, '12.6V returns ~85-90% SoC');

  // 6. Schema Validation Tests
  console.log('\n6. Strict Zod Schema Validation:');
  const validTelemetry = TelemetryPayloadSchema.safeParse({
    temperature: 21.5,
    humidity: 62.0,
    bilgeAlert: false,
    sensorOk: true,
  });
  assert(validTelemetry.success, 'Valid ESP32 telemetry payload passes');

  const extraFieldTelemetry = TelemetryPayloadSchema.safeParse({
    temperature: 21.5,
    humidity: 62.0,
    bilgeAlert: false,
    sensorOk: true,
    hackerField: 'inject',
  });
  assert(!extraFieldTelemetry.success, 'Rejects unknown extra fields strictly');

  const validCommand = CommandUpdateSchema.safeParse({
    mode: 'winter_storage',
    reportIntervalMinutes: 1440,
  });
  assert(validCommand.success, 'Valid command update schema passes');

  console.log('\n----------------------------------------------------');
  console.log(`Results: ${passed} Passed, ${failed} Failed`);
  if (failed > 0) process.exit(1);
}

runTests();
