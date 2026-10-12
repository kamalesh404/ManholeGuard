# MANHOLEGUARD

**Smart IoT-Based Manhole Safety Monitoring System** — a real-time industrial
safety monitoring dashboard for municipal manhole networks.

The interface is built around one question: **is this manhole safe right now?**

> **Real telemetry only.** There is no simulation anywhere in this app. Every
> number on screen either comes from a device over USB serial or is an honest
> `—` / **no data** state. Manholes whose device has never reported show
> empty values, grey OFFLINE status and "no telemetry received" — never
> placeholder readings.

## Run it

```bash
npm install
npm run dev        # http://127.0.0.1:5183
npm run build      # typecheck + production build
npm run typecheck
npm run test:live  # headless-Chrome e2e: mocked serial port → live MG-001
```

## Live Arduino data

1. Flash `firmware/ManholeGuard/ManholeGuard.ino` to your Arduino Uno/Nano
   (Arduino IDE → Board: Arduino Uno → Upload), or keep your own sketch. It
   prints one line per second. `TEST_MODE 1` (default) emits a synthetic
   waveform so you can verify the pipeline with nothing wired; set it to `0`
   once your sensors are on the pins (pin map is documented in the sketch).
   **Baud is auto-detected** — the port opens at 9600 (Arduino default) and
   falls back to 115200 if no readable line arrives within 5 seconds, so both
   `Serial.begin(9600)` and `Serial.begin(115200)` work.
2. Open the dashboard in **Chrome or Edge** (Web Serial is not available in
   Firefox/Safari) on `http://localhost`.
3. Click **Connect Arduino** (bottom right) and pick the board's COM port.

MG-001 now shows live gas / water / cover / vibration values (whatever the
firmware reports). Unplug the board and MG-001 freezes on its last real frame
and reports **DEVICE OFFLINE**. The other registered manholes keep their
"no data" state until their own devices are installed.

Wire format — any subset of fields is accepted; missing fields stay empty
(`—`) instead of being invented:

```
{"gasUnit":"raw","ch4":1180,"co":640,"h2s":430,
 "waterLevel":32,"coverStatus":"closed","vibration":"normal"}
```

Plain serial-monitor output works as-is, so a sketch can simply print:

```
CH4: 420.00 ppm  CO: 12.00 ppm  H2S: 4.00 ppm
```

as do `ch4:1180 co:640 h2s:430` key/value lines and bare CSV (`1180,640,430`).
**Honesty rule:** a line without an explicit unit token (`"gasUnit":"ppm"`, or
a trailing `ppm`) is treated as raw ADC and displayed as `RAW SENSOR LEVEL` —
raw MQ counts are never shown as ppm. Values keep their precision (up to 2
decimals) all the way to the screen.

## Pages

| Route | Purpose |
| --- | --- |
| `#/` | **Live Monitor** — primary screen: large safety state, gas monitors, water level, current risk, device health, cover/tamper, fleet, alerts, system overview, cutaway visual, schematic map |
| `#/manholes` | Fleet of registered manholes — live values where devices report, empty where they don't |
| `#/manholes/MG-001` | Manhole detail — full telemetry table with recent trends |
| `#/alerts` | Alert log with severity/manhole filters and acknowledge actions |
| `#/devices` | Arduino controllers and their health |
| `#/settings` | Alarm thresholds, poll interval, data-source contract |

## Data architecture

The UI is written against plain data types in `src/model/types.ts` —
`Manhole`, `Device`, `Telemetry`, `SensorEval`, `Alert` — and never against
example values.

All data enters the app through one seam, `TelemetryProvider`
(`src/data/provider.ts`):

```ts
export interface TelemetryProvider {
  readonly label: string;
  poll(ctx: PollContext): Record<string, Telemetry>; // keyed by manholeId
}
```

The app runs `ArduinoTelemetryProvider` (`src/data/arduino.ts`): live USB-serial
readings for MG-001; every other manhole keeps the empty frame built by
`emptyTelemetry()` until its device reports. `Telemetry` carries what the
firmware publishes:

```
manholeId, timestamp, hasData, gasUnit, ch4, co, h2s, waterLevel,
coverStatus, vibration, battery, linkStatus, linkDetail, deviceStatus
```

Every sensor field is **nullable** — `null` means the device never reported
that channel, and the UI renders `—` / "No data" for it (channels the device
doesn't report never influence the overall safety status). `battery` is `null`
for USB-powered nodes (shown as **USB powered**); `linkStatus`/`linkDetail`
describe the transport (`USB serial · 9600 baud`) and reflect the baud the
device actually confirmed on.

To add another source (HTTP gateway, MQTT bridge, …), implement
`TelemetryProvider` against it and swap the singleton in `src/state/store.tsx`.
No component changes are required.

### Units and honesty

`gasUnit` is part of the payload:

- `ppm` → values are displayed as calibrated ppm (only when explicitly sent).
- `raw` → values are displayed as **raw ADC counts** with a `RAW SENSOR LEVEL`
  tag. Raw counts are never presented as ppm. Thresholds are configured per
  unit mode (`src/model/evaluate.ts`, editable in Settings).

### Status evaluation

`assess()` in `src/model/evaluate.ts` classifies every channel against the
configured thresholds and derives:

- overall status: `safe | warning | high | critical | offline`
- per-sensor states for the cards
- the human-readable **Current Risk** lines (the *why* behind the state)
- an honest **no-data** assessment (everything `—`, status `offline`) for a
  device that has never reported

Alerts are generated by diffing consecutive real frames: whenever a sensor
escalates or the device drops its heartbeat, an alert is raised with the
concrete reason (e.g. `H₂S 32 ppm above critical threshold (25)`). With no
devices connected the alert log stays empty — nothing is seeded.

## Project layout

```
firmware/    Arduino sketch (JSON frames over USB serial, TEST_MODE flag)
src/
  model/      types, thresholds, risk evaluation
  data/       fleet registration (seed), provider seam, Arduino Web Serial
  state/      store: polling, alerts, hash routing
  components/ header, hero, sensor cards, panels, cutaway SVG, map
  pages/      live monitor, manholes, detail, alerts, devices, settings
  styles.css  dark industrial control-room theme (adaptive ambient glow)
test/        e2e: mocks navigator.serial and asserts live data reaches the UI
             (and that nothing fabricated ever appears)
```
