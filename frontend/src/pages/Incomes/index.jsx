import { useCallback, useContext, useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faDownload,
  faEye,
  faFileInvoiceDollar,
  faPenToSquare,
  faPlus,
  faTrash,
  faXmark,
} from "@fortawesome/free-solid-svg-icons";
import { incomeService } from "../../services/incomeService";
import { ModalContext } from "../../contexts/modalContextInstance";
import { useRegisterModal } from "../../hooks/useRegisterModal";
import IncomeModal from "../../components/IncomeModal";
import Notification from "../../components/Notification";
import "./index.css";

function Incomes() {
  const { notifyDataChanged } = useContext(ModalContext);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [receiptPreview, setReceiptPreview] = useState({ url: "", isImage: false });
  const [notification, setNotification] = useState({ message: "", type: "success" });

  useRegisterModal("incomes-form-modal", isModalOpen);
  useRegisterModal("incomes-receipt-preview", Boolean(receiptPreview.url));

  const loadItems = useCallback(async () => {
    setLoading(true);
    try {
      const data = await incomeService.getAll();
      setItems(data || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;

    async function loadInitial() {
      try {
        const data = await incomeService.getAll();
        if (active) {
          setItems(data || []);
        }
      } catch (error) {
        console.error(error);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    function handleFinanceUpdated(event) {
      if (!event.detail?.kind || event.detail.kind === "income") {
        loadItems();
      }
    }

    loadInitial();
    window.addEventListener("finance:updated", handleFinanceUpdated);
    return () => {
      active = false;
      window.removeEventListener("finance:updated", handleFinanceUpdated);
    };
  }, [loadItems]);

  useEffect(() => {
    return () => {
      if (receiptPreview.url) {
        URL.revokeObjectURL(receiptPreview.url);
      }
    };
  }, [receiptPreview.url]);

  function openCreateModal() {
    setEditingItem(null);
    setIsModalOpen(true);
  }

  function openEditModal(item) {
    setEditingItem(item);
    setIsModalOpen(true);
  }

  function closeModal() {
    setIsModalOpen(false);
    setEditingItem(null);
  }

  async function handleModalSuccess(message) {
    await loadItems();
    notifyDataChanged("income");
    setNotification({ message, type: "success" });
  }

  function handleModalError(message) {
    setNotification({ message, type: "error" });
  }

  async function handleViewReceipt(item) {
    try {
      const { blob, contentType } = await incomeService.getReceipt(item.id);
      const isImage =
        contentType.includes("image/png") ||
        (item.receiptPath || "").toLowerCase().endsWith(".png");
      const mimeType = isImage ? "image/png" : "application/pdf";

      if (receiptPreview.url) {
        URL.revokeObjectURL(receiptPreview.url);
      }

      const url = URL.createObjectURL(new Blob([blob], { type: mimeType }));
      setReceiptPreview({ url, isImage });
    } catch (error) {
      setNotification({
        message: error.response?.data?.message || "Não foi possível abrir o comprovante.",
        type: "error",
      });
    }
  }

  async function handleDownloadReceipt(item) {
    try {
      const { blob, contentType } = await incomeService.getReceipt(item.id, true);
      const isImage =
        contentType.includes("image/png") ||
        (item.receiptPath || "").toLowerCase().endsWith(".png");
      const mimeType = isImage ? "image/png" : "application/pdf";
      const extension = isImage ? ".png" : ".pdf";

      const url = URL.createObjectURL(new Blob([blob], { type: mimeType }));
      const link = document.createElement("a");
      link.href = url;
      link.download = `comprovante-receita-${item.id}${extension}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      setNotification({
        message: error.response?.data?.message || "Não foi possível baixar o comprovante.",
        type: "error",
      });
    }
  }

  function closeReceiptPreview() {
    if (receiptPreview.url) {
      URL.revokeObjectURL(receiptPreview.url);
    }
    setReceiptPreview({ url: "", isImage: false });
  }

  async function handleDelete(id) {
    try {
      await incomeService.delete(id);
      await loadItems();
      notifyDataChanged("income");
      setNotification({ message: "Receita excluída com sucesso!", type: "success" });
    } catch (error) {
      setNotification({
        message: error.response?.data?.message || error.message || "Erro ao excluir receita",
        type: "error",
      });
    }
  }

  return (
    <div className="page-shell">
      <Notification
        message={notification.message}
        type={notification.type}
        onClose={() => setNotification({ message: "", type: notification.type })}
      />

      <div className="page-header">
        <h1>Receitas</h1>
      </div>

      <div className="incomes-actions">
        <button type="button" className="primary-button" onClick={openCreateModal}>
          <FontAwesomeIcon icon={faPlus} />
          <span>Nova Receita</span>
        </button>
      </div>

      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>Descrição</th>
              <th>Valor</th>
              <th>Data</th>
              <th>Anexos</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="5" className="empty-state">
                  Carregando receitas...
                </td>
              </tr>
            ) : items.length > 0 ? (
              items.map((item) => (
                <tr key={item.id}>
                  <td>{item.description}</td>
                  <td>
                    {Number(item.amount).toLocaleString("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    })}
                  </td>
                  <td>{item.date}</td>
                  <td>
                    {item.receiptPath ? (
                      <div className="table-actions attachment-actions">
                        <button
                          type="button"
                          className="icon-button edit"
                          title="Visualizar comprovante"
                          onClick={() => handleViewReceipt(item)}
                        >
                          <FontAwesomeIcon icon={faEye} />
                          <span>Visualizar</span>
                        </button>
                        <button
                          type="button"
                          className="icon-button edit"
                          title="Baixar comprovante"
                          onClick={() => handleDownloadReceipt(item)}
                        >
                          <FontAwesomeIcon icon={faDownload} />
                          <span>Baixar</span>
                        </button>
                      </div>
                    ) : (
                      <span className="no-attachment">Sem anexo</span>
                    )}
                  </td>
                  <td>
                    <div className="table-actions">
                      <button
                        type="button"
                        className="icon-button edit"
                        onClick={() => openEditModal(item)}
                      >
                        <FontAwesomeIcon icon={faPenToSquare} />
                        <span>Editar</span>
                      </button>
                      <button
                        type="button"
                        className="icon-button delete"
                        onClick={() => handleDelete(item.id)}
                      >
                        <FontAwesomeIcon icon={faTrash} />
                        <span>Excluir</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="5" className="empty-state">
                  Nenhuma receita encontrada.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <IncomeModal
        isOpen={isModalOpen}
        editingItem={editingItem}
        onClose={closeModal}
        onSuccess={handleModalSuccess}
        onError={handleModalError}
      />

      {receiptPreview.url && (
        <div className="modal-overlay receipt-preview-overlay" onClick={closeReceiptPreview}>
          <div className="receipt-preview-card" onClick={(event) => event.stopPropagation()}>
            <div className="receipt-preview-header">
              <h2>
                <FontAwesomeIcon icon={faFileInvoiceDollar} /> Visualizar comprovante
              </h2>
              <button
                type="button"
                className="icon-button"
                onClick={closeReceiptPreview}
                aria-label="Fechar visualização"
              >
                <FontAwesomeIcon icon={faXmark} />
              </button>
            </div>

            {receiptPreview.isImage ? (
              <div className="income-receipt-image-wrapper">
                <img
                  src={receiptPreview.url}
                  alt="Comprovante da receita"
                  className="income-receipt-preview-image"
                />
              </div>
            ) : (
              <iframe
                title="Visualização do comprovante"
                src={receiptPreview.url}
                className="receipt-preview-frame"
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default Incomes;
