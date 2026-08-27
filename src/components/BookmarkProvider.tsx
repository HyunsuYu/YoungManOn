"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import type { Policy } from "@/lib/types";

const KEY = "youngon:bookmarks";

interface BookmarkContextValue {
  bookmarks: Policy[];
  isBookmarked: (id: string) => boolean;
  toggle: (policy: Policy) => void;
  ready: boolean;
}

const BookmarkContext = createContext<BookmarkContextValue | null>(null);

export function BookmarkProvider({ children }: { children: React.ReactNode }) {
  const [bookmarks, setBookmarks] = useState<Policy[]>([]);
  const [ready, setReady] = useState(false);

  // 최초 마운트 시 localStorage 에서 로드 (SSR 안전)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setBookmarks(JSON.parse(raw));
    } catch {
      /* 접근 불가/파싱 실패는 무시 */
    }
    setReady(true);
  }, []);

  const persist = useCallback((next: Policy[]) => {
    setBookmarks(next);
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      /* 저장 불가 무시 */
    }
  }, []);

  const isBookmarked = useCallback(
    (id: string) => bookmarks.some((b) => b.id === id),
    [bookmarks]
  );

  const toggle = useCallback(
    (policy: Policy) => {
      const exists = bookmarks.some((b) => b.id === policy.id);
      persist(
        exists
          ? bookmarks.filter((b) => b.id !== policy.id)
          : [...bookmarks, policy]
      );
    },
    [bookmarks, persist]
  );

  return (
    <BookmarkContext.Provider value={{ bookmarks, isBookmarked, toggle, ready }}>
      {children}
    </BookmarkContext.Provider>
  );
}

export function useBookmarks(): BookmarkContextValue {
  const ctx = useContext(BookmarkContext);
  if (!ctx) throw new Error("useBookmarks must be used within BookmarkProvider");
  return ctx;
}
