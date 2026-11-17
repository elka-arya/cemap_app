const { Pool } = require("pg");
const { handleAction } = require("./lead-logic");

let pool;
let schemaReady;

function databaseUrl() {
  return String(process.env.POSTGRES_URL || process.env.DATABASE_URL || "").trim();
}

function getPool() {
  const url = databaseUrl();
  if (!url) return null;
  if (!pool) {
    pool = new Pool({ connectionString: url, max: 1 });
  }
  return pool;
}

async function ensureSchema(query) {
  schemaReady ??= query(`
    create table if not exists leads (
      id text primary key,
      payload jsonb not null,
      created_at timestamptz not null default now()
    );
    create table if not exists app_settings (
      key text primary key,
      value text not null
    );
    create unique index if not exists leads_one_tip_per_email
      on leads (lower(payload->>'email'))
      where coalesce(payload->>'guessedPrice', '') <> ''
        and payload->>'guessedPrice' <> 'null'
        and coalesce(payload->>'email', '') <> '';
  `);
  return schemaReady;
}

function createPgStore() {
  const active = getPool();
  if (!active) {
    return {
      async ready() {
        return false;
      }
    };
  }
  const query = (text, params) => active.query(text, params);
  return {
    async ready() {
      await ensureSchema(query);
      return true;
    },
    async getSetting(key) {
      const result = await query("select value from app_settings where key = $1", [key]);
      return result.rows[0] ? result.rows[0].value : null;
    },
    async setSetting(key, value) {
      await query(
        `insert into app_settings (key, value) values ($1, $2)
         on conflict (key) do update set value = excluded.value`,
        [key, value]
      );
    },
    async setSettingIfAbsent(key, value) {
      const result = await query(
        `insert into app_settings (key, value) values ($1, $2)
         on conflict (key) do nothing
         returning key`,
        [key, value]
      );
      return result.rows.length > 0;
    },
    async countLeads() {
      const result = await query("select count(*)::int as count from leads");
      return result.rows[0].count;
    },
    async hasLead(id) {
      const result = await query("select 1 from leads where id = $1", [id]);
      return result.rows.length > 0;
    },
    async insertLead(lead) {
      const payload = Object.assign({}, lead);
      if (!payload.mailedAt) delete payload.mailedAt;
      const inserted = await query(
        `insert into leads (id, payload) values ($1, $2::jsonb)
         on conflict (id) do nothing
         returning id`,
        [lead.id, JSON.stringify(payload)]
      );
      if (inserted.rows.length > 0) return "inserted";
      if (!lead.mailedAt) return "exists";
      await query(
        `update leads
         set payload = payload || jsonb_build_object('mailedAt', $2::numeric)
         where id = $1
           and not (payload ? 'mailedAt')`,
        [lead.id, lead.mailedAt]
      );
      return "mailed";
    },
    async listLeads() {
      const result = await query(
        "select payload from leads order by created_at desc limit 5000"
      );
      return result.rows.map((row) => row.payload);
    },
    async clearLeads() {
      await query("delete from leads");
    },
    async getPrices() {
      const raw = await this.getSetting("prices");
      if (!raw) return {};
      try {
        return JSON.parse(raw);
      } catch (error) {
        return {};
      }
    },
    async setPrices(prices) {
      await this.setSetting("prices", JSON.stringify(prices));
    }
  };
}

function readBody(req) {
  if (req.body && typeof req.body === "object") return Promise.resolve(req.body);
  if (typeof req.body === "string") {
    try {
      return Promise.resolve(JSON.parse(req.body));
    } catch (error) {
      return Promise.resolve({});
    }
  }
  return new Promise((resolve) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}"));
      } catch (error) {
        resolve({});
      }
    });
    req.on("error", () => resolve({}));
  });
}

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.end();
    return;
  }
  if (req.method !== "POST") {
    res.statusCode = 405;
    res.end(JSON.stringify({ ok: false, error: "Použijte POST." }));
    return;
  }
  try {
    const body = await readBody(req);
    const headerPin = req.headers["x-admin-pin"] || req.headers["X-Admin-Pin"] || "";
    const result = await handleAction({
      store: createPgStore(),
      action: body.action,
      email: body.email,
      lead: body.lead,
      prices: body.prices,
      newPin: body.newPin,
      pin: headerPin,
      ip: req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "",
      env: process.env
    });
    res.statusCode = result.status;
    res.end(JSON.stringify(result.body));
  } catch (error) {
    res.statusCode = 500;
    res.end(JSON.stringify({ ok: false, error: "Databáze je teď nedostupná." }));
  }
};
