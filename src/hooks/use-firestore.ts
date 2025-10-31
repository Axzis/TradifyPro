"use client";

import { useState, useEffect } from "react";
import {
  collection,
  query,
  onSnapshot,
  doc,
  type DocumentData,
  type Query,
  type QueryConstraint,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

export function useCollection<T>(path: string, ...queryConstraints: QueryConstraint[]) {
  const [data, setData] = useState<T[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let unsubscribe: Unsubscribe | null = null;
    
    // Do not run query if path is invalid (e.g. during initial render with no user)
    if(!path.includes('undefined')) {
      const q: Query<DocumentData> = query(collection(db, path), ...queryConstraints);
      
      unsubscribe = onSnapshot(
        q,
        (querySnapshot) => {
          const docs = querySnapshot.docs.map(
            (doc) => ({ id: doc.id, ...doc.data() } as T)
          );
          setData(docs);
          setLoading(false);
        },
        (err) => {
          console.error(`Error fetching collection ${path}:`, err);
          setError(err);
          setLoading(false);
        }
      );
    } else {
      setLoading(false);
      setData([]);
    }


    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [path, ...queryConstraints.map(c => c.toString())]); // Basic dependency check

  return { data, loading, error };
}

export function useDoc<T>(path: string) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    // Do not run query if path is invalid (e.g. during initial render with no user/id)
    if (path.includes('undefined')) {
      setLoading(false);
      setData(null);
      return;
    }

    const docRef = doc(db, path);
    const unsubscribe = onSnapshot(
      docRef,
      (docSnapshot) => {
        if (docSnapshot.exists()) {
          setData({ id: docSnapshot.id, ...docSnapshot.data() } as T);
        } else {
          setData(null);
        }
        setLoading(false);
      },
      (err) => {
        console.error(`Error fetching document ${path}:`, err);
        setError(err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [path]);

  return { data, loading, error };
}
