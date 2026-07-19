import { createFileRoute } from "@tanstack/react-router";
import React, { Suspense } from "react";

const LazyView = React.lazy(() => import("./-executive-view"));

export const Route = createFileRoute("/$tenant/executive")({
  head: () => ({ meta: [{ title: "لوحة المديرين التنفيذيين - MJRH Executive" }] }),
  component: () => (
    <Suspense fallback={<div className="p-8 text-center text-teal-600 font-bold">جاري تحميل لوحة القيادة التنفيذية...</div>}>
      <LazyView />
    </Suspense>
  ),
});
