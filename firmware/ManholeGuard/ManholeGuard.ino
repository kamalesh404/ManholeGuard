/*
 * MANHOLEGUARD — Arduino Uno telemetry firmware
 * Smart IoT-Based Manhole Safety Monitoring System
 *
 * Emits ONE newline-terminated JSON frame per interval over USB serial
 * (9600 baud — the dashboard also auto-detects 115200). The dashboard's
 * "Connect Arduino" button reads the COM port directly in Chrome/Edge
 * (Web Serial) — no drivers, no server.
 *
 * Wire format (any subset of fields is accepted; missing fields keep
 * their previous value on the dashboard):
 *
 *   {"gasUnit":"raw","ch4":1180,"co":640,"h2s":430,
 *    "waterLevel":32,"coverStatus":"closed","vibration":"normal"}
 *
 * HONESTY: gasUnit is "raw" until you actually calibrate the MQ sensors
 * to ppm. The dashboard must never show raw ADC counts as ppm.
 *
 * ---------------------------------------------------------------------
 * PIN MAP (Arduino Uno / Nano)
 * ---------------------------------------------------------------------
 *   A0  MQ-4  methane (CH4) sensor analog out     (raw ADC 0..1023)
 *   A1  MQ-7  carbon monoxide (CO) sensor out     (raw ADC 0..1023)
 *   A2  MQ-136 hydrogen sulfide (H2S) sensor out  (raw ADC 0..1023)
 *   A3  water level sensor (analog probe / pot)   (raw ADC 0..1023)
 *   D2  cover reed switch, INPUT_PULLUP           (LOW  = cover open)
 *   D3  vibration / tamper sensor, INPUT_PULLUP   (LOW  = activity)
 *
 * TEST_MODE (default ON) emits a clean synthetic waveform so you can
 * verify the whole pipeline with nothing wired. Set it to 0 once your
 * sensors are connected — readings then come straight from the pins.
 */

#define TEST_MODE 1

const unsigned long INTERVAL_MS = 1000;  // frame rate
const uint8_t PIN_CH4 = A0;
const uint8_t PIN_CO = A1;
const uint8_t PIN_H2S = A2;
const uint8_t PIN_WATER = A3;
const uint8_t PIN_COVER = 2;   // reed switch to GND
const uint8_t PIN_VIBRATION = 3; // vibration switch to GND

unsigned long lastFrame = 0;
unsigned long tick = 0;

// Depth of the shaft in cm — used to convert the raw water reading to cm.
const int SHAFT_DEPTH_CM = 100;

void setup() {
  Serial.begin(9600);     // 9600 = Arduino default; dashboard auto-detects 9600/115200
  pinMode(PIN_COVER, INPUT_PULLUP);
  pinMode(PIN_VIBRATION, INPUT_PULLUP);
}

int readRaw(uint8_t pin) {
  return TEST_MODE ? 0 : analogRead(pin);
}

void loop() {
  if (millis() - lastFrame < INTERVAL_MS) return;
  lastFrame = millis();
  tick++;

  int ch4, co, h2s, waterPct;
  bool coverOpen, vibration;

  if (TEST_MODE) {
    // Synthetic but plausible: slow sinusoidal drift for gases, a water
    // level that rises and falls, and periodic cover/vibration events.
    ch4 = 1150 + (int)(300.0 * sin(tick / 12.0));
    co = 620 + (int)(160.0 * sin(tick / 9.0 + 1.3));
    h2s = 440 + (int)(140.0 * sin(tick / 7.0 + 2.1));
    waterPct = 32 + (int)(18.0 * sin(tick / 20.0));
    coverOpen = (tick % 47) >= 44;      // brief open event now and then
    vibration = (tick % 31) >= 29;
  } else {
    ch4 = readRaw(PIN_CH4);
    co = readRaw(PIN_CO);
    h2s = readRaw(PIN_H2S);
    waterPct = map(readRaw(PIN_WATER), 0, 1023, 0, 100);
    coverOpen = digitalRead(PIN_COVER) == LOW;
    vibration = digitalRead(PIN_VIBRATION) == LOW;
  }

  int waterCm = (long)waterPct * SHAFT_DEPTH_CM / 100;

  // One JSON frame — keep it on a single line.
  Serial.print(F("{\"gasUnit\":\"raw\",\"ch4\":"));
  Serial.print(ch4);
  Serial.print(F(",\"co\":"));
  Serial.print(co);
  Serial.print(F(",\"h2s\":"));
  Serial.print(h2s);
  Serial.print(F(",\"waterLevel\":"));
  Serial.print(waterCm);
  Serial.print(F(",\"coverStatus\":\""));
  Serial.print(coverOpen ? "open" : "closed");
  Serial.print(F("\",\"vibration\":\""));
  Serial.print(vibration ? "detected" : "normal");
  Serial.println(F("\"}"));
}
