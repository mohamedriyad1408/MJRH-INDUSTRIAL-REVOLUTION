#!/bin/bash

echo "========== MJRH STABILITY SCAN =========="

echo "البحث عن استيرادات V4 في الكود..."

# إنشاء ملف التقرير

REPORT_FILE="v4-imports-report.txt"

echo "تقرير استيرادات V4 - $(date)" > $REPORT_FILE

echo "----------------------------------------" >> $REPORT_FILE

# 1. البحث عن core

echo "--- 1. استيرادات من 'core' ---" >> $REPORT_FILE

grep -rn "from.*core" ./src --include="*.ts" --include="*.tsx" >> $REPORT_FILE

# 2. البحث عن modules

echo "--- 2. استيرادات من 'modules' ---" >> $REPORT_FILE

grep -rn "from.*modules" ./src --include="*.ts" --include="*.tsx" >> $REPORT_FILE

# 3. البحث عن routes (V4)

echo "--- 3. استيرادات من 'routes' (V4) ---" >> $REPORT_FILE

grep -rn "from.*routes" ./src --include="*.ts" --include="*.tsx" >> $REPORT_FILE

# 4. البحث عن دوال L3

echo "--- 4. استيرادات دوال L3 (fn_evaluate_readiness) ---" >> $REPORT_FILE

grep -rn "fn_evaluate_readiness" ./src --include="*.ts" --include="*.tsx" >> $REPORT_FILE

# 5. البحث عن أي استيراد يحتوي على "golden"

echo "--- 5. استيرادات Golden Minds ---" >> $REPORT_FILE

grep -rn "golden" ./src --include="*.ts" --include="*.tsx" >> $REPORT_FILE

echo "----------------------------------------" >> $REPORT_FILE

echo "اكتمل البحث. النتائج في: $REPORT_FILE"

cat $REPORT_FILE
