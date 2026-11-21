import { useContext } from "react";
import { Navigate } from "react-router-dom";
import { AuthContext } from "./../contexts/AuthContext";

function PrivateRoute({ children, allowedRoles }) {
    const { authenticated, loading, user } = useContext(AuthContext);

    if (loading) {
        return <p>Carregando...</p>;
    }

    if (!authenticated) {
        return <Navigate to="/" replace />;
    }

    if (allowedRoles && !allowedRoles.includes(user?.role)) {
        const fallbackRoute = user?.role === "admin" ? "/dashboard" : "/expenses";
        return <Navigate to={fallbackRoute} replace />;
    }

    return children;
}

export default PrivateRoute;
