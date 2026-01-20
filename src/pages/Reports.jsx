import { useState, useEffect } from 'react'

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, '') + '/api'

export default function Reports() {
  const [summary, setSummary] = useState(null)
  const [taxYear, setTaxYear] = useState(new Date().getFullYear())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadReportData()
  }, [taxYear])

  const loadReportData = async () => {
    try {
      const response = await fetch(`${API_BASE}/summary?year=${taxYear}`, {
        credentials: 'include'
      })
      if (response.ok) {
        const data = await response.json()
        setSummary(data)
      }
    } catch (error) {
      console.error('Failed to load report data:', error)
    } finally {
      setLoading(false)
    }
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
      month: 'long',
      day: 'numeric'
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  const { financials, depreciation, tax_estimation } = summary || {}

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Tax Reports</h1>
          <p className="text-gray-600 mt-1">IRS-compliant financial summaries for {taxYear}</p>
        </div>
        <select
          value={taxYear}
          onChange={(e) => setTaxYear(parseInt(e.target.value))}
          className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
        >
          <option value={new Date().getFullYear() + 1}>{new Date().getFullYear() + 1}</option>
          <option value={new Date().getFullYear()}>{new Date().getFullYear()}</option>
          <option value={new Date().getFullYear() - 1}>{new Date().getFullYear() - 1}</option>
          <option value={new Date().getFullYear() - 2}>{new Date().getFullYear() - 2}</option>
        </select>
      </div>

      {/* Income Statement */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Income Statement</h3>
          <p className="text-sm text-gray-600">Tax Year {taxYear}</p>
        </div>
        <div className="px-6 py-4 space-y-4">
          <div className="flex justify-between py-2">
            <span className="text-sm font-medium text-gray-900">Total Gross Income</span>
            <span className="text-sm text-gray-900">{formatCurrency(financials?.total_income)}</span>
          </div>
          <div className="flex justify-between py-2">
            <span className="text-sm text-gray-900">Less: Business Expenses</span>
            <span className="text-sm text-gray-900">({formatCurrency(financials?.total_expenses)})</span>
          </div>
          <div className="border-t border-gray-200 flex justify-between py-2">
            <span className="text-base font-semibold text-gray-900">Net Business Income</span>
            <span className="text-base font-semibold text-blue-600">{formatCurrency(financials?.net_income)}</span>
          </div>
          <div className="flex justify-between py-2">
            <span className="text-sm text-gray-900">Less: Depreciation Expense</span>
            <span className="text-sm text-gray-900">({formatCurrency(depreciation?.total_deduction)})</span>
          </div>
          <div className="border-t border-gray-200 flex justify-between py-2">
            <span className="text-base font-semibold text-gray-900">Taxable Business Income</span>
            <span className="text-base font-semibold text-red-600">
              {formatCurrency((financials?.net_income || 0) - (depreciation?.total_deduction || 0))}
            </span>
          </div>
        </div>
      </div>

      {/* Depreciation Detail */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Equipment Depreciation Schedule</h3>
          <p className="text-sm text-gray-600">MACRS Deductions for Tax Year {taxYear}</p>
        </div>
        {depreciation?.asset_detail?.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Equipment
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
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {depreciation.asset_detail.map((asset) => (
                  <tr key={asset.asset_id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {asset.asset_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatCurrency(asset.cost_basis)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {asset.depreciation_method}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium">
                      {formatCurrency(asset.depreciation_deduction)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium">
                      {formatCurrency(asset.remaining_basis)}
                    </td>
                  </tr>
                ))}
                <tr className="bg-gray-50">
                  <td colSpan="3" className="px-6 py-4 text-sm font-medium text-gray-900">
                    Total Depreciation Deduction
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-semibold text-green-600">
                    {formatCurrency(depreciation.total_deduction)}
                  </td>
                  <td></td>
                </tr>
              </tbody>
            </table>
          </div>
        ) : (
          <div className="px-6 py-12 text-center">
            <p className="text-gray-500">No equipment depreciation for this year</p>
          </div>
        )}
      </div>

      {/* Tax Calculation Estimate */}
      {tax_estimation && (
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Estimated Tax Liability</h3>
            <p className="text-sm text-gray-600">Simplified calculation - consult a tax professional</p>
          </div>
          <div className="px-6 py-4 space-y-4">
            <div className="flex justify-between py-2">
              <span className="text-sm text-gray-900">Taxable Income</span>
              <span className="text-sm text-gray-900">{formatCurrency(tax_estimation.taxable_income)}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-sm text-gray-900">Federal Income Tax</span>
              <span className="text-sm text-gray-900">{formatCurrency(tax_estimation.income_tax)}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-sm text-gray-900">Self-Employment Tax</span>
              <span className="text-sm text-gray-900">{formatCurrency(tax_estimation.self_employment_tax)}</span>
            </div>
            <div className="border-t border-gray-200 flex justify-between py-2">
              <span className="text-base font-semibold text-gray-900">Total Estimated Tax</span>
              <span className="text-base font-semibold text-red-600">
                {formatCurrency(tax_estimation.total_tax)}
              </span>
            </div>
            <div className="bg-green-50 rounded-md p-4">
              <div className="flex justify-between">
                <span className="text-sm font-medium text-green-800">Tax Savings from Depreciation</span>
                <span className="text-sm font-medium text-green-800">
                  {formatCurrency(tax_estimation.estimated_tax_savings)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Keeping Records Note */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h4 className="text-sm font-medium text-yellow-800">Important Tax Recordkeeping Note</h4>
            <div className="mt-2 text-sm text-yellow-700">
              <p>
                Keep all receipts and documentation for at least 7 years (3 years for the IRS, plus state requirements).
                Digital records should be backed up regularly. Consult with a tax professional for your specific situation.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}