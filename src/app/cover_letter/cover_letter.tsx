'use client'

import { useState } from 'react'

export default function CoverLetterPage() {
  const [formData, setFormData] = useState({
    jobRole: '',
    companyName: '',
    jobDescription: '',
    resume: null,
  })
  const [generatedLetter, setGeneratedLetter] = useState<string | null>(null)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prevData => ({ ...prevData, [name]: value }))
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    setFormData(prevData => ({ ...prevData, resume: file }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const formDataToSend = new FormData()
    formDataToSend.append('job_role', formData.jobRole)
    formDataToSend.append('company_name', formData.companyName)
    formDataToSend.append('job_description', formData.jobDescription)
    if (formData.resume) {
      formDataToSend.append('resume', formData.resume)
    }

    try {
      const response = await fetch('http://localhost:8000/cover-letter/', {
        method: 'POST',
        body: formDataToSend,
      })
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(`Network response was not ok: ${errorData.detail || response.statusText}`)
      }
      const data = await response.json()
      setGeneratedLetter(data.cover_letter)
    } catch (error) {
      console.error('Error:', error)
    }
  }

  const copyToClipboard = async () => {
    if (generatedLetter) {
      try {
        await navigator.clipboard.writeText(generatedLetter)
        alert('Cover letter copied to clipboard!')
      } catch (error) {
        console.error('Failed to copy:', error)
      }
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 to-indigo-800 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto bg-white bg-opacity-20 backdrop-filter backdrop-blur-lg rounded-3xl shadow-xl p-8">
        <h2 className="text-3xl font-bold text-white text-center mb-6">Cover Letter Generator</h2>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="jobRole" className="block text-sm font-medium text-white">Job Role</label>
            <input
              type="text"
              id="jobRole"
              name="jobRole"
              required
              className="mt-1 block w-full px-3 py-2 bg-white bg-opacity-80 text-black placeholder-gray-500 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              value={formData.jobRole}
              onChange={handleChange}
              placeholder="Enter Job Role"
            />
          </div>
          <div>
            <label htmlFor="companyName" className="block text-sm font-medium text-white">Company Name</label>
            <input
              type="text"
              id="companyName"
              name="companyName"
              required
              className="mt-1 block w-full px-3 py-2 bg-white bg-opacity-80 text-black placeholder-gray-500 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              value={formData.companyName}
              onChange={handleChange}
              placeholder="Enter Company Name"
            />
          </div>
          <div>
            <label htmlFor="jobDescription" className="block text-sm font-medium text-white">Job Description</label>
            <textarea
              id="jobDescription"
              name="jobDescription"
              rows={5}
              required
              className="mt-1 block w-full px-3 py-2 bg-white bg-opacity-80 text-black placeholder-gray-500 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              value={formData.jobDescription}
              onChange={handleChange}
              placeholder="Enter Job Description"
            ></textarea>
          </div>
          <div>
            <label htmlFor="resume" className="block text-sm font-medium text-white">Your Resume (PDF)</label>
            <input
              type="file"
              id="resume"
              name="resume"
              accept="application/pdf"
              required
              className="mt-1 block w-full px-3 py-2 bg-white bg-opacity-80 text-black placeholder-gray-500 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              onChange={handleFileChange}
            />
          </div>
          <div>
            <button
              type="submit"
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Generate Cover Letter
            </button>
          </div>
        </form>
        {generatedLetter && (
          <div className="mt-6">
            <h3 className="text-lg font-bold text-white">Generated Cover Letter:</h3>
            <div className="bg-gray-100 p-4 rounded-md text-black whitespace-pre-wrap">
              {generatedLetter.split('\n\n').map((paragraph, index) => (
                <p key={index} className="mb-4">{paragraph}</p>
              ))}
            </div>
            <button
              onClick={copyToClipboard}
              className="mt-4 w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
            >
              Copy to Clipboard
            </button>
          </div>
        )}
      </div>
    </div>
  )
}