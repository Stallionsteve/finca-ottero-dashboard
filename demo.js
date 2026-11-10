// Finca Ottero — demo data, used only when the app is not served by Home Assistant.
// Names mirror the finca's real devices; every value is a sample.
window.FincaDemo = (() => {
  "use strict";
  let store = null, changed = () => {};
  const now = () => new Date().toISOString();
  const minsAgo = m => new Date(Date.now() - m * 60000).toISOString();

  function ent(id, state, attrs = {}, extra = {}) {
    store.states[id] = { entity_id: id, state, attributes: attrs, last_changed: extra.changed || minsAgo(40), last_updated: now() };
    store.ents[id] = { entity_id: id, area_id: extra.area || null, platform: extra.platform || "demo", device_id: null };
  }
  const light = (id, name, area, on, bri, group) => ent(id, on ? "on" : "off",
    { friendly_name: name, brightness: on ? Math.round(bri * 2.55) : null, supported_color_modes: ["color_temp", "xy"], min_color_temp_kelvin: 2200, max_color_temp_kelvin: 6500, ...(group ? { is_hue_group: true } : {}) },
    { area, platform: "hue" });

  function load(s, onChange) {
    store = s; changed = onChange;
    const areas = { terrace: "Terrace", bar: "Bar", lounge: "Downstairs Lounge", living: "Living Room", front: "Front Door", hall: "Hallway", pool: "Pool House", master: "Master Bedroom" };
    Object.entries(areas).forEach(([area_id, name]) => { store.areas[area_id] = { area_id, name }; });

    light("light.terrace_group", "Terrace", "terrace", true, 70, true);
    ["Terrace", "Terrace 2", "Terrace 3", "Terrace 4", "Terrace 5", "Terrace 6"].forEach((n, i) => light(`light.terrace_${i + 1}`, n, "terrace", true, 70));
    light("light.bar_group", "Bar", "bar", true, 45, true);
    ["Bar 1", "Bar 2", "Bar 3", "Bar 4", "Bar 5", "Bar Side 1", "Bar Side 2"].forEach((n, i) => light(`light.bar_${i + 1}`, n, "bar", true, 45));
    ["Play Bar", "Play Bar Left", "TV Left 1", "TV Left 2"].forEach((n, i) => light(`light.lounge_${i + 1}`, n, "lounge", false, 60));
    light("light.hue_white_lamp_1", "Hue White Lamp 1", "living", false, 80);
    light("light.pool_house", "Pool House", "pool", false, 65);

    const sw = (id, name, state, area, platform = "sonoff") => ent(id, state, { friendly_name: name }, { area, platform });
    sw("switch.main_gate", "Main gate", "off", null);
    sw("switch.pool_pump", "Pool pump", "on", null);
    sw("switch.pool_lights", "Pool Lights", "off", null);
    sw("switch.jacuzzi_heater", "Jacuzzi heater", "unavailable", null);
    sw("switch.fire", "Fire", "on", "living");
    sw("switch.bathroom_lights", "Bathroom lights", "off", null);
    sw("switch.bedroom_lights", "Bedroom lights", "off", "master");
    sw("switch.dome_water_heater", "Dome Water Heater", "unavailable", null);
    ent("sensor.moist_detecter_humidity", "82.7", { friendly_name: "Moist detecter humidity", device_class: "humidity", unit_of_measurement: "%" }, { platform: "sonoff" });

    const sensor = (id, v, unit, name) => ent(id, String(v), { friendly_name: name, unit_of_measurement: unit }, { platform: "template" });
    sensor("sensor.finca_battery_soc", 78, "%", "Battery");
    sensor("sensor.finca_solar_power", 3420, "W", "Solar power");
    sensor("sensor.finca_grid_power", -270, "W", "Grid power");
    sensor("sensor.finca_battery_power", 1100, "W", "Battery power");
    sensor("sensor.finca_ac_loads", 1400, "W", "AC loads");
    sensor("sensor.finca_essential_loads", 650, "W", "Essential loads");
    ent("sensor.finca_inverter_state", "Bulk", { friendly_name: "Inverter/charger" }, { platform: "template" });
    sensor("sensor.finca_solar_energy_today", 14.6, "kWh", "Solar today");

    ent("alarm_control_panel.ring_alarm", "disarmed", { friendly_name: "Finca Alarm" }, { platform: "ring" });
    ["Main Gate Doorbell", "Front Door Doorbell", "Living Room Camera", "Conservatory Camera"].forEach(n =>
      ent("camera." + n.toLowerCase().replace(/ /g, "_"), "idle", { friendly_name: n }, { platform: "ring" }));
    ent("event.front_door_doorbell_ding", now(), { friendly_name: "Front Door Doorbell ding" }, { platform: "ring", changed: minsAgo(95) });
    ent("binary_sensor.main_gate_motion", "off", { friendly_name: "Main Gate motion", device_class: "motion" }, { platform: "ring", changed: minsAgo(12) });
    ent("binary_sensor.hue_outdoor_motion_sensor_1", "off", { friendly_name: "Hue Outdoor Motion Sensor 1", device_class: "motion" }, { platform: "hue", changed: minsAgo(3), area: "terrace" });
    ent("binary_sensor.hue_motion_sensor_1", "off", { friendly_name: "Hue Motion Sensor 1", device_class: "motion" }, { platform: "hue", changed: minsAgo(70), area: "hall" });

    const mp = (id, name, area, state, extra = {}) => ent(id, state, { friendly_name: name, volume_level: 0.3, ...extra }, { area, platform: "sonos" });
    mp("media_player.living_room", "Living Room", "living", "playing", { media_title: "Miami Disco", media_artist: "Sunset Radio" });
    mp("media_player.terrace", "Terrace", "terrace", "paused");
    mp("media_player.master_bedroom", "Master Bedroom", "master", "idle");
    ent("script.finca_ac_command", "off", { friendly_name: "Finca: air conditioning via Alexa" }, { platform: "script" });
    ent("switch.finca_party_mode", "off", { friendly_name: "Finca party mode" }, { platform: "template" });
    ent("automation.finca_security_intruder_warning", "on", { friendly_name: "Finca security: intruder warning" }, { platform: "automation" });
    ent("script.finca_intruder_warning", "off", { friendly_name: "Finca: intruder warning in Spanish" }, { platform: "script" });
    ent("automation.finca_climate_air_con_on_spare_power", "off", { friendly_name: "Finca climate: air con on spare power" }, { platform: "automation" });
    ent("binary_sensor.finca_climate_power_available", "on", { friendly_name: "Finca climate power available" }, { platform: "template" });
    ent("sensor.finca_climate_mode", "heat", { friendly_name: "Finca climate mode" }, { platform: "template" });
    sensor("sensor.venus_ac_loads_on_l1", 1070, "W", "Venus AC loads on L1");
    sensor("sensor.venus_ac_loads_on_l2", 21, "W", "Venus AC loads on L2");
    ent("weather.home", "sunny", { friendly_name: "Home", temperature: 24 }, { platform: "met" });
  }

  function set(id, state, attrs = {}) {
    const s = store.states[id]; if (!s) return;
    store.states[id] = { ...s, state, attributes: { ...s.attributes, ...attrs }, last_changed: s.state === state ? s.last_changed : now() };
  }
  const ids = target => [].concat(target && target.entity_id || []);

  function call(domain, service, data, target) {
    const list = ids(target);
    if (domain === "light") {
      list.forEach(id => {
        const on = service === "turn_on" || (service === "toggle" && store.states[id].state !== "on");
        const extra = data.hs_color ? { hs_color: data.hs_color, rgb_color: hsToRgb(data.hs_color) } : data.color_temp_kelvin ? { color_temp_kelvin: data.color_temp_kelvin, rgb_color: null, hs_color: null } : {};
        set(id, on ? "on" : "off", { brightness: on ? Math.round((data.brightness_pct || (store.states[id].attributes.brightness || 128) / 2.55) * 2.55) : null, ...extra });
        // A Hue room switches its members; members update their room.
        if (store.states[id].attributes.is_hue_group) {
          const area = store.ents[id].area_id;
          Object.values(store.states).filter(s => s.entity_id.startsWith("light.") && store.ents[s.entity_id].area_id === area && s.entity_id !== id)
            .forEach(s => set(s.entity_id, on ? "on" : "off", { brightness: store.states[id].attributes.brightness }));
        }
      });
      syncGroups();
    } else if (domain === "switch") {
      list.forEach(id => {
        if (id === "switch.main_gate") return; // momentary: stays off
        set(id, service === "turn_on" || (service === "toggle" && store.states[id].state !== "on") ? "on" : "off");
      });
    } else if (domain === "automation") {
      list.forEach(id => set(id, service === "turn_on" || (service === "toggle" && store.states[id].state !== "on") ? "on" : "off"));
    } else if (domain === "media_player") {
      list.forEach(id => {
        const s = store.states[id];
        if (service === "media_play_pause") set(id, s.state === "playing" ? "paused" : "playing");
        if (service === "volume_set") set(id, s.state, { volume_level: data.volume_level });
      });
    }
    changed();
    return Promise.resolve();
  }
  function hsToRgb([h, sat]) {
    const s = sat / 100, f = n => { const k = (n + h / 60) % 6; return Math.round(255 * (1 - s * Math.max(0, Math.min(k, 4 - k, 1)))); };
    return [f(5), f(3), f(1)];
  }
  function syncGroups() {
    Object.values(store.states).filter(s => s.attributes.is_hue_group).forEach(g => {
      const area = store.ents[g.entity_id].area_id;
      const members = Object.values(store.states).filter(s => s.entity_id.startsWith("light.") && !s.attributes.is_hue_group && store.ents[s.entity_id].area_id === area);
      set(g.entity_id, members.some(m => m.state === "on") ? "on" : "off");
    });
  }

  function history(bins) {
    const pv = [], use = [], nowBin = Math.floor((new Date().getHours() * 60 + new Date().getMinutes()) / 15);
    for (let i = 0; i < bins; i++) {
      const h = i / 4;
      if (i > nowBin) { pv.push(null); use.push(null); continue; }
      pv.push(h < 7.5 || h > 19.5 ? 0 : Math.round(3700 * Math.sin(Math.PI * (h - 7.5) / 12)));
      use.push(Math.round(600 + 500 * Math.exp(-((h - 8) ** 2) / 2) + 1500 * Math.exp(-((h - 19.5) ** 2) / 3) + 300 * Math.sin(i)));
    }
    return { pv, use };
  }

  // Mirrors the wording of the Home Assistant intent scripts in homeassistant/packages/finca_ottero.yaml.
  function jarvis(text) {
    const v = id => parseFloat(store.states[id].state);
    const soc = v("sensor.finca_battery_soc"), pv = v("sensor.finca_solar_power") / 1000, grid = v("sensor.finca_grid_power"), batt = v("sensor.finca_battery_power");
    const t = text.toLowerCase();
    const gridLine = grid > 30 ? `we're drawing ${(grid / 1000).toFixed(2)} kilowatts from the grid` : grid < -30 ? `we're exporting ${(-grid / 1000).toFixed(2)} kilowatts to the grid` : "the grid is idle";
    if (/report|summary/.test(t)) return `Good ${new Date().getHours() < 12 ? "morning" : new Date().getHours() < 18 ? "afternoon" : "evening"}. The batteries are at ${Math.round(soc)}% and ${batt > 30 ? "charging" : batt < -30 ? "discharging" : "resting"}, solar is generating ${pv.toFixed(1)} kilowatts, and ${gridLine}. (Demo figures.)`;
    if (/battery|batteries/.test(t) && /charg/.test(t)) return batt > 30 ? `Yes, the batteries are charging at ${(batt / 1000).toFixed(2)} kilowatts.` : "No, the batteries aren't charging at the moment.";
    if (/battery|batteries/.test(t)) return `The batteries are at ${Math.round(soc)}%.`;
    if (/solar/.test(t)) return `Solar is generating ${pv.toFixed(1)} kilowatts.`;
    if (/grid/.test(t)) return grid > 30 ? `Yes, ${gridLine}.` : `No, ${gridLine}.`;
    const m = t.match(/turn (?:the )?(.+?) lights? (on|off)/) || t.match(/turn (on|off) (?:the )?(.+?) lights?/);
    if (m) {
      const [area, onoff] = m[2] === "on" || m[2] === "off" ? [m[1], m[2]] : [m[2], m[1]];
      const g = Object.values(store.states).find(s => s.attributes.is_hue_group && s.attributes.friendly_name.toLowerCase() === area.trim());
      if (g) { call("light", onoff === "on" ? "turn_on" : "turn_off", {}, { entity_id: g.entity_id }); return `Done. The ${area} lights are ${onoff}.`; }
      return `I can't find any ${area} lights, I'm afraid.`;
    }
    return "In the demo I can answer questions about the battery, solar and grid, or switch the terrace and bar lights.";
  }

  return { load, call, history, jarvis };
})();
