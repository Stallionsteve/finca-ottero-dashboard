// Finca Ottero — the one file that matches the app to the Home Assistant installation.
// Everything else (lights, rooms, cameras, Sonos, climate) is discovered automatically.
// Edit this file in Home Assistant's File editor: /config/www/finca-ottero/config.js
window.FINCA_CONFIG = {
  // Leave empty when the app is served by Home Assistant itself (/local/finca-ottero/).
  hassUrl: "",

  // Anything whose name or entity id matches one of these never appears in the app.
  // The guest-bedroom air conditioner stays independent for guests.
  // Victron and Ring control switches are never shown either: they change inverter or security behaviour.
  hide: [/guest/i, /^venus /i, /multiplus/i, /hub4/i, /motion detection$/i],

  // Named devices, found by their Home Assistant name. Set `entity` to pin an exact entity id.
  devices: {
    gate:       { name: "Main Gate",      match: [/main gate/i, /front gate/i], domains: ["switch", "button", "script", "cover", "lock"], entity: "" },
    pump:       { name: "Pool Pump",      match: [/pool pump/i],                domains: ["switch"], entity: "" },
    poolLights: { name: "Pool Lights",    match: [/pool light/i],               domains: ["switch", "light"], entity: "" },
    jacuzzi:    { name: "Jacuzzi Heater", match: [/jacuzzi/i],                  domains: ["switch", "climate", "water_heater"], entity: "" },
    fire:       { name: "Fireplace",      match: [/^fire\b/i, /fireplace/i],     domains: ["switch", "light"], entity: "" },
    poolHouse:  { name: "Pool House",     match: [/pool house/i],               domains: ["light", "switch"], entity: "" },
    moisture:   { name: "Moist Detector", match: [/moist/i],                    domains: ["sensor"], deviceClass: "humidity", entity: "" },
    gateCamera: { name: "Main Gate Doorbell", match: [/main gate/i, /gate/i],   domains: ["camera"], entity: "" }
  },

  // eWeLink switches that are really lights, shown on the Lighting page.
  lightingSwitches: [/bathroom light/i, /bedroom light/i, /^fire\b/i, /fireplace/i],

  // Schedules kept in eWeLink (display only — Home Assistant cannot see them). Minutes after midnight.
  schedules: {
    pump: [[630, 930], [990, 1125]],
    poolLights: [[1140, 1440]]
  },

  // Victron readings, via the template layer in homeassistant/packages/finca_ottero.yaml.
  // Watts: grid + = importing, − = exporting; battery + = charging, − = discharging.
  energy: {
    soc: "sensor.finca_battery_soc",
    pv: "sensor.finca_solar_power",
    grid: "sensor.finca_grid_power",
    battery: "sensor.finca_battery_power",
    acLoads: "sensor.finca_ac_loads",
    essential: "sensor.finca_essential_loads",
    inverter: "sensor.finca_inverter_state",
    pvToday: "sensor.finca_solar_energy_today"
  },

  // The two air conditioners controlled through Alexa (Alexa Media Player integration).
  // `echo` is the Echo that receives the command. Alexa does not report their state back.
  alexaAC: [
    { id: "living", name: "Living Room", alexaName: "living room air con" },
    { id: "master", name: "Master Bedroom", alexaName: "master bedroom air con" }
  ],

  jarvis: {
    pipelineName: /jarvis/i,   // which Assist pipeline to talk to
    sayScript: "script.finca_jarvis_say",
    suggestions: [
      "How much battery have we got?",
      "How much solar are we generating?",
      "Are we drawing electricity from the grid?",
      "Give me the house energy report",
      "Turn the terrace lights on"
    ]
  }
};
