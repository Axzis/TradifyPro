"use client";

import { useState, useEffect } from "react";

const API_KEY = "fca_live_xw88ZhJhdbpqpU37EOTvBKXDr6IqTBeEthDBFmf1";
const API_URL = `https://api.freecurrencyapi.com/v1/latest?apikey=${API_KEY}&base_currency=USD&currencies=IDR`;

// Simple in-memory cache
let cachedRate: { rate: number; timestamp: number } | null = null;
const CACHE_DURATION = 1000 * 60 * 60; // 1 hour

export function useCurrency() {
  const [rate, setRate] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const fallbackRate = 16000;

  useEffect(() => {
    const fetchRate = async () => {
      setLoading(true);
      
      // Check cache first
      if (cachedRate && Date.now() - cachedRate.timestamp < CACHE_DURATION) {
        setRate(cachedRate.rate);
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(API_URL);
        if (!response.ok) {
          throw new Error("Gagal mengambil data kurs.");
        }
        const data = await response.json();
        const idrRate = data.data.IDR;
        
        if (idrRate) {
            setRate(idrRate);
            cachedRate = { rate: idrRate, timestamp: Date.now() };
        } else {
            setRate(fallbackRate);
        }
      } catch (err) {
        console.error("Currency fetch error:", err);
        setError(err instanceof Error ? err : new Error("Terjadi kesalahan."));
        setRate(fallbackRate); // Use fallback on error
      } finally {
        setLoading(false);
      }
    };

    fetchRate();
  }, []);

  return { rate, loading, error };
}