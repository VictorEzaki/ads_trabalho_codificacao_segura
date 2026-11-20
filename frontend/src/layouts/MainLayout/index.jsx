import { Outlet, useNavigate } from "react-router-dom";
import { useContext, useState } from "react";
import { AuthContext } from "./../../contexts/AuthContext";
import { ModalProvider } from "./../../contexts/ModalContext";
import { ModalContext } from "./../../contexts/modalContextInstance";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBars } from "@fortawesome/free-solid-svg-icons";
import SidebarNav from "./../../components/SideBarNav";
import Notification from "./../../components/Notification";
import QuickActionFab from "./../../components/QuickActionFab";
import IncomeModal from "./../../components/IncomeModal";
import ExpenseModal from "./../../components/ExpenseModal";
import "./index.css";

function MainLayoutContent() {
  const { logout } = useContext(AuthContext);
  const {
    activeQuickModal,
    closeQuickModal,
    notification,
    showNotification,
    clearNotification,
    notifyDataChanged,
  } = useContext(ModalContext);
  const navigate = useNavigate();

  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  async function handleLogout() {
    await logout();
    navigate("/", { replace: true });
  }

  function toggleSidebar() {
    setIsSidebarOpen((prev) => !prev);
  }

  return (
    <div className="main-layout">
      <Notification
        message={notification.message}
        type={notification.type}
        onClose={clearNotification}
      />

      <aside className={`sidebar ${isSidebarOpen ? "open" : "closed"}`}>
        <div className="header-sidebar">
          <h2 className="logo">FinanceApp</h2>

          <button
            type="button"
            className="menu-btn"
            onClick={toggleSidebar}
            aria-label={isSidebarOpen ? "Fechar menu lateral" : "Abrir menu lateral"}
            aria-expanded={isSidebarOpen}
          >
            <FontAwesomeIcon icon={faBars} />
          </button>
        </div>

        <SidebarNav isOpen={isSidebarOpen} />
      </aside>

      <main className="main-layout-content">
        <header className="main-layout-topbar">
          <button onClick={handleLogout}>Sair</button>
        </header>

        <section className="main-layout-page">
          <Outlet />
        </section>
      </main>

      <QuickActionFab />

      <IncomeModal
        isOpen={activeQuickModal === "income"}
        onClose={closeQuickModal}
        onSuccess={(message) => {
          showNotification(message, "success");
          notifyDataChanged("income");
        }}
        onError={(message) => showNotification(message, "error")}
      />

      <ExpenseModal
        isOpen={activeQuickModal === "expense"}
        onClose={closeQuickModal}
        onSuccess={(message) => {
          showNotification(message, "success");
          notifyDataChanged("expense");
        }}
        onError={(message) => showNotification(message, "error")}
      />
    </div>
  );
}

function MainLayout() {
  return (
    <ModalProvider>
      <MainLayoutContent />
    </ModalProvider>
  );
}

export default MainLayout;
