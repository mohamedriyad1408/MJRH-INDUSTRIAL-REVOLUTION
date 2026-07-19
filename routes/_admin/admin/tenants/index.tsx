import { createFileRoute } from "@tanstack/react-router";
import React, { Suspense } from "react";

const LazyView = React.lazy(() => import("./-index-view"));

export const Route = createFileRoute("/_admin/admin/tenants/")({
  component: () => (
    <Suspense fallback={<div className="p-8 text-center text-teal-600 font-bold">جاري تحميل قائمة المشاريع...</div>}>
      <LazyView />
    </Suspense>
  ),
});
