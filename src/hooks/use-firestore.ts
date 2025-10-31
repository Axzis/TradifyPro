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
import { useAuth } from "./use-auth";

export function useCollection<T>(path: string, ...queryConstraints: QueryConstraint[]) {
  const { user } = useAuth();
  const [data, setData] = useState<T[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      setData([]);
      return;
    };

    let unsubscribe: Unsubscribe | null = null;
    
    // Do not run query if path is invalid (e.g. during initial render with no user)
    if(!path.includes('undefined')) {
      const collectionPath = path.startsWith('users/') ? path : `users/${user.uid}/${path}`;
      const q: Query<DocumentData> = query(collection(db, collectionPath), ...queryConstraints);
      
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
  }, [user, path, ...queryConstraints.map(c => c.toString())]); // Basic dependency check

  return { data, loading, error };
}

export function useDoc<T>(path: string) {
  const { user } = useAuth();
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      setData(null);
      return;
    }
    
    if (path.includes('undefined')) {
      setLoading(false);
      setData(null);
      return;
    }

    const docPath = path.startsWith('users/') ? path : `users/${user.uid}/${path}`;
    const docRef = doc(db, docPath);
    const unsubscribe = onSnapshot(
      docRef,
      (docSnapshot) => {
        if (docSnapshot.exists()) {
          setData({ id: docSnapshot.id, ...docSnapshot.data() } as T);
        } else {
          setData(null);
          console.warn(`Document not found at path: ${docPath}`);
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
  }, [user, path]);

  return { data, loading, error };
}

    