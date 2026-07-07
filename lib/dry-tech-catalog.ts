import { supabase } from"@/integrations/supabase/client";

export type DryTechItem = {
 name: string;
 service_type:"both"|"ironing"|"cleaning";
 unit_price: number;
 category:"رجالي"|"حريمي"|"أطفال"|"تنظيف المفروشات"|"سجاد وموكيت"|"توصيل وخدمات";
};

export const POS_CATEGORY_TABS = [
 { id:"all", label:"كافة الأصناف", icon:""},
 { id:"رجالي", label:"رجالي", icon:""},
 { id:"حريمي", label:"حريمي", icon:""},
 { id:"أطفال", label:"أطفال", icon:""},
 { id:"تنظيف المفروشات", label:"المفروشات", icon:""},
 { id:"سجاد وموكيت", label:"سجاد وموكيت", icon:""},
 { id:"توصيل وخدمات", label:"توصيل وخدمات", icon:""},
];

export const DRY_TECH_CATALOG_SEED: DryTechItem[] = [
 // 1. رجالي (Men's)
 { name:"بدلة رجالي قطعتين دراي كلين", service_type:"both", unit_price: 250, category:"رجالي"},
 { name:"بدلة رجالي 3قطع دراي كلين", service_type:"both", unit_price: 300, category:"رجالي"},
 { name:"بدلة ميرى", service_type:"both", unit_price: 150, category:"رجالي"},
 { name:"بالطو صوف دراي كلين", service_type:"both", unit_price: 180, category:"رجالي"},
 { name:"بالطو طبي دراي", service_type:"both", unit_price: 60, category:"رجالي"},
 { name:"جاكيت جلد دراي كلين", service_type:"both", unit_price: 150, category:"رجالي"},
 { name:"جاكيت شمواه دراي كلين", service_type:"both", unit_price: 150, category:"رجالي"},
 { name:"جاكيت بدلة", service_type:"both", unit_price: 120, category:"رجالي"},
 { name:"جاكيت جينز", service_type:"both", unit_price: 120, category:"رجالي"},
 { name:"سويتر دراي كلين", service_type:"both", unit_price: 100, category:"رجالي"},
 { name:"بلوفر دراي كلين", service_type:"both", unit_price: 80, category:"رجالي"},
 { name:"قميص دراي كلين", service_type:"both", unit_price: 50, category:"رجالي"},
 { name:"بنطلون دراي كلين", service_type:"both", unit_price: 50, category:"رجالي"},
 { name:"سويت شيرت دراي كلين", service_type:"both", unit_price: 70, category:"رجالي"},
 { name:"تي شيرت دراي كلين", service_type:"both", unit_price: 45, category:"رجالي"},
 { name:"ترنج رجالي", service_type:"both", unit_price: 85, category:"رجالي"},
 { name:"عباية رجالي", service_type:"both", unit_price: 50, category:"رجالي"},
 { name:"شورت دراي كلين", service_type:"both", unit_price: 40, category:"رجالي"},
 { name:"بنتكور دراي كلين", service_type:"both", unit_price: 45, category:"رجالي"},
 { name:"فانلة", service_type:"both", unit_price: 40, category:"رجالي"},
 { name:"بوكسر دراي كلين", service_type:"both", unit_price: 25, category:"رجالي"},
 { name:"كاب", service_type:"both", unit_price: 30, category:"رجالي"},
 { name:"كوفية", service_type:"both", unit_price: 10, category:"رجالي"},
 { name:"شراب", service_type:"both", unit_price: 20, category:"رجالي"},
 { name:"حذاء دراي", service_type:"both", unit_price: 25, category:"رجالي"},
 { name:"فيست دراي", service_type:"both", unit_price: 20, category:"رجالي"},
 { name:"سديرى", service_type:"both", unit_price: 15, category:"رجالي"},
 { name:"جيليه دراي", service_type:"both", unit_price: 13, category:"رجالي"},
 { name:"رقة", service_type:"cleaning", unit_price: 90, category:"رجالي"},
 { name:"بدلة رجالي قطعتين مكوى بخار", service_type:"ironing", unit_price: 80, category:"رجالي"},
 { name:"بدلة رجالي 3 قطع مكوى بخار", service_type:"ironing", unit_price: 100, category:"رجالي"},
 { name:"قميص مكوى بخار", service_type:"ironing", unit_price: 20, category:"رجالي"},
 { name:"بنطلون مكوى بخار", service_type:"ironing", unit_price: 20, category:"رجالي"},
 { name:"عباية رجالي مكوى بخار", service_type:"ironing", unit_price: 25, category:"رجالي"},
 { name:"جاكيت مكوى بخار", service_type:"ironing", unit_price: 45, category:"رجالي"},

 // 2. حريمي (Women's)
 { name:"فستان زفاف دراي كلين", service_type:"both", unit_price: 500, category:"حريمي"},
 { name:"فستان سهرة دراي كلين", service_type:"both", unit_price: 300, category:"حريمي"},
 { name:"فستان عادي دراي كلين", service_type:"both", unit_price: 150, category:"حريمي"},
 { name:"فساتين سهرة طويل", service_type:"both", unit_price: 350, category:"حريمي"},
 { name:"تايير حريمى 3قطع دراي كلين", service_type:"both", unit_price: 150, category:"حريمي"},
 { name:"تايير حريمى قطعتين دراي كلين", service_type:"both", unit_price: 120, category:"حريمي"},
 { name:"عباية حريمي دراي كلين", service_type:"both", unit_price: 120, category:"حريمي"},
 { name:"تونيك حريمي دراي كلين", service_type:"both", unit_price: 110, category:"حريمي"},
 { name:"بدلة كارتيه دراي كلين", service_type:"both", unit_price: 100, category:"حريمي"},
 { name:"جلابية حريمي دراي كلين", service_type:"both", unit_price: 100, category:"حريمي"},
 { name:"بيجامة حريمي دراي كلين", service_type:"both", unit_price: 95, category:"حريمي"},
 { name:"جيب دراي كلين", service_type:"both", unit_price: 80, category:"حريمي"},
 { name:"بلوزة حريمي طويل دراي كلين", service_type:"both", unit_price: 65, category:"حريمي"},
 { name:"بلوزة حريمي قصير دراي كلين", service_type:"both", unit_price: 55, category:"حريمي"},
 { name:"شال دراي كلين", service_type:"both", unit_price: 65, category:"حريمي"},
 { name:"بدي حريمي دراي كلين", service_type:"both", unit_price: 45, category:"حريمي"},
 { name:"طرحه دراي كلين", service_type:"both", unit_price: 45, category:"حريمي"},
 { name:"شنطة", service_type:"both", unit_price: 75, category:"حريمي"},
 { name:"شورت حريمي", service_type:"both", unit_price: 35, category:"حريمي"},
 { name:"فستان سهرة مكوى بخار", service_type:"ironing", unit_price: 120, category:"حريمي"},
 { name:"فستان عادي مكوى بخار", service_type:"ironing", unit_price: 60, category:"حريمي"},
 { name:"عباية حريمي مكوى بخار", service_type:"ironing", unit_price: 45, category:"حريمي"},
 { name:"بلوزة مكوى بخار", service_type:"ironing", unit_price: 25, category:"حريمي"},
 { name:"جيبة مكوى بخار", service_type:"ironing", unit_price: 25, category:"حريمي"},

 // 3. أطفال (Kids)
 { name:"بدلة طفل 3 قطع دراي كلين", service_type:"both", unit_price: 60, category:"أطفال"},
 { name:"بدلة طفل قطعتين دراي كلين", service_type:"both", unit_price: 50, category:"أطفال"},
 { name:"بدلة طفل 3 قطع مكوى", service_type:"ironing", unit_price: 30, category:"أطفال"},
 { name:"بدلة طفل قطعتين مكوى", service_type:"ironing", unit_price: 25, category:"أطفال"},
 { name:"ترنج طفل مكوى", service_type:"ironing", unit_price: 35, category:"أطفال"},
 { name:"سويتر طفل مكوى", service_type:"ironing", unit_price: 40, category:"أطفال"},
 { name:"قطعة طفل صغيرة مكوى", service_type:"ironing", unit_price: 15, category:"أطفال"},

 // 4. تنظيف المفروشات (Household & Furnishings)
 { name:"انتريه كامل", service_type:"both", unit_price: 500, category:"تنظيف المفروشات"},
 { name:"ستارة قطيفة", service_type:"both", unit_price: 200, category:"تنظيف المفروشات"},
 { name:"لحاف كبير", service_type:"both", unit_price: 175, category:"تنظيف المفروشات"},
 { name:"بطانية دبل", service_type:"both", unit_price: 155, category:"تنظيف المفروشات"},
 { name:"لحاف عادي", service_type:"both", unit_price: 150, category:"تنظيف المفروشات"},
 { name:"لحاف اطفال", service_type:"both", unit_price: 150, category:"تنظيف المفروشات"},
 { name:"ستارة شيفون", service_type:"both", unit_price: 150, category:"تنظيف المفروشات"},
 { name:"بطانية عادي", service_type:"both", unit_price: 140, category:"تنظيف المفروشات"},
 { name:"كوفرته", service_type:"both", unit_price: 120, category:"تنظيف المفروشات"},
 { name:"مفرش سفرة دراي كلين", service_type:"both", unit_price: 100, category:"تنظيف المفروشات"},
 { name:"مخدة كبيرة", service_type:"both", unit_price: 100, category:"تنظيف المفروشات"},
 { name:"كفر مرتبة دراي كلين", service_type:"both", unit_price: 80, category:"تنظيف المفروشات"},
 { name:"بطانية طفل", service_type:"both", unit_price: 75, category:"تنظيف المفروشات"},
 { name:"ملاية دراي كلين", service_type:"both", unit_price: 65, category:"تنظيف المفروشات"},
 { name:"كفر كرسي انتريه", service_type:"both", unit_price: 60, category:"تنظيف المفروشات"},
 { name:"فوطة كبيرة", service_type:"both", unit_price: 50, category:"تنظيف المفروشات"},
 { name:"ستارة مكوى", service_type:"ironing", unit_price: 50, category:"تنظيف المفروشات"},
 { name:"كيس مخدة دراي كلين", service_type:"both", unit_price: 35, category:"تنظيف المفروشات"},
 { name:"ملاية مكوى", service_type:"ironing", unit_price: 35, category:"تنظيف المفروشات"},
 { name:"ستارة 2م مكوى", service_type:"ironing", unit_price: 45, category:"تنظيف المفروشات"},
 { name:"فوطة وسط", service_type:"both", unit_price: 25, category:"تنظيف المفروشات"},
 { name:"فوطة صغيرة", service_type:"both", unit_price: 25, category:"تنظيف المفروشات"},
 { name:"شلتة كرسي", service_type:"both", unit_price: 20, category:"تنظيف المفروشات"},
 { name:"مفرش سفرة صغير", service_type:"both", unit_price: 20, category:"تنظيف المفروشات"},
 { name:"كيس مخدة مكوى", service_type:"ironing", unit_price: 15, category:"تنظيف المفروشات"},
 { name:"شلتة انتريه كبيرة", service_type:"both", unit_price: 15, category:"تنظيف المفروشات"},
 { name:"مفرش", service_type:"both", unit_price: 15, category:"تنظيف المفروشات"},
 { name:"ستارة شيفون مكوى 2م", service_type:"ironing", unit_price: 12, category:"تنظيف المفروشات"},
 { name:"مفرش سفرة مكوى", service_type:"ironing", unit_price: 12, category:"تنظيف المفروشات"},
 { name:"شلتة انتريه وسط", service_type:"both", unit_price: 8, category:"تنظيف المفروشات"},
 { name:"شلتة انتريه صغيرة", service_type:"both", unit_price: 8, category:"تنظيف المفروشات"},
 { name:"فوطة", service_type:"both", unit_price: 7, category:"تنظيف المفروشات"},

 // 5. سجاد وموكيت (Carpets & Rugs)
 { name:"تنظيف انتريه (مفروشات/سجاد)", service_type:"both", unit_price: 800, category:"سجاد وموكيت"},
 { name:"سجاد حرير (المتر)", service_type:"both", unit_price: 70, category:"سجاد وموكيت"},
 { name:"سجاد شمواه (المتر)", service_type:"both", unit_price: 70, category:"سجاد وموكيت"},
 { name:"سجاد شاج (المتر)", service_type:"both", unit_price: 70, category:"سجاد وموكيت"},
 { name:"كليم", service_type:"both", unit_price: 70, category:"سجاد وموكيت"},
 { name:"سجاد عادي (المتر)", service_type:"both", unit_price: 60, category:"سجاد وموكيت"},
 { name:"سجادة صغيرة", service_type:"both", unit_price: 50, category:"سجاد وموكيت"},
 { name:"مشاية", service_type:"both", unit_price: 20, category:"سجاد وموكيت"},
 { name:"مشاية حمام", service_type:"both", unit_price: 15, category:"سجاد وموكيت"},

 // 6. توصيل وخدمات (Delivery & Special Services)
 { name:"رسوم توصيل عادي", service_type:"cleaning", unit_price: 50, category:"توصيل وخدمات"},
 { name:"رسوم توصيل سريع مستعجل", service_type:"cleaning", unit_price: 100, category:"توصيل وخدمات"},
 { name:"رسوم توصيل مجزأ (بطانيات وسجاد)", service_type:"cleaning", unit_price: 25, category:"توصيل وخدمات"},
 { name:"تغليف كيس منفرد لكل قطعة", service_type:"cleaning", unit_price: 5, category:"توصيل وخدمات"},
 { name:"خدمة تعطير وتكييس فاخر", service_type:"cleaning", unit_price: 15, category:"توصيل وخدمات"},
 { name:"خدمة استلام وتوصيل VIP", service_type:"cleaning", unit_price: 150, category:"توصيل وخدمات"}
];

export async function ensureDryTechCatalogSeeded(tenantId: string | null) {
 if (!tenantId) return 0;
 try {
 const { data: existing } = await supabase.from("service_items").select("name").eq("tenant_id", tenantId);
 const existingNames = new Set((existing ?? []).map((x: any) => x.name));
 
 const toInsert = DRY_TECH_CATALOG_SEED.filter(item => !existingNames.has(item.name)).map(item => ({
 tenant_id: tenantId,
 name: item.name,
 service_type: item.service_type as any,
 unit_price: item.unit_price,
 is_active: true,
 category: item.category
 }));

 if (toInsert.length > 0) {
 await supabase.from("service_items").insert(toInsert);
 }
 return toInsert.length;
 } catch (e) {
 console.error("Failed to auto-seed catalog:", e);
 return 0;
 }
}
