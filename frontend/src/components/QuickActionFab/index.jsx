import { useContext } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faMinus, faPlus } from "@fortawesome/free-solid-svg-icons";
import { AuthContext } from "../../contexts/AuthContext";
import { ModalContext } from "../../contexts/modalContextInstance";
import "./index.css";

function QuickActionFab() {
  const { authenticated, isAdmin } = useContext(AuthContext);
  const { hasOpenModal, openQuickIncomeModal, openQuickExpenseModal } = useContext(ModalContext);

  if (!authenticated || hasOpenModal) {
    return null;
  }

  return (
    <div className="quick-action-fab-group" aria-label="Atalhos de lançamento rápido">
      {isAdmin && (
        <button
          type="button"
          className="quick-action-fab income"
          onClick={openQuickIncomeModal}
          aria-label="Nova Receita"
        >
          <FontAwesomeIcon icon={faPlus} />
          <span>Nova Receita</span>
        </button>
      )}

      <button
        type="button"
        className="quick-action-fab expense"
        onClick={openQuickExpenseModal}
        aria-label="Nova Despesa"
      >
        <FontAwesomeIcon icon={faMinus} />
        <span>Nova Despesa</span>
      </button>
    </div>
  );
}

export default QuickActionFab;
