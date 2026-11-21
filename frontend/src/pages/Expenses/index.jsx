import { useCallback, useContext, useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPenToSquare, faPlus, faTrash, faEye, faDownload, faFilePdf, faXmark } from "@fortawesome/free-solid-svg-icons";
import { expenseService } from "../../services/expenseService";
import { categoriesService } from "../../services/categoriesService";
import { AuthContext } from "../../contexts/AuthContext";
import { ModalContext } from "../../contexts/modalContextInstance";
import { useRegisterModal } from "../../hooks/useRegisterModal";
import ExpenseModal from "../../components/ExpenseModal";
import Notification from "../../components/Notification";
import "./index.css";

function Expenses() {
  const { user, isAdmin } = useContext(AuthContext);
  const { notifyDataChanged } = useContext(ModalContext);
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [receiptPreviewUrl, setReceiptPreviewUrl] = useState("");

  const [formFilter, setFormFilter] = useState({
    dateInicial: "",
    dateFinal: "",
    valueMin: "",
    valueMax: "",
  });

  const [notification, setNotification] = useState(() => {
    const flashMessage = sessionStorage.getItem("flashMessage");

    if (!flashMessage) {
      return {
        message: "",
        type: "error",
      };
    }

    try {
      const parsedMessage = JSON.parse(flashMessage);

      if (parsedMessage.message) {
        return {
          message: parsedMessage.message,
          type: parsedMessage.type || "success",
        };
      }
    } catch {
      return {
        message: flashMessage,
        type: "success",
      };
    } finally {
      sessionStorage.removeItem("flashMessage");
    }

    return {
      message: "",
      type: "error",
    };
  });

  useRegisterModal("expenses-form-modal", isModalOpen);
  useRegisterModal("expenses-receipt-preview", Boolean(receiptPreviewUrl));

  const loadItems = useCallback(async (params = {}) => {
    setLoading(true);

    try {
      const data = await expenseService.getAll(params);
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
        const [expensesData, categoriesData] = await Promise.all([
          expenseService.getAll(),
          categoriesService.getAll(),
        ]);
        if (active) {
          setItems(expensesData || []);
          setCategories(categoriesData || []);
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
      if (!event.detail?.kind || event.detail.kind === "expense") {
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
      if (receiptPreviewUrl) {
        URL.revokeObjectURL(receiptPreviewUrl);
      }
    };
  }, [receiptPreviewUrl]);

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

  function handleChangeFilter(event) {
    const { name, value } = event.target;
    setFormFilter((prev) => ({ ...prev, [name]: value }));
  }

  async function handleModalSuccess(message) {
    await loadItems();
    notifyDataChanged("expense");
    setNotification({ message, type: "success" });
  }

  function handleModalError(message) {
    setNotification({ message, type: "error" });
  }

  async function handleViewReceipt(id) {
    try {
      const pdfBlob = await expenseService.getReceipt(id);
      if (receiptPreviewUrl) URL.revokeObjectURL(receiptPreviewUrl);
      const url = URL.createObjectURL(new Blob([pdfBlob], { type: "application/pdf" }));
      setReceiptPreviewUrl(url);
    } catch (error) {
      setNotification({
        message: error.response?.data?.message || "Não foi possível abrir o PDF.",
        type: "error",
      });
    }
  }

  async function handleDownloadReceipt(id) {
    try {
      const pdfBlob = await expenseService.getReceipt(id, true);
      const url = URL.createObjectURL(new Blob([pdfBlob], { type: "application/pdf" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = `cupom-${id}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      setNotification({
        message: error.response?.data?.message || "Não foi possível baixar o PDF.",
        type: "error",
      });
    }
  }

  function closeReceiptPreview() {
    if (receiptPreviewUrl) URL.revokeObjectURL(receiptPreviewUrl);
    setReceiptPreviewUrl("");
  }

  async function handleDelete(id) {
    try {
      await expenseService.delete(id);
      await loadItems();
      notifyDataChanged("expense");
      setNotification({ message: "Despesa excluída com sucesso!", type: "success" });
    } catch (error) {
      setNotification({
        message: error.response?.data?.message || error.message || "Erro ao excluir despesa",
        type: "error",
      });
    }
  }

  const filteredItems = items.filter((item) => {
    const ownerName = item.users?.name || "";
    const searchText = `${item.description || ""} ${item.amount || ""} ${item.date || ""} ${item.status || ""} ${ownerName}`.toLowerCase();
    return searchText.includes(search.toLowerCase());
  });

  async function handleSearch(event) {
    event.preventDefault();

    try {
      const params = {
        dateInicial: formFilter.dateInicial,
        dateFinal: formFilter.dateFinal,
        valueMin: formFilter.valueMin,
        valueMax: formFilter.valueMax,
      };

      await loadItems(params);
    } catch (error) {
      console.error(error);
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
        <h1>Despesas</h1>
      </div>

      <div className="page-actions">
        <div className="filters">
          <input
            type="text"
            className="search-input"
            placeholder="Pesquisar despesa..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />

          <form className="filter-form" onSubmit={handleSearch}>
            <span className="filters-group">
              <input
                type="date"
                name="dateInicial"
                className="search-input periodo"
                value={formFilter.dateInicial}
                onChange={handleChangeFilter}
              />

              <span>até</span>

              <input
                type="date"
                name="dateFinal"
                className="search-input periodo"
                value={formFilter.dateFinal}
                onChange={handleChangeFilter}
              />
            </span>

            <span className="filters-group">
              <input
                type="number"
                name="valueMin"
                className="search-input value"
                placeholder="Valor mínimo"
                value={formFilter.valueMin}
                onChange={handleChangeFilter}
              />

              <span>-</span>

              <input
                type="number"
                name="valueMax"
                className="search-input value"
                placeholder="Valor máximo"
                value={formFilter.valueMax}
                onChange={handleChangeFilter}
              />
            </span>

            <button type="submit">Buscar</button>
          </form>
        </div>

        <button
          type="button"
          className="primary-button"
          onClick={openCreateModal}
        >
          <FontAwesomeIcon icon={faPlus} />
          <span>Nova Despesa</span>
        </button>
      </div>

      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>Descrição</th>
              <th>Valor</th>
              <th>Data</th>
              <th>Status</th>
              <th>Categoria</th>
              {isAdmin && <th>Responsável</th>}
              <th>Anexos</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={isAdmin ? 8 : 7} className="empty-state">
                  Carregando despesas...
                </td>
              </tr>
            ) : filteredItems.length > 0 ? (
              filteredItems.map((item) => (
                <tr key={item.id}>
                  <td>{item.description}</td>
                  <td>{Number(item.amount).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</td>
                  <td>{item.date}</td>
                  <td>{item.status}</td>
                  <td>{categories.find((category) => category.id === item.categoryId)?.name || item.categoryId}</td>
                  {isAdmin && (
                    <td>
                      {Number(item.userId) === Number(user?.id)
                        ? `${item.users?.name || user?.name || "Você"} (Você)`
                        : item.users?.name || "Dependente"}
                    </td>
                  )}
                  <td>
                    {item.receiptPath ? (
                      <div className="table-actions attachment-actions">
                        <button type="button" className="icon-button edit" title="Visualizar PDF" onClick={() => handleViewReceipt(item.id)}>
                          <FontAwesomeIcon icon={faEye} />
                          <span>Visualizar</span>
                        </button>
                        <button type="button" className="icon-button edit" title="Baixar PDF" onClick={() => handleDownloadReceipt(item.id)}>
                          <FontAwesomeIcon icon={faDownload} />
                          <span>Baixar</span>
                        </button>
                      </div>
                    ) : <span className="no-attachment">Sem anexo</span>}
                  </td>
                  <td>
                    <div className="table-actions">
                      <button type="button" className="icon-button edit" onClick={() => openEditModal(item)}>
                        <FontAwesomeIcon icon={faPenToSquare} />
                        <span>Editar</span>
                      </button>
                      <button type="button" className="icon-button delete" onClick={() => handleDelete(item.id)}>
                        <FontAwesomeIcon icon={faTrash} />
                        <span>Excluir</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={isAdmin ? 8 : 7} className="empty-state">
                  Nenhuma despesa encontrada.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <ExpenseModal
        isOpen={isModalOpen}
        editingItem={editingItem}
        categories={categories}
        onClose={closeModal}
        onSuccess={handleModalSuccess}
        onError={handleModalError}
      />

      {receiptPreviewUrl && (
        <div className="modal-overlay receipt-preview-overlay" onClick={closeReceiptPreview}>
          <div className="receipt-preview-card" onClick={(event) => event.stopPropagation()}>
            <div className="receipt-preview-header">
              <h2><FontAwesomeIcon icon={faFilePdf} /> Visualizar anexo</h2>
              <button type="button" className="icon-button" onClick={closeReceiptPreview} aria-label="Fechar visualização">
                <FontAwesomeIcon icon={faXmark} />
              </button>
            </div>
            <iframe title="Visualização do cupom fiscal" src={receiptPreviewUrl} className="receipt-preview-frame" />
          </div>
        </div>
      )}
    </div>
  );
}

export default Expenses;
