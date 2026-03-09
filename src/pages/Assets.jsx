import { useState, useEffect } from 'react'
import AssetModal from '../components/modals/AssetModal.jsx'

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, '') + '/api'

export default function Assets() {
  const [assets, setAssets] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [editingAsset, setEditingAsset] = useState(null)
  const [taxYear, setTaxYear] = useState(new Date().getFullYear())

  useEffect(() => {
    loadAssets()
  }, [taxYear])

  const loadAssets = async () => {
    try {
      setError(null) // Reset error on retry
      const response = await fetch(`${API_BASE}/assets?year=${taxYear}`, {
        credentials: 'include'
      })
      if (response.ok) {
        let data = await response.json()
        // Convert cents to dollars (depreciation already calculated on server)
        data = data.map(asset => ({
          ...asset,
          cost_basis: asset.cost_basis / 100,
          disposal_price: asset.disposal_price ? asset.disposal_price / 100 : null,
        }))
        setAssets(data)
      } else {
        // Handle API errors
        const errorData = await response.json().catch(() => ({}))
        setError(errorData.error || `Failed to load assets: ${response.status}`)
      }
    } catch (error) {
      console.error('Failed to load assets:', error)
      setError(error.message || 'Network error occurred. Please check your connection.')
    } finally {
      setLoading(false)
    }
  }

  const handleAddAsset = () => {
    setEditingAsset(null)
    setShowModal(true)
  }

  const handleEditAsset = (asset) => {
    setEditingAsset(asset)
    setShowModal(true)
  }

  const handleSellAsset = async (assetId) => {
    const sellDate = prompt('Enter the sale date (YYYY-MM-DD):')
    const sellPrice = prompt('Enter the sale price ($):')

    if (!sellDate || !sellPrice) return

    try {
      const response = await fetch(`${API_BASE}/assets/${assetId}/sell`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          disposal_date: sellDate,
          disposal_price: parseFloat(sellPrice)
        })
      })
      if (response.ok) {
        loadAssets()
      }
    } catch (error) {
      console.error('Failed to sell asset:', error)
    }
  }

  const handleDeleteAsset = async (assetId) => {
    if (!confirm('Are you sure you want to delete this asset?')) return

    try {
      const response = await fetch(`${API_BASE}/assets/${assetId}`, {
        method: 'DELETE',
        credentials: 'include'
      })
      if (response.ok) {
        loadAssets()
      }
    } catch (error) {
      console.error('Failed to delete asset:', error)
    }
  }

  const handleSaveAsset = async () => {
    await loadAssets()
    setShowModal(false)
    setEditingAsset(null)
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0)
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const getDepreciationMethodDisplay = (method) => {
    const displays = {
      ST_3YEAR: '3-Year MACRS',
      ST_5YEAR: '5-Year MACRS',
      ST_7YEAR: '7-Year MACRS',
      BONUS_100: '100% Bonus Depreciation'
    }
    return displays[method] || method
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-96 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center mb-4">
            <div className="flex-shrink-0">
              <svg className="h-8 w-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <div className="ml-3">
              <h2 className="text-lg font-medium text-gray-900">
                Failed to load assets
              </h2>
            </div>
          </div>
          <div className="mb-4">
            <p className="text-sm text-gray-600">
              {error}
            </p>
          </div>
          <button
            onClick={loadAssets}
            className="w-full bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  const totalAssetValue = assets.reduce((sum, asset) => sum + (asset.disposal_price || asset.cost_basis), 0)
  const totalDepreciation = assets.reduce((sum, asset) =>
    sum + asset.depreciationResult.depreciation_deduction, 0
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Equipment Tracker</h1>
          <p className="text-gray-600 mt-1">Manage your music equipment and depreciation</p>
        </div>
        <div className="flex space-x-4">
          <select
            value={taxYear}
            onChange={(e) => setTaxYear(parseInt(e.target.value))}
            className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          >
            <option value={new Date().getFullYear() + 1}>{new Date().getFullYear() + 1}</option>
            <option value={new Date().getFullYear()}>{new Date().getFullYear()}</option>
            <option value={new Date().getFullYear() - 1}>{new Date().getFullYear() - 1}</option>
          </select>
          <button
            onClick={handleAddAsset}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            Add Equipment
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-500">Total Equipment Value</h3>
          <p className="text-2xl font-semibold text-blue-600 mt-1">
            {formatCurrency(totalAssetValue)}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-500">Annual Depreciation</h3>
          <p className="text-2xl font-semibold text-purple-600 mt-1">
            {formatCurrency(totalDepreciation)}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-500">Tax Savings</h3>
          <p className="text-2xl font-semibold text-green-600 mt-1">
            {formatCurrency(totalDepreciation * 0.32)}
          </p>
        </div>
      </div>

      {/* Assets Table */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            Equipment ({assets.length})
          </h3>
        </div>
        <div className="overflow-x-auto">
          {assets.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <p className="text-gray-500 mb-4">No equipment added yet</p>
              <button
                onClick={handleAddAsset}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                Add Your First Equipment
              </button>
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Equipment
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Purchase Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cost Basis
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Method
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {taxYear} Depreciation
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Remaining Basis
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {assets.map((asset) => (
                  <tr key={asset.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{asset.name}</div>
                      {asset.notes && (
                        <div className="text-sm text-gray-500">{asset.notes}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(asset.purchase_date)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(asset.cost_basis)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {getDepreciationMethodDisplay(asset.depreciation_method)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-green-600">
                      {formatCurrency(asset.depreciationResult.depreciation_deduction)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium">
                      {formatCurrency(asset.depreciationResult.remaining_basis)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      {!asset.disposal_date && (
                        <>
                          <button
                            onClick={() => handleSellAsset(asset.id)}
                            className="text-orange-600 hover:text-orange-900 mr-4"
                          >
                            Sold
                          </button>
                          <button
                            onClick={() => handleEditAsset(asset)}
                            className="text-blue-600 hover:text-blue-900 mr-4"
                          >
                            Edit
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => handleDeleteAsset(asset.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Asset Modal */}
      {showModal && (
        <AssetModal
          asset={editingAsset}
          onSave={handleSaveAsset}
          onCancel={() => {
            setShowModal(false)
            setEditingAsset(null)
          }}
        />
      )}
    </div>
  )
}