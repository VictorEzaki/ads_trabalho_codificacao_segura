import { useEffect, useState } from "react";
import { incomeService } from "../../services/incomeService";
import { getTodayLocalIso } from "../../utils/date";
import "../../styles/shared-modal.css";

const ALLOWED_MIMES = new Set(["application/pdf", "image/png"]);
const ALLOWED_EXTENSIONS = [".pdf", ".png"];

function isAllowedReceiptFile(file) {
  const lowerName = (file.name || "").toLowerCase();
  const hasAllowedExtension = ALLOWED_EXTENSIONS.some((ext) => lowerName.endsWith(ext));
  return hasAllowedExtension && ALLOWED_MIMES.has(file.type);
}

function IncomeModalForm({ editingItem, onClose, onSuccess, onError }) {
  const [receiptFile, setReceiptFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    description: editingItem?.description || "",
    amount: editingItem?.amount ?? "",
    date: editingItem?.date || getTodayLocalIso(),
  });

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === "Escape") {
        onClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  function handleChange(event) {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  }

  function handleReceiptChange(event) {
    const file = event.target.files?.[0] || null;

    if (file && file.size > 10 * 1024 * 1024) {
      setReceiptFile(null);
      event.target.value = "";
      onError?.("O comprovante deve ter no máximo 10 MB.");
      return;
    }

    if (file && !isAllowedReceiptFile(file)) {
      setReceiptFile(null);
      event.target.value = "";
      onError?.("Selecione um arquivo PDF ou PNG válido.");
      return;
    }

    setReceiptFile(file);
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const cleanedDescription = formData.description.trim();
    if (!cleanedDescription) {
      onError?.("Informe uma descrição para a receita.");
      return;
    }

    const parsedAmount = Number(formData.amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      onError?.("Informe um valor maior que zero para a receita.");
      return;
    }

    const today = getTodayLocalIso();
    if (!formData.date || formData.date > today) {
      onError?.("A data da receita não pode ser maior que a data atual.");
      return;
    }

    setSubmitting(true);
    try {
      const multipartData = new FormData();
      multipartData.append("description", cleanedDescription);
      multipartData.append("amount", parsedAmount);
      multipartData.append("date", formData.date);
      if (receiptFile) {
        multipartData.append("receipt", receiptFile);
      }

      if (editingItem) {
        await incomeService.update(multipartData, editingItem.id);
      } else {
        await incomeService.create(multipartData);
      }

      await onSuccess?.(
        editingItem ? "Receita atualizada com sucesso!" : "Receita cadastrada com sucesso!"
      );
      onClose();
    } catch (error) {
      onError?.(error.response?.data?.message || error.message || "Erro ao salvar receita");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="shared-modal-overlay" onClick={onClose}>
      <div className="shared-modal-card" onClick={(event) => event.stopPropagation()}>
        <h2>{editingItem ? "Editar receita" : "Nova receita"}</h2>
        <form onSubmit={handleSubmit} className="shared-modal-form">
          <label>
            Descrição
            <input
              type="text"
              name="description"
              placeholder="Ex: Salário, Freelance..."
              maxLength={255}
              value={formData.description}
              onChange={handleChange}
              required
            />
          </label>

          <label>
            Valor
            <input
              type="number"
              step="0.01"
              min="0.01"
              name="amount"
              placeholder="0,00"
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

          <label className="receipt-upload-label">
            Comprovante (PDF ou PNG, opcional)
            <input
              type="file"
              name="receipt"
              accept=".pdf,.png,application/pdf,image/png"
              onChange={handleReceiptChange}
            />
            <small>Somente PDF ou PNG • tamanho máximo: 10 MB</small>
            {receiptFile && <small className="receipt-selected">Novo arquivo: {receiptFile.name}</small>}
            {editingItem?.receiptPath && !receiptFile && (
              <small className="receipt-selected">
                Já existe um comprovante anexado. Selecione outro arquivo para substituí-lo.
              </small>
            )}
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

function IncomeModal({ isOpen, editingItem = null, onClose, onSuccess, onError }) {
  if (!isOpen) {
    return null;
  }

  return (
    <IncomeModalForm
      key={editingItem?.id || "new-income"}
      editingItem={editingItem}
      onClose={onClose}
      onSuccess={onSuccess}
      onError={onError}
    />
  );
}

export default IncomeModal;
