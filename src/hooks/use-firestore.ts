"use client";

import { useState, useEffect, useMemo } from "react";
import {
  collection,
  query,
  onSnapshot,
  doc,
  type DocumentData,
  type Query,
  type QueryConstraint,
  type Unsubscribe,
  where,
  orderBy,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "./use-auth";

// A utility function to create a stable query object
const useStableQuery = (path: string, ...queryConstraints: any[]) => {
  const constraintsString = queryConstraints.map(c => 
    c.type + (c.field || '') + (c.op || '') + (c.value || '')
  ).join(',');

  return useMemo(() => {
    if (!path || path.includes('undefined')) return null;

    const queryArgs: any[] = [collection(db, path)];
    queryConstraints.forEach(constraint => {
      if (constraint.type === 'where') {
        queryArgs.push(where(constraint.field, constraint.op, constraint.value));
      } else if (constraint.type === 'orderBy') {
        queryArgs.push(orderBy(constraint.field, constraint.direction));
      }
    });

    return query.apply(null, queryArgs as [Query<DocumentData>, ...QueryConstraint[]]);

  }, [path, constraintsString]);
};

export function useCollection<T>(path: string, ...queryConstraints: any[]) {
  const { user } = useAuth();
  const [data, setData] = useState<T[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const stableQueryConstraints = useMemo(() => {
    const constraints = [];
    for (let i = 0; i < queryConstraints.length; i += 3) {
      const field = queryConstraints[i];
      const op = queryConstraints[i + 1];
      const value = queryConstraints[i + 2];
      if (field && op) {
         constraints.push({ type: 'where', field, op, value });
      }
    }
    return constraints;
  }, [queryConstraints]);


  const q = useStableQuery(
    user ? path : '',
    ...stableQueryConstraints
  );

  useEffect(() => {
    if (!user) {
      setLoading(false);
      setData([]);
      return;
    }

    if (!q) {
      setLoading(false);
      setData([]);
      return;
    }

    setLoading(true);
    const unsubscribe: Unsubscribe = onSnapshot(
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

    return () => {
      unsubscribe();
    };
  }, [user, q, path]); 

  return { data, loading, error };
}


export function useDoc<T>(path: string) {
  const { user } = useAuth();
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!user || !path || path.includes('undefined')) {
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
          console.warn(`Document not found at path: ${path}`);
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
