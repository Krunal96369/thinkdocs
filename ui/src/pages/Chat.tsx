import React from 'react'

export default function Chat() {
  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 p-6">
        <div className="max-w-4xl mx-auto h-full flex flex-col">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Chat with your documents</h1>

          <div className="flex-1 card">
            <div className="card-body h-full flex flex-col justify-center items-center">
              <p className="text-gray-600 text-center">
                Advanced chat interface with real-time messaging will be implemented here.
                <br />
                Features will include document context, streaming responses, and file attachments.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
