import { createFileRoute } from "@tanstack/react-router";
import React, { Suspense } from "react";

const LazyView = React.lazy(() => import("./-reports-view"));

export const Route = createFileRoute("/$tenant/reports")({
  head: () => ({ meta: [{ title: "التقارير والذكاء التشغيلي - MJRH" }] }),
  component: () => (
    <Suspense fallback={<div className="p-8 text-center text-teal-600 font-bold">جاري تحليل البيانات والتقارير...</div>}>
      <LazyView />
    </Suspense>
  ),
});
