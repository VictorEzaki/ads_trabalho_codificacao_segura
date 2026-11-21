import { useContext } from "react";
import { Link } from "react-router-dom";
import { AuthContext } from "../../contexts/AuthContext";
import "./index.css";

function SidebarNav({ isOpen }) {
  const { isAdmin } = useContext(AuthContext);

  return (
    <nav className={`sidebar-nav ${isOpen ? "open" : "closed"}`}>
      {isAdmin && <Link to="/dashboard">Dashboard</Link>}
      {isAdmin && <Link to="/incomes">Receitas</Link>}
      <Link to="/expenses">Despesas</Link>
      {isAdmin && <Link to="/categories">Categorias</Link>}
      {isAdmin && <Link to="/family">Família</Link>}
    </nav>
  );
}

export default SidebarNav;
