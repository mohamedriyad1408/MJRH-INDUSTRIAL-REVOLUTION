#!/usr/bin/env node
// MJRH — Demo Seed Data Script
// Creates realistic demo data for sales demos and testing.
// Usage: DEMO_TENANT_ID=xxx node scripts/seed-demo-data.mjs

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "https://dngjfjrjddigqadlyain.supabase.co";
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const TENANT_ID = process.env.DEMO_TENANT_ID;

if (!SERVICE_KEY) {
  console.error("Missing SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}
if (!TENANT_ID) {
  console.error("Missing DEMO_TENANT_ID");
  process.exit(1);
}

const sb = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

const CUSTOMERS = [
  { full_name: "أحمد محمد علي", phone: "01012345678", address: "التجمع الخامس، القاهرة الجديدة" },
  { full_name: "فاطمة حسن إبراهيم", phone: "01123456789", address: "مدينة نصر، القاهرة" },
  { full_name: "محمد عبدالله السعود", phone: "0551234567", address: "الرياض، حي النخيل" },
  { full_name: "نورة خالد الراشد", phone: "0501234567", address: "جدة، حي الروضة" },
  { full_name: "خالد أحمد المنصور", phone: "01223456789", address: "دبي، مارينا" },
  { full_name: "سارة ياسر الحسن", phone: "01098765432", address: "الشيخ زايد، الجيزة" },
  { full_name: "عمر حسن فتحي", phone: "01187654321", address: "المعادي، القاهرة" },
  { full_name: "ليلى محمود حسين", phone: "0551987654", address: "الدمام، حي الفيصلية" },
];

const SERVICES = [
  { name: "غسيل قميص", name_en: "Shirt Wash", unit_price: 25, service_type: "cleaning", category: "رجالي" },
  { name: "كي قميص", name_en: "Shirt Iron", unit_price: 15, service_type: "ironing", category: "رجالي" },
  { name: "غسيل وكي بدلة", name_en: "Suit Clean & Press", unit_price: 80, service_type: "both", category: "رجالي" },
  { name: "غسيل فستان", name_en: "Dress Wash", unit_price: 45, service_type: "cleaning", category: "حريمي" },
  { name: "كي فستان", name_en: "Dress Iron", unit_price: 25, service_type: "ironing", category: "حريمي" },
  { name: "غسيل ملاية سرير", name_en: "Bed Sheet Wash", unit_price: 35, service_type: "cleaning", category: "مفروشات" },
  { name: "تنظيف سجادة", name_en: "Carpet Cleaning", unit_price: 120, service_type: "cleaning", category: "سجاد" },
  { name: "غسيل عباية", name_en: "Abaya Wash", unit_price: 30, service_type: "cleaning", category: "حريمي" },
  { name: "كي بنطلون", name_en: "Pants Iron", unit_price: 20, service_type: "ironing", category: "رجالي" },
  { name: "غسيل وكي معطف", name_en: "Coat Clean & Press", unit_price: 60, service_type: "both", category: "رجالي" },
];

async function main() {
  console.log("MJRH Demo Seed Data Generator");
  console.log("=============================\n");
  console.log(`Tenant: ${TENANT_ID}\n`);

  // 1. Get or create branch
  let { data: branches } = await sb.from("branches").select("id").eq("tenant_id", TENANT_ID).limit(1);
  let branchId = branches?.[0]?.id;
  if (!branchId) {
    const { data: b } = await sb.from("branches").insert({ tenant_id: TENANT_ID, name: "الفرع الرئيسي", is_active: true }).select("id").single();
    branchId = b.id;
    console.log(`✅ Created branch: ${branchId}`);
  } else {
    console.log(`✅ Using existing branch: ${branchId}`);
  }

  // 2. Create customers
  const createdCustomers = [];
  for (const c of CUSTOMERS) {
    const { data, error } = await sb
      .from("customers")
      .upsert({ tenant_id: TENANT_ID, ...c }, { onConflict: "tenant_id,phone" })
      .select("id, full_name")
      .single();
    if (data) createdCustomers.push(data);
    if (error) console.warn(`⚠️ Customer ${c.full_name}: ${error.message}`);
  }
  console.log(`✅ ${createdCustomers.length} customers ready`);

  // 3. Create services
  const createdServices = [];
  for (const s of SERVICES) {
    const { data, error } = await sb
      .from("service_items")
      .upsert({ tenant_id: TENANT_ID, is_active: true, ...s }, { onConflict: "tenant_id,name" })
      .select("id, name, unit_price, service_type")
      .single();
    if (data) createdServices.push(data);
    if (error) console.warn(`⚠️ Service ${s.name}: ${error.message}`);
  }
  console.log(`✅ ${createdServices.length} services ready`);

  // 4. Create demo orders
  const statuses = ["received", "cleaning", "ironing", "packing", "ready", "delivered"];
  let ordersCreated = 0;

  for (let i = 0; i < 12; i++) {
    const customer = createdCustomers[i % createdCustomers.length];
    const status = statuses[Math.min(i, statuses.length - 1)];
    const daysAgo = Math.floor(Math.random() * 7);
    const createdAt = new Date(Date.now() - daysAgo * 86400000).toISOString();

    // Pick 2-4 random services
    const numItems = 2 + Math.floor(Math.random() * 3);
    const items = [];
    const usedIndices = new Set();
    for (let j = 0; j < numItems; j++) {
      let idx;
      do { idx = Math.floor(Math.random() * createdServices.length); } while (usedIndices.has(idx));
      usedIndices.add(idx);
      const svc = createdServices[idx];
      const qty = 1 + Math.floor(Math.random() * 3);
      items.push({ svc, qty });
    }

    const subtotal = items.reduce((s, it) => s + it.qty * Number(it.svc.unit_price), 0);

    const { data: order, error: oErr } = await sb
      .from("orders")
      .insert({
        tenant_id: TENANT_ID,
        branch_id: branchId,
        customer_id: customer.id,
        order_type: i % 3 === 0 ? "delivery" : "walk_in",
        status,
        payment_status: status === "delivered" ? "paid" : i % 2 === 0 ? "paid" : "unpaid",
        subtotal,
        total: subtotal,
        created_at: createdAt,
        is_urgent: i % 5 === 0,
      })
      .select("id, order_number")
      .single();

    if (oErr) {
      console.warn(`⚠️ Order ${i + 1}: ${oErr.message}`);
      continue;
    }

    // Create order items
    for (const it of items) {
      await sb.from("order_items").insert({
        order_id: order.id,
        tenant_id: TENANT_ID,
        service_item_id: it.svc.id,
        name: it.svc.name,
        service_type: it.svc.service_type,
        qty: it.qty,
        unit_price: it.svc.unit_price,
        line_total: it.qty * Number(it.svc.unit_price),
      });
    }

    ordersCreated++;
  }

  console.log(`✅ ${ordersCreated} demo orders created`);
  console.log("\n🎉 Demo seed complete!");
  console.log(`\nView at: https://mjrh.vercel.app/<your-slug>/orders`);
}

main().catch(console.error);
