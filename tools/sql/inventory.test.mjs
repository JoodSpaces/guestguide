// Tests for migration 030 (inventory logic) against a real Postgres running in-process (PGlite).
//   npm i --no-save @electric-sql/pglite && node tools/sql/inventory.test.mjs
// Stand-in tables have the same columns as the live database; the migration runs exactly as written.
import { PGlite } from '@electric-sql/pglite';
import fs from 'node:fs';

const migration = fs.readFileSync(new URL('../../supabase/migrations/030_inventory_logic_fixes.sql', import.meta.url), 'utf8');
const db = new PGlite();
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('  ✔', m); } else { fail++; console.log('  ✘ FAIL:', m); } };
const q = async (sql, p) => (await db.query(sql, p)).rows;
const throws = async (sql, p) => { try { await db.query(sql, p); return null; } catch (e) { return e.message; } };

await db.exec(`
  create role anon; create role authenticated; create role service_role;
  create table properties (id uuid primary key default gen_random_uuid(), name text);
  create table turnover_tasks (id uuid primary key default gen_random_uuid(), property_id uuid not null references properties(id));
  create table inventory_items (id uuid primary key default gen_random_uuid(), property_id uuid not null references properties(id) on delete cascade,
    category text not null default 'general', name text not null, unit text not null default 'pcs', par_level int not null default 0,
    current_stock int not null default 0, created_at timestamptz not null default now(), reorder_threshold_default int not null default 5);
  create table property_inventory (id uuid primary key default gen_random_uuid(), property_id uuid not null references properties(id) on delete cascade,
    item_id uuid not null references inventory_items(id) on delete cascade, quantity int not null default 0 check (quantity >= 0),
    damaged_quantity int not null default 0 check (damaged_quantity >= 0), reorder_threshold int, updated_at timestamptz not null default now(),
    avg_daily_usage numeric(10,2) not null default 0, last_restocked_at timestamptz, unique (property_id, item_id));
  create table inventory_transactions (id uuid primary key default gen_random_uuid(), property_id uuid not null, item_id uuid not null, delta int not null,
    delta_damaged int not null default 0, reason text not null, source_type text, source_id uuid, notes text, created_by text not null default 'system',
    created_at timestamptz not null default now());
  create table turnover_damage_items (id uuid primary key default gen_random_uuid(), turnover_task_id uuid not null references turnover_tasks(id) on delete cascade,
    item_id uuid not null references inventory_items(id) on delete cascade, quantity int not null default 1 check (quantity > 0),
    condition text not null default 'damaged' check (condition in ('damaged','missing','needs_cleaning')), notes text, created_at timestamptz not null default now(),
    constraint uq_turnover_damage_item unique (turnover_task_id, item_id));
  create table inventory_alerts (id uuid primary key default gen_random_uuid(), property_id uuid not null, item_id uuid not null, alert_type text not null,
    source_type text, source_id uuid, resolved_at timestamptz, created_at timestamptz not null default now(), severity text not null default 'medium', message text);
  -- the triggers 006/009/016 installed; 030 replaces the function bodies
  create function handle_turnover_damage() returns trigger language plpgsql as $$ begin return new; end $$;
  create function handle_turnover_damage_delete() returns trigger language plpgsql as $$ begin return old; end $$;
  create function auto_resolve_stale_alerts() returns void language sql as $$ select 1 $$;
  create function handle_inventory_restock() returns trigger language plpgsql as $$ begin return new; end $$;
  create trigger on_turnover_damage_insert after insert on turnover_damage_items for each row execute function handle_turnover_damage();
  create trigger on_turnover_damage_delete after delete on turnover_damage_items for each row execute function handle_turnover_damage_delete();
  create trigger on_property_inventory_update after update on property_inventory for each row execute function handle_inventory_restock();
`);
await db.exec(migration);
console.log('Migration 030 executed without error');
await db.exec(migration);
console.log('…and runs a second time (idempotent)');

const prop = (await q(`insert into properties(name) values ('Villa') returning id`))[0].id;
const prop2 = (await q(`insert into properties(name) values ('Other') returning id`))[0].id;
const item = async (name, par, stock, p = prop) => {
  const id = (await q(`insert into inventory_items(property_id, name, par_level) values ($1,$2,$3) returning id`, [p, name, par]))[0].id;
  await q(`select adjust_inventory($1,$2,null,$3,'test')`, [p, id, stock]);
  return id;
};
const qty = async (id) => (await q(`select quantity, damaged_quantity from property_inventory where item_id=$1`, [id]))[0];
const openAlerts = async (id, type) => q(`select severity, message from inventory_alerts where item_id=$1 and alert_type=$2 and resolved_at is null`, [id, type]);
const task = async (p = prop) => (await q(`insert into turnover_tasks(property_id) values ($1) returning id`, [p]))[0].id;
const damage = (t, i, n, cond = 'damaged') => q(`insert into turnover_damage_items(turnover_task_id,item_id,quantity,condition) values ($1,$2,$3,$4) returning id`, [t, i, n, cond]);

console.log('\n1. Low stock: one rule, the same as the screen (below par = low, 0 = out)');
let towels = await item('Towels', 6, 6);
ok((await openAlerts(towels, 'low_stock')).length === 0, 'at par → no alert (it used to alert "6 remaining (min 6)")');
await q(`select adjust_inventory($1,$2,-1,null,'t')`, [prop, towels]);
let a = await openAlerts(towels, 'low_stock');
ok(a.length === 1 && a[0].severity === 'medium' && a[0].message === 'Towels: 5 of 6 (below par)', `below par → medium alert: "${a[0]?.message}"`);
await q(`select adjust_inventory($1,$2,null,0,'t')`, [prop, towels]);
a = await openAlerts(towels, 'low_stock');
ok(a.length === 1 && a[0].severity === 'critical' && /out of stock/.test(a[0].message), 'zero → the same alert becomes critical (not a second one)');
await q(`select adjust_inventory($1,$2,null,6,'t')`, [prop, towels]);
ok((await openAlerts(towels, 'low_stock')).length === 0, 'back to par → alert closes');
let loose = await item('Loose', 0, 0);
ok((await openAlerts(loose, 'low_stock')).length === 0, 'par 0 means not tracked: no alert even at zero');
await q(`update inventory_items set par_level = 4 where id=$1`, [loose]);
await q(`select check_low_stock($1,$2)`, [prop, loose]);
ok((await openAlerts(loose, 'low_stock')).length === 1, 'raising par re-evaluates');
ok((await throws(`insert into inventory_alerts(property_id,item_id,alert_type) values ($1,$2,'low_stock')`, [prop, loose]))?.includes('uq_inventory_alerts_open'), 'two open alerts of one type for one item are impossible');

console.log('\n2. Hand edits: relative, recorded, never negative');
let cups = await item('Cups', 0, 10);
ok((await q(`select current_stock from inventory_items where id=$1`, [cups]))[0].current_stock === 10, 'the item mirror follows the stock');
ok(await q(`select adjust_inventory($1,$2,3,null,'Mona') n`, [prop, cups]).then((r) => r[0].n) === 13, '+3 → 13');
ok(await q(`select adjust_inventory($1,$2,-20,null,'Mona') n`, [prop, cups]).then((r) => r[0].n) === 0, 'more than is there → clamps at 0, not negative');
let tx = await q(`select delta, reason, created_by from inventory_transactions where item_id=$1 order by created_at, id`, [cups]);
ok(tx.length === 3 && tx[1].delta === 3 && tx[1].reason === 'manual_restock' && tx[1].created_by === 'Mona' && tx[2].delta === -13 && tx[2].reason === 'manual_adjustment', 'every edit is in the log, with who and why');
await q(`select adjust_inventory($1,$2,0,null,'x')`, [prop, cups]);
ok((await q(`select count(*)::int c from inventory_transactions where item_id=$1`, [cups]))[0].c === 3, 'a no-change edit writes nothing');
ok((await throws(`select adjust_inventory($1,$2,1,1,'x')`, [prop, cups]))?.includes('exactly one'), 'delta and set together are refused');
ok((await throws(`select adjust_inventory($1,$2,1,null,'x')`, [prop2, cups]))?.includes('Unknown item'), "another property's item is refused");
ok((await throws(`select adjust_inventory($1,$2,null,-1,'x')`, [prop, cups]))?.includes('negative'), 'a negative recount is refused');
await q(`update inventory_items set archived_at = now() where id=$1`, [cups]);
ok((await throws(`select adjust_inventory($1,$2,1,null,'x')`, [prop, cups]))?.includes('Unknown item'), 'an archived item cannot be edited');
ok((await q(`select last_restocked_at is not null r from property_inventory where item_id=$1`, [towels]))[0].r, 'a restock stamps the date');

console.log('\n3. Damage: takes out what was really there, and is undone exactly');
let plates = await item('Plates', 0, 5);
let t1 = await task();
let d1 = (await damage(t1, plates, 2))[0].id;
let s = await qty(plates);
ok(s.quantity === 3 && s.damaged_quantity === 2, 'damaged 2 of 5 → 3 usable, 2 damaged');
await q(`delete from turnover_damage_items where id=$1`, [d1]);
s = await qty(plates);
ok(s.quantity === 5 && s.damaged_quantity === 0, 'deleting the record puts it all back (stock and damaged counter)');

let mugs = await item('Mugs', 0, 1);
let t2 = await task();
let d2 = (await damage(t2, mugs, 3))[0].id;
s = await qty(mugs);
ok(s.quantity === 0 && s.damaged_quantity === 3, 'damaged 3 with only 1 in stock → stock stops at 0');
await q(`delete from turnover_damage_items where id=$1`, [d2]);
s = await qty(mugs);
ok(s.quantity === 1 && s.damaged_quantity === 0, 'and the undo gives back 1, not 3 (it used to invent stock)');

let forks = await item('Forks', 0, 4);
let t3 = await task();
let d3 = (await damage(t3, forks, 2, 'missing'))[0].id;
s = await qty(forks);
ok(s.quantity === 2 && s.damaged_quantity === 0, 'missing 2 → stock down, nothing in the damaged pile');
await q(`delete from turnover_damage_items where id=$1`, [d3]);
ok((await qty(forks)).quantity === 4, 'undo restores it');
let d4 = (await damage(t3, forks, 2, 'needs_cleaning'))[0].id;
ok((await qty(forks)).quantity === 4, 'needs cleaning → no stock change');
await q(`delete from turnover_damage_items where id=$1`, [d4]);
ok((await qty(forks)).quantity === 4, 'and deleting it does not add stock (it used to add 2)');

ok((await throws(`insert into turnover_damage_items(turnover_task_id,item_id,quantity) values ($1,$2,1)`, [await task(prop2), plates]))?.includes('does not belong'), "a damage record cannot name another property's item");

console.log('\n4. Recurring damage: real events that still stand');
let lamps = await item('Lamps', 0, 10);
for (let i = 0; i < 2; i++) await damage(await task(), lamps, 1);
await damage(await task(), lamps, 1, 'needs_cleaning');
ok((await openAlerts(lamps, 'recurring_damage')).length === 0, 'two damages and a cleaning → no pattern yet (cleaning is not damage)');
let d5 = (await damage(await task(), lamps, 1))[0].id;
a = await openAlerts(lamps, 'recurring_damage');
ok(a.length === 1 && a[0].severity === 'medium' && /3×/.test(a[0].message), `three damage events → alert: "${a[0]?.message}"`);
await q(`delete from turnover_damage_items where id=$1`, [d5]);
ok((await openAlerts(lamps, 'recurring_damage')).length === 0, 'deleting one of them clears the alert by itself');
for (let i = 0; i < 3; i++) await damage(await task(), lamps, 1, 'missing');
a = await openAlerts(lamps, 'recurring_damage');
ok(a.length === 1 && a[0].severity === 'critical', 'five events → critical');

console.log('\n5. Usage rate: consumption only, not inflated by a busy day');
let soap = await item('Soap', 0, 50);
await q(`insert into inventory_transactions(property_id,item_id,delta,reason) values ($1,$2,-11,'service_fulfillment')`, [prop, soap]);
await q(`select update_usage_rate($1,$2)`, [prop, soap]);
let u = Number((await q(`select avg_daily_usage u from property_inventory where item_id=$1`, [soap]))[0].u);
ok(u === 0.79, `11 used on day one → ${u}/day (it used to read 11.00)`);
await damage(await task(), soap, 5);
await q(`select update_usage_rate($1,$2)`, [prop, soap]);
ok(Number((await q(`select avg_daily_usage u from property_inventory where item_id=$1`, [soap]))[0].u) === 0.79, 'damage is not consumption');

console.log('\n6. Health view does not multiply rows');
let hp = (await q(`insert into properties(name) values ('Health') returning id`))[0].id;
let h1 = await item('A', 5, 2, hp), h2 = await item('B', 5, 9, hp);
for (let i = 0; i < 5; i++) { await q(`select adjust_inventory($1,$2,null,$3,'t')`, [hp, h1, i % 2 ? 6 : 1]); }   // low, ok, low, ok, low: four alerts raised and closed over time
const h = (await q(`select * from inventory_health where property_id=$1`, [hp]))[0];
ok(Number(h.tracked_items) === 2 && Number(h.low_stock) === 1 && Number(h.out_of_stock) === 0, `2 items tracked, 1 low (not multiplied by alert history): ${h.tracked_items}/${h.low_stock}/${h.out_of_stock}`);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
