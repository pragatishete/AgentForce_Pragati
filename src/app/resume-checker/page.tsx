'use client';

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { AlertCircle, Upload } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface ResumeEvaluation {
  Mistakes: string[];
  MissingKeywords: string[];
  Suggestions: string[];
  'JD Match': number;
  error?: string;
}

export default function ResumeEvaluator() {
  const [jobDescription, setJobDescription] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [feedback, setFeedback] = useState<ResumeEvaluation | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFeedback(null);

    if (!file) {
      setError('Please upload a resume file');
      return;
    }

    if (!jobDescription.trim()) {
      setError('Please enter a job description');
      return;
    }

    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setError('Please upload a PDF file');
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('job_description', jobDescription);
      formData.append('resume', file);

      const response = await fetch('http://localhost:8000/resume-checker', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log("Received feedback data:", data); // Log the received feedback data

      if (data.error) {
        throw new Error(data.error);
      }

      setFeedback(data);
    } catch (error) {
      console.error('Error:', error);
      setError(error instanceof Error ? error.message : 'Failed to evaluate resume');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-800 to-blue-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <h1 className="text-4xl font-bold text-white text-center tracking-tight">Resume Evaluator</h1>

        {error && (
          <Alert variant="destructive" className="bg-red-900 text-white border border-red-700">
            <AlertCircle className="h-5 w-5" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Card className="bg-white bg-opacity-10 backdrop-filter backdrop-blur-lg border-none shadow-xl">
          <CardHeader className="bg-indigo-600 bg-opacity-50 text-white rounded-t-lg">
            <CardTitle>Evaluate Your Resume</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label htmlFor="job_description" className="text-sm font-medium text-white">
                  Job Description
                </label>
                <Textarea
                  id="job_description"
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  rows={8}
                  placeholder="Paste the job description here"
                  className="resize-none bg-white border border-indigo-300 rounded-md text-black placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="resume" className="text-sm font-medium text-white">
                  Upload Resume (PDF only)
                </label>
                <div className="flex items-center justify-center w-full">
                  <label htmlFor="resume" className="flex flex-col items-center justify-center w-full h-32 border-2 border-indigo-300 border-dashed rounded-lg cursor-pointer bg-white bg-opacity-20 hover:bg-opacity-30 transition-all duration-300">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <Upload className="w-8 h-8 mb-3 text-indigo-300" />
                      <p className="mb-2 text-sm text-indigo-300">
                        <span className="font-semibold">Click to upload</span> or drag and drop
                      </p>
                      <p className="text-xs text-indigo-300">PDF (MAX. 10MB)</p>
                    </div>
                    <input
                      type="file"
                      id="resume"
                      accept=".pdf"
                      onChange={(e) => setFile(e.target.files?.[0] || null)}
                      className="hidden"
                    />
                  </label>
                </div>
                {file && (
                  <p className="text-sm text-indigo-300 mt-2">
                    Selected file: {file.name}
                  </p>
                )}
              </div>

              <Button
                type="submit"
                disabled={loading}
                className={`w-full py-3 px-4 text-white font-bold rounded-md shadow-lg transition ${
                  loading ? 'bg-indigo-400' : 'bg-indigo-600 hover:bg-indigo-700'
                } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500`}
              >
                {loading ? 'Evaluating...' : 'Evaluate Resume'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {feedback && (
          <Card className="bg-white bg-opacity-10 backdrop-filter backdrop-blur-lg border-none shadow-xl">
            <CardHeader className="bg-indigo-600 bg-opacity-50 text-white rounded-t-lg">
              <CardTitle>Resume Feedback</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              <div className="space-y-2">
                <h3 className="font-semibold text-white">Match Score</h3>
                <Progress value={feedback['JD Match']} className="w-full" />
                <p className="text-sm text-indigo-200">{feedback['JD Match']}% match with job description</p>
              </div>

              {feedback.Mistakes.length > 0 && (
                <div className="space-y-2">
                  <h3 className="font-semibold text-white">Mistakes</h3>
                  <ul className="list-disc pl-5 text-sm text-indigo-200">
                    {feedback.Mistakes.map((mistake, index) => (
                      <li key={index}>{mistake}</li>
                    ))}
                  </ul>
                </div>
              )}

              {feedback.MissingKeywords.length > 0 && (
                <div className="space-y-2">
                  <h3 className="font-semibold text-white">Missing Keywords</h3>
                  <ul className="list-disc pl-5 text-sm text-indigo-200">
                    {feedback.MissingKeywords.map((keyword, index) => (
                      <li key={index}>{keyword}</li>
                    ))}
                  </ul>
                </div>
              )}

              {feedback.Suggestions.length > 0 && (
                <div className="space-y-2">
                  <h3 className="font-semibold text-white">Suggestions</h3>
                  <ul className="list-disc pl-5 text-sm text-indigo-200">
                    {feedback.Suggestions.map((suggestion, index) => (
                      <li key={index}>{suggestion}</li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
