-- MJRH V4 — i18n ENHANCEMENT: DYNAMIC UI TRANSLATIONS (v1.0)
-- Purpose: Inject multilingual support into L7 Form Schemas and Branding Profiles.

BEGIN;

-- 1. [L7] Update Form Schemas for Dry-tech Activities with i18n support
-- Activity: Intake
UPDATE v4_l7.form_schemas
SET ui_config = ui_config || jsonb_build_object(
    'i18n', jsonb_build_object(
        'ar', jsonb_build_object('label', 'استلام الطلب', 'description', 'تسجيل بيانات الطلب والعميل'),
        'en', jsonb_build_object('label', 'Intake Order', 'description', 'Register order and customer details')
    ),
    'icon', 'LogIn'
)
WHERE activity_id = (SELECT id FROM v4_l4.activities WHERE name = 'Intake' AND stream_id = '10101010-0000-4000-b000-000000000001');

-- Activity: Quality Control
UPDATE v4_l7.form_schemas
SET ui_config = ui_config || jsonb_build_object(
    'i18n', jsonb_build_object(
        'ar', jsonb_build_object('label', 'فحص الجودة', 'description', 'التأكد من سلامة القطع ونظافتها'),
        'en', jsonb_build_object('label', 'Quality Control', 'description', 'Verify garment integrity and cleanliness')
    ),
    'icon', 'ShieldCheck'
)
WHERE activity_id = (SELECT id FROM v4_l4.activities WHERE name = 'Quality Control' AND stream_id = '10101010-0000-4000-b000-000000000001');

-- 2. [L7] Update Branding Profile for Dry-tech with i18n
INSERT INTO v4_l7.branding_profiles (sovereign_root_id, theme_config, assets)
VALUES (
    (SELECT id FROM v4_l1.nodes WHERE node_path = 'dry_tech_cairo' LIMIT 1),
    jsonb_build_object(
        'primary_color', '#ef4444',
        'i18n', jsonb_build_object(
            'ar', jsonb_build_object('org_name', 'دراي تيك للمغاسل الصناعية', 'tagline', 'الريادة في العناية بالملابس'),
            'en', jsonb_build_object('org_name', 'Dry-Tech Industrial Laundry', 'tagline', 'Leader in Garment Care')
        )
    ),
    jsonb_build_object('logo_url', '/dry-tech-logo.png')
)
ON CONFLICT (sovereign_root_id) DO UPDATE SET
    theme_config = EXCLUDED.theme_config,
    assets = EXCLUDED.assets;

COMMIT;
