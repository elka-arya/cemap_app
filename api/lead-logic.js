const crypto = require("crypto");

const REGION_ID = /^[a-z0-9-]{2,40}$/;
const LEAD_ID = /^[a-zA-Z0-9_-]{4,80}$/;

function hashPin(pin, salt) {
  return crypto.scryptSync(String(pin), String(salt), 32).toString("hex");
}

function hashesMatch(leftHex, rightHex) {
  const left = Buffer.from(String(leftHex), "hex");
  const right = Buffer.from(String(rightHex), "hex");
  if (left.length === 0 || left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
}

function sameEmail(left, right) {
  return String(left || "").trim().toLowerCase() === String(right || "").trim().toLowerCase();
}

function emailAlreadyTipped(leads, email, exceptId) {
  const needle = String(email || "").trim().toLowerCase();
  if (!needle) return false;
  return (leads || []).some((row) => {
    return String(row.id) !== String(exceptId || "")
      && row.guessedPrice
      && sameEmail(row.email, needle);
  });
}

function cleanLead(input) {
  if (!input || typeof input !== "object") return null;
  const id = String(input.id || "");
  if (!LEAD_ID.test(id)) return null;
  const name = String(input.name || "").trim().slice(0, 120);
  if (!name) return null;
  const email = String(input.email || "").trim().slice(0, 160);
  const phone = String(input.phone || "").trim().slice(0, 40);
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
  let guessedPrice = null;
  if (input.guessedPrice !== null && input.guessedPrice !== undefined && input.guessedPrice !== "") {
    guessedPrice = Number(input.guessedPrice);
    if (!Number.isFinite(guessedPrice) || guessedPrice < 0 || guessedPrice > 1e12) return null;
  }
  const score = Number(input.score);
  if (!Number.isFinite(score) || score < 0 || score > 10) return null;
  const createdAt = Number(input.createdAt);
  const mailedAt = Number(input.mailedAt);
  return {
    id,
    timestamp: String(input.timestamp || "").slice(0, 40),
    createdAt: Number.isFinite(createdAt) && createdAt > 0 ? createdAt : Date.now(),
    isExisting: Boolean(input.isExisting),
    name,
    email,
    phone,
    score,
    level: String(input.level || "").slice(0, 60),
    regionId: String(input.regionId || "").slice(0, 40),
    regionName: String(input.regionName || "").slice(0, 80),
    guessedPrice,
    deviceId: String(input.deviceId || "").slice(0, 40),
    mailedAt: Number.isFinite(mailedAt) && mailedAt > 0 ? mailedAt : null
  };
}

function cleanPrices(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) return null;
  const prices = {};
  for (const [key, value] of Object.entries(input)) {
    if (!REGION_ID.test(key)) continue;
    const price = Number(value);
    if (!Number.isFinite(price) || price < 100000 || price > 1e12) continue;
    prices[key] = Math.round(price);
  }
  return prices;
}

function pinRecord(pin) {
  const salt = crypto.randomBytes(16).toString("hex");
  return JSON.stringify({ salt, hash: hashPin(pin, salt) });
}

function storedPinMatches(raw, pin) {
  if (!raw) return false;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || !parsed.salt || !parsed.hash) return false;
    return hashesMatch(hashPin(pin, parsed.salt), parsed.hash);
  } catch (error) {
    return false;
  }
}

function pricesLocked(ms) {
  const day = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Prague",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(ms || Date.now());
  return day === "2026-11-19";
}

function serverPin(env) {
  const value = String((env && env.ADMIN_PIN) || "").trim();
  return /^\d{4}$/.test(value) ? value : "";
}

function clientIp(header) {
  return String(header || "unknown").split(",")[0].trim().slice(0, 80) || "unknown";
}

async function pinStatus(store, ip) {
  const raw = await store.getSetting("pinlock:" + ip);
  if (!raw) return { locked: false, fails: 0 };
  try {
    const parsed = JSON.parse(raw);
    if (parsed.lockedUntil && Date.now() < Number(parsed.lockedUntil)) {
      return { locked: true, fails: Number(parsed.fails) || 0 };
    }
  } catch (error) {
    return { locked: false, fails: 0 };
  }
  return { locked: false, fails: 0 };
}

async function notePinFailure(store, ip) {
  const current = await pinStatus(store, ip);
  const fails = (current.fails || 0) + 1;
  const lockedUntil = fails >= 25 ? Date.now() + 10 * 60 * 1000 : 0;
  await store.setSetting("pinlock:" + ip, JSON.stringify({ fails, lockedUntil }));
  return { locked: Boolean(lockedUntil), fails };
}

async function clearPinFailure(store, ip) {
  await store.setSetting("pinlock:" + ip, JSON.stringify({ fails: 0, lockedUntil: 0 }));
}

async function pinIsValid(store, pin, env, ip) {
  if (!/^\d{4}$/.test(String(pin || ""))) return { ok: false, status: 401 };
  const lock = await pinStatus(store, ip);
  if (lock.locked) return { ok: false, status: 429 };
  const fixed = serverPin(env);
  if (fixed) {
    if (fixed === pin) {
      await clearPinFailure(store, ip);
      return { ok: true };
    }
    await notePinFailure(store, ip);
    return { ok: false, status: 401 };
  }
  const stored = await store.getSetting("admin_pin");
  if (!stored) {
    const created = await store.setSettingIfAbsent("admin_pin", pinRecord(pin));
    if (!created && !storedPinMatches(await store.getSetting("admin_pin"), pin)) {
      await notePinFailure(store, ip);
      return { ok: false, status: 401 };
    }
    await clearPinFailure(store, ip);
    return { ok: true, created: true };
  }
  if (!storedPinMatches(stored, pin)) {
    await notePinFailure(store, ip);
    return { ok: false, status: 401 };
  }
  await clearPinFailure(store, ip);
  return { ok: true };
}

async function handleAction(options) {
  const store = options.store;
  const action = String(options.action || "");
  const env = options.env || {};
  const ip = clientIp(options.ip);

  if (!(await store.ready())) {
    return { status: 200, body: { ok: true, shared: false } };
  }

  if (action === "tip-used") {
    const email = String(options.email || "").trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return { status: 400, body: { ok: false, error: "E-mail nemá platný formát." } };
    }
    const used = emailAlreadyTipped(await store.listLeads(), email);
    return { status: 200, body: { ok: true, shared: true, used } };
  }

  if (action === "upsert") {
    const lead = cleanLead(options.lead);
    if (!lead) return { status: 400, body: { ok: false, error: "Tip nejde uložit." } };
    const count = await store.countLeads();
    if (count >= 5000 && !(await store.hasLead(lead.id))) {
      return { status: 400, body: { ok: false, error: "Databáze tipů je plná." } };
    }
    if (lead.guessedPrice && emailAlreadyTipped(await store.listLeads(), lead.email, lead.id)) {
      return {
        status: 409,
        body: { ok: false, shared: true, duplicate: true, error: "Tento e-mail už v tipovačce jeden tip odeslal." }
      };
    }
    let saved = "exists";
    try {
      saved = await store.insertLead(lead);
    } catch (error) {
      if (error && error.code === "23505") {
        return {
          status: 409,
          body: { ok: false, shared: true, duplicate: true, error: "Tento e-mail už v tipovačce jeden tip odeslal." }
        };
      }
      throw error;
    }
    return { status: 200, body: { ok: true, shared: true, inserted: saved === "inserted" } };
  }

  const auth = await pinIsValid(store, options.pin, env, ip);
  if (!auth.ok) {
    const error = auth.status === 429
      ? "Příliš mnoho pokusů. Zkuste to znovu za pár minut."
      : "PIN nepatří ke společné databázi.";
    return { status: auth.status, body: { ok: false, shared: true, error } };
  }

  if (action === "list") {
    const leads = await store.listLeads();
    const prices = pricesLocked(options.now) ? {} : (cleanPrices(await store.getPrices()) || {});
    return { status: 200, body: { ok: true, shared: true, leads, prices } };
  }

  if (action === "prices") {
    if (pricesLocked(options.now)) {
      return { status: 400, body: { ok: false, shared: true, error: "Ceny jsou 19. 11. 2026 uzamčené." } };
    }
    const prices = cleanPrices(options.prices);
    if (!prices || Object.keys(prices).length === 0) {
      return { status: 400, body: { ok: false, error: "Ceny nejde uložit." } };
    }
    const current = cleanPrices(await store.getPrices()) || {};
    await store.setPrices(Object.assign({}, current, prices));
    return { status: 200, body: { ok: true, shared: true } };
  }

  if (action === "clear") {
    await store.clearLeads();
    return { status: 200, body: { ok: true, shared: true } };
  }

  if (action === "change-pin") {
    if (serverPin(env)) {
      return {
        status: 400,
        body: { ok: false, shared: true, error: "PIN společné databáze je nastavený na serveru." }
      };
    }
    const next = String(options.newPin || "");
    if (!/^\d{4}$/.test(next)) {
      return { status: 400, body: { ok: false, error: "PIN musí mít přesně 4 číslice." } };
    }
    await store.setSetting("admin_pin", pinRecord(next));
    return { status: 200, body: { ok: true, shared: true } };
  }

  return { status: 400, body: { ok: false, error: "Neznámý požadavek." } };
}

module.exports = {
  cleanLead,
  cleanPrices,
  handleAction,
  hashPin
};
