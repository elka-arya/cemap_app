function createMemoryStore() {
  const leads = new Map();
  const settings = new Map();
  return {
    async ready() {
      return true;
    },
    async getSetting(key) {
      return settings.has(key) ? settings.get(key) : null;
    },
    async setSetting(key, value) {
      settings.set(key, value);
    },
    async setSettingIfAbsent(key, value) {
      if (settings.has(key)) return false;
      settings.set(key, value);
      return true;
    },
    async countLeads() {
      return leads.size;
    },
    async hasLead(id) {
      return leads.has(id);
    },
    async insertLead(lead) {
      const current = leads.get(lead.id);
      if (!current) {
        const copy = Object.assign({}, lead);
        if (!copy.mailedAt) delete copy.mailedAt;
        leads.set(lead.id, copy);
        return "inserted";
      }
      if (!current.mailedAt && lead.mailedAt) {
        current.mailedAt = lead.mailedAt;
        return "mailed";
      }
      return "exists";
    },
    async listLeads() {
      return Array.from(leads.values()).sort((a, b) => b.createdAt - a.createdAt);
    },
    async clearLeads() {
      leads.clear();
    },
    async getPrices() {
      const raw = settings.get("prices");
      if (!raw) return {};
      try {
        return JSON.parse(raw);
      } catch (error) {
        return {};
      }
    },
    async setPrices(prices) {
      settings.set("prices", JSON.stringify(prices));
    }
  };
}

module.exports = { createMemoryStore };
