"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useDemo } from "@/lib/demo-store";

export default function Home() {
  const { currentUser, ready } = useDemo();
  const router = useRouter();
  useEffect(() => {
    if (!ready) return;
    router.replace(currentUser ? "/dashboard" : "/login");
  }, [currentUser, ready, router]);
  return null;
}
