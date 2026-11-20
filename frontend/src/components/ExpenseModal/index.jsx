import { useEffect, useState } from "react";
import { expenseService } from "../../services/expenseService";
import { categoriesService } from "../../services/categoriesService";
import { getTodayLocalIso } from "../../utils/date";
import "../../styles/shared-modal.css";

function ExpenseModalForm({ editingItem, externalCategories, onClose, onSuccess, onError }) {
  const [categories, setCategories] = useState(externalCategories || []);
  const [receiptFile, setReceiptFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    description: editingItem?.description || "",
    amount: editingItem?.amount ?? "",
    date: editingItem?.date || getTodayLocalIso(),
    status: editingItem?.status || "PENDENTE",
    categoryId: editingItem?.categoryId ? String(editingItem.categoryId) : "",
  });

  useEffect(() => {
    if (externalCategories && externalCategories.length > 0) {
      return undefined;
    }

    let active = true;
    categoriesService
      .getAll()
      .then((data) => {
        if (active) {
          setCategories(data || []);
        }
      })
      .catch((error) => {
        console.error(error);
      });

    return () => {
      active = false;
    };
  }, [externalCategories]);

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === "Escape") {
        onClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const categoryList =
    externalCategories && externalCategories.length > 0 ? externalCategories : categories;

  function handleChange(event) {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  }

  function handleReceiptChange(event) {
    const file = event.target.files?.[0] || null;

    if (file && file.size > 10 * 1024 * 1024) {
      setReceiptFile(null);
      event.target.value = "";
      onError?.("O PDF deve ter no máximo 10 MB.");
      return;
    }

    if (file && (file.type !== "application/pdf" || !file.name.toLowerCase().endsWith(".pdf"))) {
      setReceiptFile(null);
      event.target.value = "";
      onError?.("Selecione um arquivo PDF.");
      return;
    }

    setReceiptFile(file);
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const parsedAmount = Number(formData.amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      onError?.("Informe um valor maior que zero para a despesa.");
      return;
    }

    const today = getTodayLocalIso();
    if (!formData.date || formData.date > today) {
      onError?.("A data da despesa não pode ser maior que a data atual.");
      return;
    }

    if (!formData.categoryId) {
      onError?.("Selecione uma categoria.");
      return;
    }

    setSubmitting(true);
    try {
      const multipartData = new FormData();
      multipartData.append("description", formData.description.trim());
      multipartData.append("amount", parsedAmount);
      multipartData.append("date", formData.date);
      multipartData.append("status", formData.status);
      multipartData.append("categoryId", Number(formData.categoryId));
      if (receiptFile) {
        multipartData.append("receipt", receiptFile);
      }

      if (editingItem) {
        await expenseService.update(multipartData, editingItem.id);
      } else {
        await expenseService.create(multipartData);
      }

      await onSuccess?.(
        editingItem ? "Despesa atualizada com sucesso!" : "Despesa cadastrada com sucesso!"
      );
      onClose();
    } catch (error) {
      onError?.(error.response?.data?.message || error.message || "Erro ao salvar despesa");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="shared-modal-overlay" onClick={onClose}>
      <div className="shared-modal-card" onClick={(event) => event.stopPropagation()}>
        <h2>{editingItem ? "Editar despesa" : "Nova despesa"}</h2>
        <form onSubmit={handleSubmit} className="shared-modal-form">
          <label>
            Descrição
            <input
              type="text"
              name="description"
              maxLength={255}
              value={formData.description}
              onChange={handleChange}
            />
          </label>

          <label>
            Valor
            <input
              type="number"
              step="0.01"
              min="0.01"
              name="amount"
              value={formData.amount}
              onChange={handleChange}
              required
            />
          </label>

          <label>
            Data
            <input
              type="date"
              name="date"
              max={getTodayLocalIso()}
              value={formData.date}
              onChange={handleChange}
              required
            />
          </label>

          <label>
            Status
            <select name="status" value={formData.status} onChange={handleChange}>
              <option value="PENDENTE">PENDENTE</option>
              <option value="PAGA">PAGA</option>
            </select>
          </label>

          <label className="receipt-upload-label">
            Anexo (PDF, opcional)
            <input
              type="file"
              name="receipt"
              accept=".pdf,application/pdf"
              onChange={handleReceiptChange}
            />
            <small>Somente PDF • tamanho máximo: 10 MB</small>
            {receiptFile && <small className="receipt-selected">Novo arquivo: {receiptFile.name}</small>}
            {editingItem?.receiptPath && !receiptFile && (
              <small className="receipt-selected">
                Já existe um PDF anexado. Selecione outro arquivo para substituí-lo.
              </small>
            )}
          </label>

          <label>
            Categoria
            <select name="categoryId" value={formData.categoryId} onChange={handleChange} required>
              <option value="">Selecione uma categoria</option>
              {categoryList.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>

          <div className="shared-modal-actions">
            <button type="button" className="secondary-button" onClick={onClose} disabled={submitting}>
              Cancelar
            </button>
            <button type="submit" className="primary-button" disabled={submitting}>
              {submitting ? "Salvando..." : "Salvar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ExpenseModal({ isOpen, editingItem = null, categories = null, onClose, onSuccess, onError }) {
  if (!isOpen) {
    return null;
  }

  return (
    <ExpenseModalForm
      key={editingItem?.id || "new-expense"}
      editingItem={editingItem}
      externalCategories={categories}
      onClose={onClose}
      onSuccess={onSuccess}
      onError={onError}
    />
  );
}

export default ExpenseModal;
