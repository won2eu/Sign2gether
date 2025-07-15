"use client";

import { Suspense } from "react";
import MobileSignInner from "./MobileSignInner";

export default function MobileSignPage() {
  return (
    <Suspense>
      <MobileSignInner />
    </Suspense>
  );
} 