'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { getSupabase } from './supabase';
import { Document, getLangFromTitle } from './types';

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export function useDocuments() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [openTabs, setOpenTabs] = useState<string[]>([]);
  const [activeDocId, setActiveDocId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const saveTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const localContentRef = useRef<Map<string, string>>(new Map());
  const restoredRef = useRef(false);

  const fetchDocuments = useCallback(async () => {
    setIsLoading(true);
    const { data, error } = await getSupabase()
      .from('documents')
      .select('*')
      .order('updated_at', { ascending: false });

    if (!error && data) {
      setDocuments(data);
      data.forEach(doc => localContentRef.current.set(doc.id, doc.content));

      // Restore last opened document on first load
      if (!restoredRef.current) {
        restoredRef.current = true;
        const lastDocId = localStorage.getItem('citrus_lastDocId');
        if (lastDocId && data.some(d => d.id === lastDocId)) {
          setOpenTabs([lastDocId]);
          setActiveDocId(lastDocId);
        }
      }
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  // Persist active doc id to localStorage
  useEffect(() => {
    if (activeDocId) {
      localStorage.setItem('citrus_lastDocId', activeDocId);
    }
  }, [activeDocId]);

  const activeDoc = documents.find(d => d.id === activeDocId) || null;

  const openDocument = useCallback((id: string) => {
    setOpenTabs(prev => prev.includes(id) ? prev : [...prev, id]);
    setActiveDocId(id);
  }, []);

  const closeTab = useCallback((id: string) => {
    setOpenTabs(prev => {
      const idx = prev.indexOf(id);
      if (idx === -1) return prev;
      const next = prev.filter(t => t !== id);
      if (id === activeDocId) {
        const newActive = next[Math.min(idx, next.length - 1)] || null;
        setActiveDocId(newActive);
      }
      return next;
    });
    localContentRef.current.delete(id);
  }, [activeDocId]);

  const createDocument = useCallback(async (title: string) => {
    const language = getLangFromTitle(title);
    const { data, error } = await getSupabase()
      .from('documents')
      .insert({ title, content: '', language })
      .select()
      .single();

    if (!error && data) {
      setDocuments(prev => [data, ...prev]);
      localContentRef.current.set(data.id, '');
      openDocument(data.id);
      return data;
    }
    return null;
  }, [openDocument]);

  const deleteDocument = useCallback(async (id: string) => {
    const { error } = await getSupabase().from('documents').delete().eq('id', id);
    if (!error) {
      setDocuments(prev => prev.filter(d => d.id !== id));
      closeTab(id);
      localContentRef.current.delete(id);
    }
  }, [closeTab]);

  const updateContent = useCallback((id: string, content: string) => {
    localContentRef.current.set(id, content);
    setDocuments(prev =>
      prev.map(d => d.id === id ? { ...d, content } : d)
    );

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    setSaveStatus('saving');

    saveTimerRef.current = setTimeout(async () => {
      const { error } = await getSupabase()
        .from('documents')
        .update({ content, updated_at: new Date().toISOString() })
        .eq('id', id);

      setSaveStatus(error ? 'error' : 'saved');
      if (!error) {
        setTimeout(() => setSaveStatus('idle'), 2000);
      }
    }, 1000);
  }, []);

  const flushSave = useCallback(async () => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }
    if (activeDocId) {
      const content = localContentRef.current.get(activeDocId);
      if (content !== undefined) {
        await getSupabase()
          .from('documents')
          .update({ content, updated_at: new Date().toISOString() })
          .eq('id', activeDocId);
      }
    }
  }, [activeDocId]);

  return {
    documents,
    openTabs,
    activeDocId,
    activeDoc,
    isLoading,
    saveStatus,
    openDocument,
    closeTab,
    setActiveDocId,
    createDocument,
    deleteDocument,
    updateContent,
    flushSave,
    refetch: fetchDocuments,
  };
}
