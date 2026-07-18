'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { getSupabase } from './supabase';
import { Document, getLangFromTitle } from './types';

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error' | 'conflict';
export type ReloadStatus = 'idle' | 'reloading' | 'done' | 'error';

export function useDocuments() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [trash, setTrash] = useState<Document[]>([]);
  const [openTabs, setOpenTabs] = useState<string[]>([]);
  const [activeDocId, setActiveDocId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [reloadStatus, setReloadStatus] = useState<ReloadStatus>('idle');
  const saveTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const localContentRef = useRef<Map<string, string>>(new Map());
  const serverUpdatedAtRef = useRef<Map<string, string>>(new Map());
  const restoredRef = useRef(false);
  const lastHiddenAtRef = useRef(0);

  const fetchDocuments = useCallback(async () => {
    setIsLoading(true);
    // Try with deleted_at filter first; fall back to unfiltered if column doesn't exist yet
    let result = await getSupabase()
      .from('documents')
      .select('*')
      .is('deleted_at', null)
      .order('updated_at', { ascending: false });

    if (result.error) {
      result = await getSupabase()
        .from('documents')
        .select('*')
        .order('updated_at', { ascending: false });
    }

    const { data, error } = result;
    if (!error && data) {
      setDocuments(data);
      data.forEach(doc => {
        localContentRef.current.set(doc.id, doc.content);
        serverUpdatedAtRef.current.set(doc.id, doc.updated_at);
      });

      if (!restoredRef.current) {
        restoredRef.current = true;
        const lastDocId = localStorage.getItem('citrus_lastDocId');
        const lastDoc = data.find(d => d.id === lastDocId);
        if (lastDoc) {
          setOpenTabs([lastDoc.id]);
          setActiveDocId(lastDoc.id);
        }
      }
    }
    setIsLoading(false);
  }, []);

  const fetchTrash = useCallback(async () => {
    const { data, error } = await getSupabase()
      .from('documents')
      .select('*')
      .not('deleted_at', 'is', null)
      .order('deleted_at', { ascending: false });

    if (!error && data) {
      setTrash(data);
    }
  }, []);

  useEffect(() => {
    fetchDocuments();
    fetchTrash();
  }, [fetchDocuments, fetchTrash]);

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
    const now = new Date().toISOString();
    const { error } = await getSupabase()
      .from('documents')
      .update({ deleted_at: now })
      .eq('id', id);
    if (error) {
      // deleted_at column may not exist yet — skip silently
      // (file stays in list, user can retry after migration)
      return;
    }
    const doc = documents.find(d => d.id === id);
    setDocuments(prev => prev.filter(d => d.id !== id));
    if (doc) {
      setTrash(prev => [{ ...doc, deleted_at: now }, ...prev]);
    }
    closeTab(id);
    localContentRef.current.delete(id);
  }, [closeTab, documents]);

  const restoreDocument = useCallback(async (id: string) => {
    const { error } = await getSupabase()
      .from('documents')
      .update({ deleted_at: null, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (!error) {
      const doc = trash.find(d => d.id === id);
      setTrash(prev => prev.filter(d => d.id !== id));
      if (doc) {
        setDocuments(prev => [{ ...doc, deleted_at: null }, ...prev]);
      }
    }
  }, [trash]);

  const permanentlyDelete = useCallback(async (id: string) => {
    const { error } = await getSupabase()
      .from('documents')
      .delete()
      .eq('id', id);
    if (!error) {
      setTrash(prev => prev.filter(d => d.id !== id));
    }
  }, []);

  const emptyTrash = useCallback(async () => {
    const ids = trash.map(d => d.id);
    if (ids.length === 0) return;
    const { error } = await getSupabase()
      .from('documents')
      .delete()
      .in('id', ids);
    if (!error) {
      setTrash([]);
    }
  }, [trash]);

  const saveStatusRef = useRef<SaveStatus>('idle');
  const updateContent = useCallback((id: string, content: string) => {
    localContentRef.current.set(id, content);

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    if (saveStatusRef.current !== 'saving' && saveStatusRef.current !== 'conflict') {
      saveStatusRef.current = 'saving';
      setSaveStatus('saving');
    }
    if (saveStatusRef.current === 'conflict') return;

    saveTimerRef.current = setTimeout(async () => {
      const knownUpdatedAt = serverUpdatedAtRef.current.get(id);
      if (knownUpdatedAt) {
        const { data: serverDoc } = await getSupabase()
          .from('documents')
          .select('updated_at')
          .eq('id', id)
          .single();
        if (serverDoc && serverDoc.updated_at !== knownUpdatedAt) {
          saveStatusRef.current = 'conflict';
          setSaveStatus('conflict');
          return;
        }
      }

      setDocuments(prev =>
        prev.map(d => d.id === id ? { ...d, content } : d)
      );
      const now = new Date().toISOString();
      const { error } = await getSupabase()
        .from('documents')
        .update({ content, updated_at: now })
        .eq('id', id);

      if (!error) {
        serverUpdatedAtRef.current.set(id, now);
      }

      const next = error ? 'error' : 'saved';
      saveStatusRef.current = next;
      setSaveStatus(next);
      if (!error) {
        setTimeout(() => {
          saveStatusRef.current = 'idle';
          setSaveStatus('idle');
        }, 2000);
      }
    }, 1000);
  }, []);

  const flushSave = useCallback(async () => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = undefined;
    }
    if (activeDocId) {
      const content = localContentRef.current.get(activeDocId);
      if (content !== undefined) {
        saveStatusRef.current = 'saving';
        setSaveStatus('saving');

        const knownUpdatedAt = serverUpdatedAtRef.current.get(activeDocId);
        if (knownUpdatedAt) {
          const { data: serverDoc } = await getSupabase()
            .from('documents')
            .select('updated_at')
            .eq('id', activeDocId)
            .single();
          if (serverDoc && serverDoc.updated_at !== knownUpdatedAt) {
            saveStatusRef.current = 'conflict';
            setSaveStatus('conflict');
            return;
          }
        }

        const now = new Date().toISOString();
        const { error } = await getSupabase()
          .from('documents')
          .update({ content, updated_at: now })
          .eq('id', activeDocId);
        if (!error) {
          serverUpdatedAtRef.current.set(activeDocId, now);
        }
        const next = error ? 'error' : 'saved';
        saveStatusRef.current = next;
        setSaveStatus(next);
      }
    }
  }, [activeDocId]);

  const reloadDocuments = useCallback(async () => {
    setReloadStatus('reloading');
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = undefined;
    }

    let result = await getSupabase()
      .from('documents')
      .select('*')
      .is('deleted_at', null)
      .order('updated_at', { ascending: false });

    if (result.error) {
      result = await getSupabase()
        .from('documents')
        .select('*')
        .order('updated_at', { ascending: false });
    }

    const { data, error } = result;
    if (!error && data) {
      setDocuments(data);
      data.forEach(doc => {
        localContentRef.current.set(doc.id, doc.content);
        serverUpdatedAtRef.current.set(doc.id, doc.updated_at);
      });
      if (saveStatusRef.current === 'conflict') {
        saveStatusRef.current = 'idle';
        setSaveStatus('idle');
      }
      setReloadStatus('done');
      setTimeout(() => setReloadStatus('idle'), 2000);
    } else {
      setReloadStatus('error');
      setTimeout(() => setReloadStatus('idle'), 3000);
    }

    const trashResult = await getSupabase()
      .from('documents')
      .select('*')
      .not('deleted_at', 'is', null)
      .order('deleted_at', { ascending: false });
    if (!trashResult.error && trashResult.data) {
      setTrash(trashResult.data);
    }
  }, []);

  const forceOverwrite = useCallback(async () => {
    if (!activeDocId) return;
    const content = localContentRef.current.get(activeDocId);
    if (content === undefined) return;
    saveStatusRef.current = 'saving';
    setSaveStatus('saving');
    const now = new Date().toISOString();
    const { error } = await getSupabase()
      .from('documents')
      .update({ content, updated_at: now })
      .eq('id', activeDocId);
    if (!error) {
      serverUpdatedAtRef.current.set(activeDocId, now);
    }
    const next = error ? 'error' : 'saved';
    saveStatusRef.current = next;
    setSaveStatus(next);
    if (!error) {
      setTimeout(() => {
        saveStatusRef.current = 'idle';
        setSaveStatus('idle');
      }, 2000);
    }
  }, [activeDocId]);

  // Flush pending saves when page goes to background; auto-reload when returning
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        lastHiddenAtRef.current = Date.now();
        if (!saveTimerRef.current) return;
        clearTimeout(saveTimerRef.current);
        saveTimerRef.current = undefined;
        const docId = activeDocId;
        if (!docId) return;
        const content = localContentRef.current.get(docId);
        if (content === undefined) return;
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
        if (!supabaseUrl || !supabaseKey) return;
        const now = new Date().toISOString();
        const url = `${supabaseUrl}/rest/v1/documents?id=eq.${docId}`;
        const body = JSON.stringify({ content, updated_at: now });
        fetch(url, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
            'Prefer': 'return=minimal',
          },
          body,
          keepalive: true,
        }).then(() => {
          serverUpdatedAtRef.current.set(docId, now);
        }).catch(() => {});
      } else if (document.visibilityState === 'visible') {
        const hiddenFor = Date.now() - lastHiddenAtRef.current;
        if (hiddenFor > 5000) {
          reloadDocuments();
        }
      }
    };

    const handleBeforeUnload = () => {
      if (saveTimerRef.current) {
        lastHiddenAtRef.current = Date.now();
        handleVisibilityChange();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [activeDocId, reloadDocuments]);

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

  return {
    documents,
    trash,
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
    restoreDocument,
    permanentlyDelete,
    emptyTrash,
    updateContent,
    flushSave,
    forceOverwrite,
    refetch: fetchDocuments,
    reloadDocuments,
    reloadStatus,
    renameDocument,
    updateFolder,
  };
}
