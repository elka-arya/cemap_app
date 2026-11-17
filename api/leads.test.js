const assert = require("assert");
const { handleAction } = require("./lead-logic");
const { createMemoryStore } = require("./memory-store");

function lead(extra) {
  return Object.assign({
    id: "dev-1-abc",
    name: "Jana Nováková",
    email: "jana@example.com",
    phone: "",
    score: 8,
    level: "CeMap Profík",
    regionId: "praha",
    regionName: "Hlavní město Praha",
    guessedPrice: 6800000,
    createdAt: 1000,
    deviceId: "dev-1",
    timestamp: "17. 11. 2026 21:00"
  }, extra);
}

async function main() {
  const store = createMemoryStore();
  const noDb = {
    async ready() {
      return false;
    }
  };
  const offline = await handleAction({ store: noDb, action: "list", pin: "1234" });
  assert.strictEqual(offline.body.shared, false);

  const denied = await handleAction({ store, action: "list", pin: "1234", ip: "10.0.0.1" });
  assert.strictEqual(denied.status, 200);
  assert.strictEqual(denied.body.leads.length, 0);

  const saved = await handleAction({ store, action: "upsert", lead: lead() });
  assert.strictEqual(saved.body.shared, true);

  const renamed = await handleAction({
    store,
    action: "upsert",
    lead: lead({ name: "Někdo jiný", email: "jiny@example.com" })
  });
  assert.strictEqual(renamed.status, 200);
  const listed = await handleAction({ store, action: "list", pin: "1234", ip: "10.0.0.1" });
  assert.strictEqual(listed.body.leads[0].name, "Jana Nováková");

  await handleAction({
    store,
    action: "upsert",
    lead: lead({ mailedAt: 123456 })
  });
  const mailed = await handleAction({ store, action: "list", pin: "1234", ip: "10.0.0.1" });
  assert.strictEqual(mailed.body.leads[0].mailedAt, 123456);

  const wrong = await handleAction({ store, action: "list", pin: "9999", ip: "10.0.0.2" });
  assert.strictEqual(wrong.status, 401);

  await handleAction({
    store,
    action: "prices",
    pin: "1234",
    ip: "10.0.0.1",
    prices: { praha: 7000000, "bad id": 1, olomouc: 50 }
  });
  const withPrices = await handleAction({ store, action: "list", pin: "1234", ip: "10.0.0.1" });
  assert.deepStrictEqual(withPrices.body.prices, { praha: 7000000 });

  const changed = await handleAction({
    store,
    action: "change-pin",
    pin: "1234",
    newPin: "4321",
    ip: "10.0.0.1"
  });
  assert.strictEqual(changed.status, 200);
  const oldPin = await handleAction({ store, action: "list", pin: "1234", ip: "10.0.0.3" });
  assert.strictEqual(oldPin.status, 401);
  const cleared = await handleAction({ store, action: "clear", pin: "4321", ip: "10.0.0.1" });
  assert.strictEqual(cleared.body.shared, true);
  const empty = await handleAction({ store, action: "list", pin: "4321", ip: "10.0.0.1" });
  assert.strictEqual(empty.body.leads.length, 0);

  const locked = await handleAction({
    store,
    action: "prices",
    pin: "4321",
    ip: "10.0.0.1",
    now: Date.parse("2026-11-19T12:00:00+01:00"),
    prices: { praha: 8000000 }
  });
  assert.strictEqual(locked.status, 400);
  const duringContest = await handleAction({
    store,
    action: "list",
    pin: "4321",
    ip: "10.0.0.1",
    now: Date.parse("2026-11-19T18:00:00+01:00")
  });
  assert.deepStrictEqual(duringContest.body.prices, {});

  const rejected = await handleAction({
    store,
    action: "upsert",
    lead: lead({ id: "x", email: "ne-email" })
  });
  assert.strictEqual(rejected.status, 400);

  console.log("lead logic ok");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
