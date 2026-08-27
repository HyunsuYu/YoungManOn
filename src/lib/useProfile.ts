"use client";

import { useCallback, useEffect, useState } from "react";
import type { UserProfile } from "./types";

const KEY = "youngon:profile";

/** 사용자 프로필을 localStorage 에 저장/불러오기 */
export function useProfile() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setProfile(JSON.parse(raw));
    } catch {
      /* 무시 */
    }
    setReady(true);
  }, []);

  const save = useCallback((p: UserProfile) => {
    setProfile(p);
    try {
      localStorage.setItem(KEY, JSON.stringify(p));
    } catch {
      /* 무시 */
    }
  }, []);

  const clear = useCallback(() => {
    setProfile(null);
    try {
      localStorage.removeItem(KEY);
    } catch {
      /* 무시 */
    }
  }, []);

  return { profile, ready, save, clear };
}
