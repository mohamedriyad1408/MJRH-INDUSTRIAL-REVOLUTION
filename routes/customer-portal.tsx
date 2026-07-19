import { createFileRoute } from "@tanstack/react-router";
import React, { Suspense } from "react";

const LazyView = React.lazy(() => import("./-customer-portal-view"));

export const Route = createFileRoute("/customer-portal")({
  head: () => ({ meta: [{ title: "بوابة العميل VIP - MJRH" }] }),
  component: () => (
    <Suspense fallback={<div className="p-8 text-center text-teal-600 font-bold">جاري تحميل البوابة الملكية...</div>}>
      <LazyView />
    </Suspense>
  ),
});
