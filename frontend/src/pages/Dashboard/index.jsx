import { useCallback, useEffect, useState } from "react";
import Notification from "../../components/Notification";
import SummaryCategory from "../../components/Charts/SummaryCategory";
import { dashboardService } from "./../../services/dashboardService.js";
import "./index.css";

function formatBrl(value) {
  return Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

async function fetchDashboardMetrics() {
  const [balanceData, totalExpensesData, qtdeExpensesData] = await Promise.all([
    dashboardService.balance(),
    dashboardService.totalExpenses(),
    dashboardService.qtdeExpenses(),
  ]);

  return {
    balance: Number(balanceData?.balance || 0),
    totalExpenses: Number(totalExpensesData?.total || 0),
    qtdeExpenses: Number(qtdeExpensesData?.quantidade || 0),
  };
}

function Home() {
  const [notification, setNotification] = useState(() => {
    const flashMessage = sessionStorage.getItem("flashMessage");

    if (!flashMessage) {
      return { message: "", type: "error" };
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

    return { message: "", type: "error" };
  });
  const [totalBalance, setTotalBalance] = useState(0);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [qtdeExpenses, setQtdeExpenses] = useState(0);

  const loadDashboardData = useCallback(async () => {
    try {
      const metrics = await fetchDashboardMetrics();
      setTotalBalance(metrics.balance);
      setTotalExpenses(metrics.totalExpenses);
      setQtdeExpenses(metrics.qtdeExpenses);
    } catch (error) {
      console.error(error);
    }
  }, []);

  useEffect(() => {
    let active = true;

    async function loadInitial() {
      try {
        const metrics = await fetchDashboardMetrics();
        if (active) {
          setTotalBalance(metrics.balance);
          setTotalExpenses(metrics.totalExpenses);
          setQtdeExpenses(metrics.qtdeExpenses);
        }
      } catch (error) {
        console.error(error);
      }
    }

    function handleFinanceUpdated() {
      loadDashboardData();
    }

    loadInitial();
    window.addEventListener("finance:updated", handleFinanceUpdated);
    return () => {
      active = false;
      window.removeEventListener("finance:updated", handleFinanceUpdated);
    };
  }, [loadDashboardData]);

  return (
    <div className="container">
      <Notification
        message={notification.message}
        type={notification.type}
        onClose={() =>
          setNotification({ message: "", type: notification.type })
        }
      />

      <div className="dashboard">
        <div
          className={`card ${totalBalance < 0 ? "card-negative" : "card-positive"}`}
          id="total-saldo"
        >
          Total de saldo: {formatBrl(totalBalance)}
        </div>
        <div className="card" id="total-despesas">
          Total de despesas: {formatBrl(totalExpenses)}
        </div>
        <div className="card" id="qtde-despesas">
          Quantidade de despesas: {qtdeExpenses}
        </div>
        <div className="card" id="summary">
          <SummaryCategory />
        </div>
      </div>
    </div>
  );
}

export default Home;
