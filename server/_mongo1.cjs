const m = require('mongoose');
(async () => {
  await m.connect('mongodb+srv://leelavinayakkothakota155_db_user:uQn1SZqYXehmHD9f@cluster0.ie972jx.mongodb.net/test', { serverSelectionTimeoutMS: 8000 });
  const db = m.connection.db;
  const camps = await db.collection('campaigns').find({}).toArray();
  const c = camps.find((x) => !x.design);
  console.log('CAMPAIGN (design NULL):');
  console.log(JSON.stringify({
    title: c.title, subject: c.subject, body: c.body, design: c.design,
    posterImage: c.posterImage, posterPosition: c.posterPosition,
    listFile: c.listFile, columns: c.columns, status: c.status,
    sent: c.sent, failed: c.failed, total: c.total, error: c.error,
  }, null, 1));
  const recs = await db.collection('recipients').find({ campaignId: c._id }).toArray();
  console.log('RECIPIENTS:', recs.map((r) => JSON.stringify({ row: r.row, data: r.data, status: r.status, error: r.error })));
  process.exit(0);
})().catch((e) => { console.error('ERR', e.message); process.exit(1); });