import { useCallback, useContext, useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPenToSquare, faPlus, faTrash } from "@fortawesome/free-solid-svg-icons";
import { familyService } from "../../services/familyService";
import { ModalContext } from "../../contexts/modalContextInstance";
import { useRegisterModal } from "../../hooks/useRegisterModal";
import Notification from "../../components/Notification";
import "../Categories/index.css";
import "./index.css";

function Family() {
  const { notifyDataChanged } = useContext(ModalContext);
  const [members, setMembers] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
  });
  const [notification, setNotification] = useState({
    message: "",
    type: "success",
  });

  useRegisterModal("family-form-modal", isModalOpen);

  const loadMembers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await familyService.getAll();
      setMembers(data || []);
    } catch (error) {
      setNotification({
        message: error.response?.data?.message || error.message || "Erro ao carregar membros da família",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;

    async function loadInitial() {
      try {
        const data = await familyService.getAll();
        if (active) {
          setMembers(data || []);
        }
      } catch (error) {
        if (active) {
          setNotification({
            message: error.response?.data?.message || error.message || "Erro ao carregar membros da família",
            type: "error",
          });
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadInitial();
    return () => {
      active = false;
    };
  }, []);

  function openCreateModal() {
    setEditingMember(null);
    setFormData({ name: "", email: "", password: "" });
    setIsModalOpen(true);
  }

  function openEditModal(member) {
    setEditingMember(member);
    setFormData({
      name: member.name || "",
      email: member.email || "",
      password: "",
    });
    setIsModalOpen(true);
  }

  function closeModal() {
    setIsModalOpen(false);
    setEditingMember(null);
    setFormData({ name: "", email: "", password: "" });
  }

  function handleChange(event) {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);

    try {
      const payload = {
        name: formData.name.trim(),
        email: formData.email.trim(),
      };

      if (formData.password) {
        payload.password = formData.password;
      }

      if (editingMember) {
        await familyService.update(payload, editingMember.id);
      } else {
        await familyService.create(payload);
      }

      await loadMembers();
      closeModal();

      setNotification({
        message: editingMember
          ? "Membro da família atualizado com sucesso!"
          : "Membro da família cadastrado com sucesso!",
        type: "success",
      });
    } catch (error) {
      setNotification({
        message: error.response?.data?.message || error.message || "Erro ao salvar membro",
        type: "error",
      });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(member) {
    const confirmed = window.confirm(
      `Deseja remover "${member.name}" da sua família? Todas as despesas lançadas por este usuário também serão excluídas.`
    );

    if (!confirmed) {
      return;
    }

    try {
      await familyService.delete(member.id);
      await loadMembers();
      notifyDataChanged("expense");
      setNotification({
        message: "Membro da família removido com sucesso!",
        type: "success",
      });
    } catch (error) {
      setNotification({
        message: error.response?.data?.message || error.message || "Erro ao remover membro",
        type: "error",
      });
    }
  }

  const filteredMembers = members.filter((member) => {
    const searchText = `${member.name || ""} ${member.email || ""}`.toLowerCase();
    return searchText.includes(search.toLowerCase());
  });

  return (
    <div className="page-shell">
      <Notification
        message={notification.message}
        type={notification.type}
        onClose={() => setNotification({ message: "", type: notification.type })}
      />

      <div className="page-header">
        <h1>Família (Controle Parental)</h1>
        <p className="family-subtitle">
          Cadastre usuários dependentes com acesso restrito ao lançamento de despesas. Os gastos deles entram no saldo da família.
        </p>
      </div>

      <div className="page-actions">
        <input
          type="text"
          className="search-input"
          placeholder="Pesquisar membro..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />

        <button type="button" className="primary-button" onClick={openCreateModal}>
          <FontAwesomeIcon icon={faPlus} />
          <span>Novo Membro</span>
        </button>
      </div>

      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>Nome</th>
              <th>E-mail</th>
              <th>Perfil</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="4" className="empty-state">
                  Carregando membros...
                </td>
              </tr>
            ) : filteredMembers.length > 0 ? (
              filteredMembers.map((member) => (
                <tr key={member.id}>
                  <td>{member.name}</td>
                  <td>{member.email}</td>
                  <td>
                    <span className="role-badge">Dependente ({member.role})</span>
                  </td>
                  <td>
                    <div className="table-actions">
                      <button
                        type="button"
                        className="icon-button edit"
                        onClick={() => openEditModal(member)}
                      >
                        <FontAwesomeIcon icon={faPenToSquare} />
                        <span>Editar</span>
                      </button>
                      <button
                        type="button"
                        className="icon-button delete"
                        onClick={() => handleDelete(member)}
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
                <td colSpan="4" className="empty-state">
                  Nenhum membro cadastrado na família.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-card" onClick={(event) => event.stopPropagation()}>
            <h2>{editingMember ? "Editar membro" : "Novo membro"}</h2>
            <form onSubmit={handleSubmit} className="modal-form">
              <label>
                Nome
                <input
                  type="text"
                  name="name"
                  maxLength={255}
                  value={formData.name}
                  onChange={handleChange}
                  required
                />
              </label>

              <label>
                E-mail
                <input
                  type="email"
                  name="email"
                  maxLength={255}
                  value={formData.email}
                  onChange={handleChange}
                  required
                />
              </label>

              <label>
                Senha
                <input
                  type="password"
                  name="password"
                  minLength={8}
                  maxLength={72}
                  placeholder={
                    editingMember
                      ? "Deixe em branco para manter a senha atual"
                      : "Mín. 8 chars (maiúscula, minúscula, número e especial)"
                  }
                  value={formData.password}
                  onChange={handleChange}
                  required={!editingMember}
                />
              </label>

              <p className="family-form-hint">
                Este usuário terá perfil restrito (<strong>user</strong>) e poderá apenas gerenciar despesas.
              </p>

              <div className="modal-actions">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={closeModal}
                  disabled={submitting}
                >
                  Cancelar
                </button>
                <button type="submit" className="primary-button" disabled={submitting}>
                  {submitting ? "Salvando..." : "Salvar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Family;
