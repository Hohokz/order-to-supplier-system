// src/context/ModalContext.tsx
'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';

type ModalType = 'error' | 'success' | 'confirm';

interface ModalState {
  isOpen: boolean;
  type: ModalType;
  title: string;
  message: string;
  onConfirm?: () => void;
  onCancel?: () => void;
}

interface ModalContextType {
  showError: (message: string, title?: string) => void;
  showSuccess: (message: string, title?: string) => void;
  showConfirm: (message: string, onConfirm: () => void, title?: string) => void;
  closeModal: () => void;
}

const ModalContext = createContext<ModalContextType | undefined>(undefined);

export function ModalProvider({ children }: { children: React.ReactNode }) {
  const [modal, setModal] = useState<ModalState>({
    isOpen: false,
    type: 'error',
    title: '',
    message: '',
  });

  const showError = useCallback((message: string, title: string = 'เกิดข้อผิดพลาด') => {
    setModal({
      isOpen: true,
      type: 'error',
      title,
      message,
    });
  }, []);

  const showSuccess = useCallback((message: string, title: string = 'ดำเนินการสำเร็จ') => {
    setModal({
      isOpen: true,
      type: 'success',
      title,
      message,
    });
  }, []);

  const showConfirm = useCallback((message: string, onConfirm: () => void, title: string = 'ยืนยันการทำรายการ') => {
    setModal({
      isOpen: true,
      type: 'confirm',
      title,
      message,
      onConfirm,
    });
  }, []);

  const closeModal = useCallback(() => {
    if (modal.onCancel) {
      modal.onCancel();
    }
    setModal((prev) => ({ ...prev, isOpen: false }));
  }, [modal]);

  const handleConfirm = useCallback(() => {
    if (modal.onConfirm) {
      modal.onConfirm();
    }
    setModal((prev) => ({ ...prev, isOpen: false }));
  }, [modal]);

  return (
    <ModalContext.Provider value={{ showError, showSuccess, showConfirm, closeModal }}>
      {children}
      {modal.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
          {/* Modal Card */}
          <div className="w-full max-w-sm bg-white rounded-2xl border border-zinc-200 shadow-2xl p-6 flex flex-col items-center text-center space-y-4 animate-scale-up">
            
            {/* Status Icons */}
            {modal.type === 'error' && (
              <div className="h-12 w-12 rounded-full bg-red-50 flex items-center justify-center text-red-500 border border-red-100 animate-pulse">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
            )}

            {modal.type === 'success' && (
              <div className="h-12 w-12 rounded-full bg-green-50 flex items-center justify-center text-green-600 border border-green-100 animate-bounce">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
            )}

            {modal.type === 'confirm' && (
              <div className="h-12 w-12 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-800 border border-zinc-200">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            )}

            {/* Content */}
            <div className="space-y-1.5 w-full">
              <h3 className="text-base font-black text-zinc-900 leading-tight">
                {modal.title}
              </h3>
              <p className="text-xs font-semibold text-zinc-500 whitespace-pre-line leading-relaxed max-h-40 overflow-y-auto px-1">
                {modal.message}
              </p>
            </div>

            {/* Buttons Footer */}
            <div className="w-full flex gap-2 pt-2">
              {modal.type === 'confirm' ? (
                <>
                  <button
                    type="button"
                    onClick={closeModal}
                    className="flex-1 px-4 py-2 border border-zinc-200 text-xs font-bold rounded-xl text-zinc-600 hover:bg-zinc-50 active:scale-95 transition-all duration-150 cursor-pointer"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirm}
                    className="flex-1 px-4 py-2 bg-black text-white text-xs font-black rounded-xl hover:bg-zinc-800 active:scale-95 transition-all duration-150 cursor-pointer"
                  >
                    ยืนยัน
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={closeModal}
                  className="w-full px-4 py-2 text-xs font-black rounded-xl text-white bg-zinc-900 hover:bg-zinc-800 active:scale-95 transition-all duration-150 cursor-pointer"
                >
                  ตกลง
                </button>
              )}
            </div>

          </div>
        </div>
      )}
    </ModalContext.Provider>
  );
}

export function useModal() {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error('useModal must be used within a ModalProvider');
  }
  return context;
}
