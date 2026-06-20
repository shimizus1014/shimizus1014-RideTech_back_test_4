"use client";
import { useEffect } from "react";
import { useRouter, useParams } from "next/navigation";

export default function TasksRedirectPage() {
  const router = useRouter();
  const params = useParams();
  useEffect(() => {
    router.replace(`/dashboard/plans/${params.id}`);
  }, [router, params.id]);
  return null;
}
