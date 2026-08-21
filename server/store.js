import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { isMongo } from './services/db.js';

/* ---------------- Mongoose models (used when MongoDB is available) ---------------- */

const UserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true },
    phone: String,
    profession: String,
    orgName: String,
    orgPhone: String,
    designation: String,
  },
  { timestamps: true }
);

const SettingSchema = new mongoose.Schema(
  {
    key: { type: String, default: 'global' },
    smtp: {
      host: String,
      port: Number,
      user: String,
      pass: String,
      secure: Boolean,
      fromName: String,
      fromEmail: String,
    },
    testMode: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const ListSchema = new mongoose.Schema(
  {
    userId: { type: String, index: true },
    filename: String,
    columns: [String],
    rows: [mongoose.Schema.Types.Mixed],
  },
  { timestamps: true }
);

const CampaignSchema = new mongoose.Schema(
  {
    userId: { type: String, index: true },
    title: String,
    subject: String,
    body: String,
    posterImage: String,
    posterPosition: { type: String, default: 'top' },
    design: mongoose.Schema.Types.Mixed,
    listFile: String,
    columns: [String],
    status: { type: String, default: 'sending' },
    simulated: { type: Boolean, default: false },
    total: { type: Number, default: 0 },
    sent: { type: Number, default: 0 },
    failed: { type: Number, default: 0 },
    sentAt: Date,
    failedAt: Date,
    error: String,
  },
  { timestamps: true }
);

const RecipientSchema = new mongoose.Schema(
  {
    campaignId: mongoose.Schema.Types.ObjectId,
    row: Number,
    data: mongoose.Schema.Types.Mixed,
    status: { type: String, default: 'pending' },
    error: String,
    sentAt: Date,
  },
  { timestamps: true }
);

const TemplateSchema = new mongoose.Schema(
  {
    userId: { type: String, index: true },
    name: String,
    subject: String,
    body: String,
    posterImage: String,
    posterPosition: { type: String, default: 'top' },
    design: mongoose.Schema.Types.Mixed,
  },
  { timestamps: true }
);

const User = mongoose.model('User', UserSchema);
const Setting = mongoose.model('Setting', SettingSchema);
const List = mongoose.model('List', ListSchema);
const Campaign = mongoose.model('Campaign', CampaignSchema);
const Recipient = mongoose.model('Recipient', RecipientSchema);
const Template = mongoose.model('Template', TemplateSchema);

/* ---------------- In-memory fallback store ---------------- */

const memory = {
  users: [],
  settings: new Map(),
  lists: [],
  campaigns: [],
  recipients: [],
  templates: [],
  idSeq: {},
};
const nextId = (key) => (memory.idSeq[key] = (memory.idSeq[key] || 0) + 1);

const stringify = (v) => (v !== undefined && v !== null ? String(v) : '');

/* ---------------- Unified data layer ---------------- */

export const store = {
  /* ---- Users ---- */

  async createUser({ name, email, password, phone, profession, orgName, orgPhone, designation }) {
    const extra = {
      phone: phone || '',
      profession: profession || '',
      orgName: orgName || '',
      orgPhone: orgPhone || '',
      designation: designation || '',
    };
    if (isMongo()) {
      const doc = await User.create({ name, email: String(email).toLowerCase(), password, ...extra });
      return doc.toObject();
    }
    if (memory.users.some((u) => u.email.toLowerCase() === String(email).toLowerCase())) {
      const e = new Error('An account with this email already exists');
      e.code = 11000;
      throw e;
    }
    const doc = { _id: `u_${nextId('user')}`, id: `u_${memory.idSeq.user}`, name, email: String(email).toLowerCase(), password, ...extra, createdAt: new Date() };
    memory.users.push(doc);
    return { ...doc };
  },

  async findUserByEmail(email) {
    const target = String(email).toLowerCase();
    if (isMongo()) return User.findOne({ email: target }).lean();
    const u = memory.users.find((x) => x.email.toLowerCase() === target);
    return u ? { ...u } : null;
  },

  async findUserById(id) {
    if (isMongo()) return User.findById(id).lean();
    const u = memory.users.find((x) => x._id === id || x.id === id);
    return u ? { ...u } : null;
  },

  async verifyPassword(user, password) {
    return bcrypt.compare(password || '', user.password || '');
  },

  async updateUserPassword(userId, passwordHash) {
    if (isMongo()) {
      return User.findByIdAndUpdate(userId, { $set: { password: passwordHash } }, { new: true }).lean();
    }
    const u = memory.users.find((x) => x._id === userId || x.id === userId);
    if (u) u.password = passwordHash;
    return u ? { ...u } : null;
  },

  async updateUser(userId, { name, email, phone, profession, orgName, orgPhone, designation }) {
    const target = String(email || '').toLowerCase();
    if (isMongo()) {
      if (target) {
        const existing = await User.findOne({ email: target });
        if (existing && String(existing._id) !== String(userId)) {
          const e = new Error('An account with this email already exists');
          e.code = 11000;
          throw e;
        }
      }
      const patch = {};
      if (name) patch.name = name;
      if (target) patch.email = target;
      if (phone !== undefined) patch.phone = phone;
      if (profession !== undefined) patch.profession = profession;
      if (orgName !== undefined) patch.orgName = orgName;
      if (orgPhone !== undefined) patch.orgPhone = orgPhone;
      if (designation !== undefined) patch.designation = designation;
      return User.findByIdAndUpdate(userId, { $set: patch }, { new: true }).lean();
    }
    const u = memory.users.find((x) => x._id === userId || x.id === userId);
    if (!u) return null;
    if (name) u.name = name;
    if (target && u.email.toLowerCase() !== target) {
      if (memory.users.some((x) => x !== u && x.email.toLowerCase() === target)) {
        const e = new Error('An account with this email already exists');
        e.code = 11000;
        throw e;
      }
      u.email = target;
    }
    if (phone !== undefined) u.phone = String(phone);
    if (profession !== undefined) u.profession = String(profession);
    if (orgName !== undefined) u.orgName = String(orgName);
    if (orgPhone !== undefined) u.orgPhone = String(orgPhone);
    if (designation !== undefined) u.designation = String(designation);
    return { ...u };
  },

  staticUser(user) {
    if (!user) return null;
    return {
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone || '',
      profession: user.profession || '',
      orgName: user.orgName || '',
      orgPhone: user.orgPhone || '',
      designation: user.designation || '',
      createdAt: user.createdAt || null,
    };
  },

  /* ---- Settings (scoped by user) ---- */

  async getSetting(userId) {
    const key = stringify(userId);
    if (isMongo()) return Setting.findOne({ key }).lean() || null;
    return memory.settings.get(key) ? { ...memory.settings.get(key) } : null;
  },

  async saveSetting(userId, data) {
    const key = stringify(userId);
    if (isMongo()) {
      return Setting.findOneAndUpdate({ key }, { $set: data }, { upsert: true, new: true }).lean();
    }
    memory.settings.set(key, { ...data });
    return { ...memory.settings.get(key) };
  },

  /* ---- Lists (scoped by user) ---- */

  async saveList(data) {
    if (isMongo()) {
      const doc = await List.create(data);
      return { id: doc._id.toString(), ...data };
    }
    const id = nextId('list');
    const doc = { id, ...data, createdAt: new Date() };
    memory.lists.push(doc);
    return { ...doc };
  },

  async getList(id, userId) {
    const q = { _id: id, ...(userId ? { userId: stringify(userId) } : {}) };
    if (isMongo()) return List.findOne(q).lean();
    return (
      memory.lists.find((l) => String(l.id) === String(id) && (!userId || stringify(l.userId) === stringify(userId))) || null
    );
  },

  /* ---- Campaigns (scoped by user) ---- */

  async createCampaign(data) {
    if (isMongo()) {
      const doc = await Campaign.create(data);
      return { ...doc.toObject(), _id: doc._id.toString() };
    }
    const doc = { _id: `mem_${nextId('campaign')}`, ...data, createdAt: new Date(), updatedAt: new Date() };
    memory.campaigns.push(doc);
    return { ...doc };
  },

  async getCampaign(id, userId) {
    if (isMongo()) {
      const doc = userId ? await Campaign.findOne({ _id: id, userId: stringify(userId) }).lean() : await Campaign.findById(id).lean();
      return doc ? { ...doc, _id: String(doc._id) } : null;
    }
    const c = memory.campaigns.find((x) => String(x._id) === String(id) && (!userId || stringify(x.userId) === stringify(userId)));
    return c ? { ...c } : null;
  },

  async updateCampaign(id, patch) {
    if (isMongo()) {
      const doc = await Campaign.findByIdAndUpdate(id, { $set: patch }, { new: true }).lean();
      return doc ? { ...doc, _id: String(doc._id) } : null;
    }
    const c = memory.campaigns.find((x) => String(x._id) === String(id));
    if (c) Object.assign(c, patch, { updatedAt: new Date() });
    return c ? { ...c } : null;
  },

  async listCampaigns(userId) {
    if (isMongo()) return (await Campaign.find({ userId: stringify(userId) }).sort({ createdAt: -1 }).lean()).map((c) => ({ ...c, _id: String(c._id) }));
    return memory.campaigns
      .filter((c) => stringify(c.userId) === stringify(userId))
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .map((c) => ({ ...c }));
  },

  async deleteCampaign(id, userId) {
    if (isMongo()) return Campaign.findOneAndDelete({ _id: id, userId: stringify(userId) });
    const i = memory.campaigns.findIndex((c) => String(c._id) === String(id) && stringify(c.userId) === stringify(userId));
    if (i >= 0) memory.campaigns.splice(i, 1);
    return i >= 0 ? { ok: true } : null;
  },

  /* ---- Recipients (scoped by campaign) ---- */

  async bulkInsertRecipients(campaignId, rows) {
    if (isMongo()) {
      await Recipient.insertMany(
        rows.map((r) => ({ campaignId: new mongoose.Types.ObjectId(campaignId), row: r.row, data: r.data }))
      );
      return;
    }
    rows.forEach((r) => {
      memory.recipients.push({ _id: `r_${nextId('recipient')}`, campaignId: String(campaignId), row: r.row, data: r.data, status: 'pending' });
    });
  },

  async getRecipients(campaignId, status) {
    let list;
    if (isMongo()) {
      const q = { campaignId: new mongoose.Types.ObjectId(campaignId) };
      if (status) q.status = status;
      list = await Recipient.find(q).sort({ row: 1 }).lean();
    } else {
      list = memory.recipients
        .filter((r) => String(r.campaignId) === String(campaignId) && (!status || r.status === status))
        .sort((a, b) => a.row - b.row)
        .map((r) => ({ ...r }));
    }
    return list;
  },

  async updateRecipient(campaignId, row, patch) {
    if (isMongo()) {
      return Recipient.findOneAndUpdate(
        { campaignId: new mongoose.Types.ObjectId(campaignId), row },
        { $set: patch },
        { new: true }
      ).lean();
    }
    const r = memory.recipients.find((x) => String(x.campaignId) === String(campaignId) && x.row === row);
    if (r) Object.assign(r, patch);
    return r ? { ...r } : null;
  },

  async countRecipients(campaignId, status) {
    if (isMongo()) {
      return Recipient.countDocuments({
        campaignId: new mongoose.Types.ObjectId(campaignId),
        ...(status ? { status } : {}),
      });
    }
    return memory.recipients.filter((r) => String(r.campaignId) === String(campaignId) && (!status || r.status === status)).length;
  },

  /* ---- Templates (scoped by user) ---- */

  async createTemplate(data) {
    if (isMongo()) {
      const doc = await Template.create(data);
      return { ...doc.toObject(), _id: String(doc._id) };
    }
    const doc = { _id: `tpl_${nextId('template')}`, ...data, createdAt: new Date(), updatedAt: new Date() };
    memory.templates.push(doc);
    return { ...doc };
  },

  async getTemplate(id, userId) {
    if (isMongo()) {
      const doc = userId ? await Template.findOne({ _id: id, userId: stringify(userId) }).lean() : await Template.findById(id).lean();
      return doc ? { ...doc, _id: String(doc._id) } : null;
    }
    const t = memory.templates.find(
      (x) => String(x._id) === String(id) && (!userId || stringify(x.userId) === stringify(userId))
    );
    return t ? { ...t } : null;
  },

  async updateTemplate(id, userId, patch) {
    if (isMongo()) {
      const doc = await Template.findOneAndUpdate(
        { _id: id, userId: stringify(userId) },
        { $set: patch },
        { new: true }
      ).lean();
      return doc ? { ...doc, _id: String(doc._id) } : null;
    }
    const t = memory.templates.find(
      (x) => String(x._id) === String(id) && stringify(x.userId) === stringify(userId)
    );
    if (t) Object.assign(t, patch, { updatedAt: new Date() });
    return t ? { ...t } : null;
  },

  async deleteTemplate(id, userId) {
    if (isMongo()) return Template.findOneAndDelete({ _id: id, userId: stringify(userId) });
    const i = memory.templates.findIndex(
      (x) => String(x._id) === String(id) && stringify(x.userId) === stringify(userId)
    );
    if (i >= 0) memory.templates.splice(i, 1);
    return i >= 0 ? { ok: true } : null;
  },

  async listTemplates(userId) {
    if (isMongo()) {
      return (await Template.find({ userId: stringify(userId) }).sort({ createdAt: -1 }).lean()).map((t) => ({
        ...t,
        _id: String(t._id),
      }));
    }
    return memory.templates
      .filter((t) => stringify(t.userId) === stringify(userId))
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .map((t) => ({ ...t }));
  },
};