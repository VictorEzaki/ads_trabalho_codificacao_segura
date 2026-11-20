import { useContext, useEffect } from "react";
import { ModalContext } from "../contexts/modalContextInstance";

export function useRegisterModal(key, isOpen) {
  const context = useContext(ModalContext);
  const setModalRegistered = context?.setModalRegistered;

  useEffect(() => {
    if (!setModalRegistered) {
      return undefined;
    }

    setModalRegistered(key, Boolean(isOpen));
    return () => setModalRegistered(key, false);
  }, [key, isOpen, setModalRegistered]);
}
