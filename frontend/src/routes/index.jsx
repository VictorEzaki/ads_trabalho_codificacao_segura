import { Routes, Route } from 'react-router-dom'
import PrivateRoute from './privateRoute'

import Login from './../pages/Auth/Login'
import Register from './../pages/Auth/Register'
import Dashboard from './../pages/Dashboard'
import Incomes from './../pages/Incomes'
import Expenses from './../pages/Expenses'
import Categories from './../pages/Categories'
import Family from './../pages/Family'
import MainLayout from './../layouts/MainLayout'

function AppRoutes() {
    return (
        <Routes>
            <Route path='/' element={<Login />} />
            <Route path='/register' element={<Register />} />
            <Route element={<MainLayout />}>
                <Route path='/dashboard' element={
                    <PrivateRoute allowedRoles={['admin']}>
                        <Dashboard />
                    </PrivateRoute>
                } />
                <Route path='/incomes' element={
                    <PrivateRoute allowedRoles={['admin']}>
                        <Incomes />
                    </PrivateRoute>
                } />
                <Route path='/expenses' element={
                    <PrivateRoute allowedRoles={['admin', 'user']}>
                        <Expenses />
                    </PrivateRoute>
                } />
                <Route path='/categories' element={
                    <PrivateRoute allowedRoles={['admin']}>
                        <Categories />
                    </PrivateRoute>
                } />
                <Route path='/family' element={
                    <PrivateRoute allowedRoles={['admin']}>
                        <Family />
                    </PrivateRoute>
                } />
            </Route>
        </Routes>
    )
}

export default AppRoutes
