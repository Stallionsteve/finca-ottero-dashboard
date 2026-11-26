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
    const t0 = Date.now() / 1000;
    store.devices.demo_sensor = { id: "demo_sensor", name: "Hue motion sensor 3", name_by_user: "Living room temperature", manufacturer: "Signify Netherlands B.V.", model: "Hue motion sensor", area_id: "living", created_at: t0 - 86400 };
    store.devices.demo_bulb = { id: "demo_bulb", name: "Hue color lamp 7", manufacturer: "Signify Netherlands B.V.", model: "Hue color lamp", area_id: null, created_at: t0 - 3600 };

    light("light.terrace_group", "Terrace", "terrace", true, 70, true);
    ["Terrace", "Terrace 2", "Terrace 3", "Terrace 4", "Terrace 5", "Terrace 6"].forEach((n, i) => light(`light.terrace_${i + 1}`, n, "terrace", true, 70));
    light("light.bar_group", "Bar", "bar", true, 45, true);
    ["Bar 1", "Bar 2", "Bar 3", "Bar 4", "Bar 5", "Side bar 1", "Side bar 2"].forEach((n, i) => light(`light.bar_${i + 1}`, n, "bar", true, 45));
    ["Play Bar", "Play Bar Left", "TV Left 1", "TV Left 2"].forEach((n, i) => light(`light.lounge_${i + 1}`, n, "lounge", false, 60));
    light("light.hue_white_lamp_1", "Hue White Lamp 1", "living", false, 80);
    light("light.living_room_group", "Living room", "living", true, 60, true);
    store.states["light.living_room_group"].attributes.entity_id = ["light.hue_white_lamp_1"];
    light("light.color_light_1", "Desk light", "living", false, 70);
    light("light.pool_house", "Pool House", "pool", false, 65);
    // System Monitor (the iMac running Home Assistant)
    [["sensor.system_monitor_memory_usage", "39.2", "%"], ["sensor.system_monitor_processor_use", "4", "%"], ["sensor.system_monitor_disk_usage", "9.7", "%"],
     ["sensor.system_monitor_disk_usage_config", "9.7", "%"], ["sensor.system_monitor_disk_use", "18.2", "GiB"]].forEach(([id, v, u]) =>
      ent(id, v, { friendly_name: "System Monitor " + id.split("monitor_")[1].replace(/_/g, " "), unit_of_measurement: u }, { platform: "systemmonitor" }));
    // Hue scenes (names as on the real bridge; * = dynamic)
    [["terrace", "Terrace", ["Cancun*", "Dreamy dusk*", "Green*", "Honolulu*", "Silverstone*", "Tropical twilight*", "Rolling hills*", "Crocus*"]],
     ["living", "Living room", ["Honolulu*", "Fuchsia frost*", "Rolling hills*", "Relax"]], ["bar", "Bar", ["Dimmed", "Bright"]]].forEach(([area, g, list]) => {
      const gk = g.toLowerCase().replace(/\W+/g, "_");
      list.forEach(n => { const nn = n.replace("*", ""); ent(`scene.${gk}_${gk}_${nn.toLowerCase().replace(/\W+/g, "_")}`, minsAgo(300), { friendly_name: `${g} ${nn}`, name: nn, group_name: g, is_dynamic: n.endsWith("*") }, { area, platform: "hue" }); });
      ent(`select.${gk}_${gk}_scene`, area === "bar" ? "Dimmed" : "unknown", { friendly_name: `${g} Scene`, options: list.map(n => n.replace("*", "")) }, { area, platform: "hue" });
    });

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

    ent("alarm_control_panel.estepona_alarm", "disarmed", { friendly_name: "Estepona Alarm", DisarmedTime: minsAgo(600) }, { platform: "mqtt" });
    // Ring cameras named as on the real system (26 Nov), with batteries, motion, sirens and settings
    const nowS = Date.now() / 1000;
    [["main_gate", "Main Gate", 63, 720], ["front_door", "Front Door", 66, 95], ["terrace", "Terrace", 100, 1], ["conservatory", "Conservatory", 56, 40], ["downstairs", "Downstairs", 100, 300], ["hallway", "Hallway", 100, 2000]]
      .forEach(([k, n, bat, mins]) => {
        ent(`camera.${k}_live_view`, "idle", { friendly_name: `${n} Live view` }, { platform: "ring" });
        ent(`binary_sensor.${k}_motion`, mins < 2 ? "on" : "off", { friendly_name: `${n} Motion`, device_class: "motion", lastMotion: Math.round(nowS - mins * 60) }, { platform: "mqtt" });
        ent(`sensor.${k}_battery`, String(bat), { friendly_name: `${n} Battery`, unit_of_measurement: "%", device_class: "battery" }, { platform: "mqtt" });
        ent(`switch.${k}_motion_detection`, "on", { friendly_name: `${n} Motion detection` }, { platform: "ring" });
        ent(`switch.${k}_motion_warning`, "off", { friendly_name: `${n} Motion warning` }, { platform: "mqtt" });
        if (["terrace", "conservatory", "downstairs", "hallway"].includes(k)) ent(`siren.${k}_siren`, "off", { friendly_name: `${n} Siren` }, { platform: "mqtt" });
        if (["front_door", "main_gate"].includes(k)) ent(`binary_sensor.${k}_ding`, "off", { friendly_name: `${n} Ding`, lastDing: Math.round(nowS - (k === "front_door" ? 95 : 1500) * 60) }, { platform: "mqtt" });
      });
    [["front_door", "Front Door", "off"], ["back_door", "Back Door", "on"], ["front_window", "Front Window", "off"], ["front_window_2", "Front Window", "off"]].forEach(([k, n, v]) => {
      ent(`binary_sensor.${k}`, v, { friendly_name: n, device_class: k.includes("window") ? "window" : "door" }, { platform: "mqtt", changed: minsAgo(k === "back_door" ? 7 : 300) });
      ent(`binary_sensor.${k}_tamper`, "off", { friendly_name: `${n} Tamper` }, { platform: "mqtt" }); });
    ["estepona_base_station", "estepona_range_extender", "entrance_hall_keypad", "outdoor_siren_55705"].forEach(k => ent(`binary_sensor.${k}_tamper`, "off", { friendly_name: k + " tamper" }, { platform: "mqtt" }));
    ent("switch.outdoor_siren_55705", "off", { friendly_name: "Outdoor Siren" }, { platform: "mqtt" });
    ent("event.front_door_doorbell_ding", now(), { friendly_name: "Front Door Doorbell ding" }, { platform: "ring", changed: minsAgo(95) });
    ent("binary_sensor.hue_outdoor_motion_sensor_1", "off", { friendly_name: "Hue Outdoor Motion Sensor 1", device_class: "motion" }, { platform: "hue", changed: minsAgo(3), area: "terrace" });
    ent("binary_sensor.hue_motion_sensor_1", "off", { friendly_name: "Hue Motion Sensor 1", device_class: "motion" }, { platform: "hue", changed: minsAgo(70), area: "hall" });

    const mp = (id, name, area, state, extra = {}) => ent(id, state, { friendly_name: name, volume_level: 0.3, ...extra }, { area, platform: "sonos" });
    ent("media_player.bar_bar", "idle", { friendly_name: "Bar", source_list: ["Line-in", "Talk Radio Europe", "Capital London", "Apple Radio Dance", "Café del Mar Radio (official)", "Bbc 6", "Mallorca Sunshine Radio", "Classic Road Trip Songs", "Marvin Gaye", "Hiphop"] }, { platform: "sonos" });
    // Find My Otter demo: Steve at home, Hollie in Marbella
    ent("zone.home", "1", { friendly_name: "Home", latitude: 36.44012, longitude: -5.12847, radius: 100, icon: "mdi:home" });
    ent("person.steven_bealey", "home", { friendly_name: "Steven Bealey", latitude: 36.44019, longitude: -5.12851, gps_accuracy: 12, source: "device_tracker.steve_iphone" }, { changed: minsAgo(35) });
    ent("person.hollie_rolla", "not_home", { friendly_name: "Hollie Rolla", latitude: 36.5101, longitude: -4.8826, gps_accuracy: 20, source: "device_tracker.hollie_iphone" }, { changed: minsAgo(12) });
    ent("sensor.steve_iphone_battery_level", "86", { friendly_name: "Steve iPhone Battery level", unit_of_measurement: "%", device_class: "battery" });
    ent("sensor.hollie_iphone_battery_level", "54", { friendly_name: "Hollie iPhone Battery level", unit_of_measurement: "%", device_class: "battery" });
    mp("media_player.living_room", "Living Room", "living", "playing", { media_title: "Miami Disco", media_artist: "Sunset Radio", media_album_name: "Costa Nights", media_duration: 245, media_position: 62, media_position_updated_at: new Date().toISOString(), volume_level: 0.3, entity_picture: "icon-512.png" });
    mp("media_player.terrace", "Terrace", "terrace", "paused");
    mp("media_player.master_bedroom", "Master Bedroom", "master", "idle");
    ent("script.finca_ac_command", "off", { friendly_name: "Finca: air conditioning via Alexa" }, { platform: "script" });
    ent("switch.finca_party_mode", "off", { friendly_name: "Finca party mode" }, { platform: "template" });
    ent("switch.finca_party_lights", "off", { friendly_name: "Finca party lights" }, { platform: "template" });
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
    } else if (domain === "scene") {
      list.forEach(id => { const sc = store.states[id]; if (!sc) return; const area = store.ents[id].area_id;
        Object.values(store.states).filter(x => x.entity_id.startsWith("light.") && store.ents[x.entity_id].area_id === area).forEach(x => set(x.entity_id, "on", { brightness: 180 }));
        const g = sc.attributes.group_name.toLowerCase().replace(/\W+/g, "_"); set(`select.${g}_${g}_scene`, sc.attributes.name); set(id, now()); });
    } else if (domain === "switch") {
      list.forEach(id => {
        if (id === "switch.main_gate") return; // momentary: stays off
        set(id, service === "turn_on" || (service === "toggle" && store.states[id].state !== "on") ? "on" : "off");
      });
    } else if (domain === "siren") { list.forEach(id => set(id, service === "turn_on" ? "on" : "off"));
    } else if (domain === "alarm_control_panel") { list.forEach(id => set(id, { alarm_arm_home: "armed_home", alarm_arm_away: "armed_away", alarm_disarm: "disarmed" }[service] || store.states[id].state));
    } else if (domain === "automation") {
      list.forEach(id => set(id, service === "turn_on" || (service === "toggle" && store.states[id].state !== "on") ? "on" : "off"));
    } else if (domain === "media_player") {
      list.forEach(id => {
        const s = store.states[id];
        if (service === "media_play_pause") set(id, s.state === "playing" ? "paused" : "playing");
        if (service === "media_pause") set(id, "paused");
        if (service === "media_play") set(id, "playing");
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

  function flows() { return [{ flow_id: "demo1", handler: "cast", context: { source: "zeroconf", title_placeholders: { name: "Kitchen speaker" } } }]; }
  return { load, call, history, jarvis, flows };
})();
