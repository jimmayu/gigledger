import { Link, useLocation } from 'react-router-dom'
import {
  HomeIcon,
  CurrencyDollarIcon,
  ShoppingBagIcon,
  ChartBarIcon,
  UserIcon,
  UserGroupIcon
} from '@heroicons/react/24/outline'

const navigation = [
  { name: 'Dashboard', href: '/', icon: HomeIcon },
  { name: 'Transactions', href: '/transactions', icon: CurrencyDollarIcon },
  { name: 'Assets', href: '/assets', icon: ShoppingBagIcon },
  { name: 'Reports', href: '/reports', icon: ChartBarIcon }
]

const adminNavigation = [
  { name: 'Users', href: '/admin', icon: UserGroupIcon }
]

export default function NavBar({ user, onLogout }) {
  const location = useLocation()

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link to="/" className="text-xl font-bold text-gray-900">
              GigLedger
            </Link>
          </div>

          {/* Navigation Links */}
          <div className="hidden md:flex space-x-8">
            {[...navigation, ...(user?.role === 'admin' ? adminNavigation : [])].map((item) => {
              const Icon = item.icon
              const isActive = location.pathname === item.href
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`flex items-center px-3 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? 'text-blue-600 border-b-2 border-blue-600'
                      : 'text-gray-500 hover:text-gray-700 hover:border-b-2 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-4 h-4 mr-2" />
                  {item.name}
                </Link>
              )
            })}
          </div>

          {/* User Menu */}
          <div className="flex items-center space-x-4">
            {user && (
              <div className="flex items-center space-x-3">
                <div className="hidden sm:block">
                  <p className="text-sm text-gray-700">Welcome, {user.username}</p>
                </div>
                <div className="flex items-center space-x-2">
                  <UserIcon className="w-5 h-5 text-gray-400" />
                  <button
                    onClick={onLogout}
                    className="text-sm text-gray-500 hover:text-gray-700 underline"
                  >
                    Sign out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Navigation */}
        <div className="md:hidden border-t border-gray-200">
          <div className="flex justify-around py-2">
            {[...navigation, ...(user?.role === 'admin' ? adminNavigation : [])].map((item) => {
              const Icon = item.icon
              const isActive = location.pathname === item.href
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`flex flex-col items-center px-3 py-2 text-xs font-medium transition-colors ${
                    isActive
                      ? 'text-blue-600'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Icon className="w-6 h-6" />
                  <span className="mt-1">{item.name}</span>
                </Link>
              )
            })}
          </div>
        </div>
      </div>
    </nav>
  )
}