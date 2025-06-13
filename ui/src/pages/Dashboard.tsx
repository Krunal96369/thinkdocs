import React from 'react'

export default function Dashboard() {
  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="card">
            <div className="card-body">
              <h3 className="text-sm font-medium text-gray-500">Total Documents</h3>
              <p className="text-2xl font-bold text-gray-900">12</p>
            </div>
          </div>

          <div className="card">
            <div className="card-body">
              <h3 className="text-sm font-medium text-gray-500">Chat Sessions</h3>
              <p className="text-2xl font-bold text-gray-900">8</p>
            </div>
          </div>

          <div className="card">
            <div className="card-body">
              <h3 className="text-sm font-medium text-gray-500">Questions Asked</h3>
              <p className="text-2xl font-bold text-gray-900">47</p>
            </div>
          </div>

          <div className="card">
            <div className="card-body">
              <h3 className="text-sm font-medium text-gray-500">Processing</h3>
              <p className="text-2xl font-bold text-gray-900">2</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-body">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h2>
            <p className="text-gray-600">Recent document uploads and chat sessions will appear here.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
