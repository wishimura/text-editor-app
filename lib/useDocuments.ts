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
  const [editingContent, setEditingContent] = useState<string | null>(null);
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
        const lastDoc = data.find(d => d.id === lastDocId);
        if (lastDoc) {
          setOpenTabs([lastDoc.id]);
          setActiveDocId(lastDoc.id);
          setEditingContent(lastDoc.content);
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

  const baseActiveDoc = documents.find(d => d.id === activeDocId) || null;
  const activeDoc = baseActiveDoc && editingContent !== null
    ? { ...baseActiveDoc, content: editingContent }
    : baseActiveDoc;

  const openDocument = useCallback((id: string) => {
    setOpenTabs(prev => prev.includes(id) ? prev : [...prev, id]);
    setActiveDocId(id);
    const doc = documents.find(d => d.id === id);
    setEditingContent(doc ? doc.content : null);
  }, [documents]);

  const closeTab = useCallback((id: string) => {
    setOpenTabs(prev => {
      const idx = prev.indexOf(id);
      if (idx === -1) return prev;
      const next = prev.filter(t => t !== id);
      if (id === activeDocId) {
        const newActive = next[Math.min(idx, next.length - 1)] || null;
        setActiveDocId(newActive);
        if (newActive) {
          const doc = localContentRef.current.get(newActive);
          setEditingContent(doc ?? null);
        } else {
          setEditingContent(null);
        }
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
    setEditingContent(content);

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    setSaveStatus('saving');

    saveTimerRef.current = setTimeout(async () => {
      setDocuments(prev =>
        prev.map(d => d.id === id ? { ...d, content } : d)
      );
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

  const renameDocument = useCallback(async (id: string, newTitle: string) => {
    const language = getLangFromTitle(newTitle);
    const { error } = await getSupabase()
      .from('documents')
      .update({ title: newTitle, language, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (!error) {
      setDocuments(prev =>
        prev.map(d => d.id === id ? { ...d, title: newTitle, language } : d)
      );
    }
  }, []);

  const updateFolder = useCallback(async (id: string, folder: string) => {
    const { error } = await getSupabase()
      .from('documents')
      .update({ folder, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (!error) {
      setDocuments(prev =>
        prev.map(d => d.id === id ? { ...d, folder } : d)
      );
    }
  }, []);

  const switchTab = useCallback((id: string) => {
    setActiveDocId(id);
    const content = localContentRef.current.get(id);
    const doc = documents.find(d => d.id === id);
    setEditingContent(content ?? doc?.content ?? null);
  }, [documents]);

  return {
    documents,
    openTabs,
    activeDocId,
    activeDoc,
    isLoading,
    saveStatus,
    openDocument,
    closeTab,
    setActiveDocId: switchTab,
    createDocument,
    deleteDocument,
    updateContent,
    flushSave,
    refetch: fetchDocuments,
    renameDocument,
    updateFolder,
  };
}
