import { useCallback, useState } from "react";
import { ModalContext } from "./modalContextInstance";

export function ModalProvider({ children }) {
  const [activeQuickModal, setActiveQuickModal] = useState(null);
  const [registeredModals, setRegisteredModals] = useState({});
  const [notification, setNotification] = useState({
    message: "",
    type: "success",
  });

  const openQuickIncomeModal = useCallback(() => {
    setActiveQuickModal("income");
  }, []);

  const openQuickExpenseModal = useCallback(() => {
    setActiveQuickModal("expense");
  }, []);

  const closeQuickModal = useCallback(() => {
    setActiveQuickModal(null);
  }, []);

  const setModalRegistered = useCallback((key, isOpen) => {
    setRegisteredModals((prev) => {
      const currentlyOpen = Boolean(prev[key]);
      if (currentlyOpen === Boolean(isOpen)) {
        return prev;
      }
      const next = { ...prev };
      if (isOpen) {
        next[key] = true;
      } else {
        delete next[key];
      }
      return next;
    });
  }, []);

  const showNotification = useCallback((message, type = "success") => {
    setNotification({ message, type });
  }, []);

  const clearNotification = useCallback(() => {
    setNotification((prev) => ({ message: "", type: prev.type }));
  }, []);

  const notifyDataChanged = useCallback((kind) => {
    window.dispatchEvent(new CustomEvent("finance:updated", { detail: { kind } }));
  }, []);

  const hasOpenModal =
    activeQuickModal !== null || Object.keys(registeredModals).length > 0;

  return (
    <ModalContext.Provider
      value={{
        activeQuickModal,
        hasOpenModal,
        openQuickIncomeModal,
        openQuickExpenseModal,
        closeQuickModal,
        setModalRegistered,
        notification,
        showNotification,
        clearNotification,
        notifyDataChanged,
      }}
    >
      {children}
    </ModalContext.Provider>
  );
}
