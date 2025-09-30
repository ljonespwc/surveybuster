'use client'

import { useEffect, useState } from 'react'
import { Copy, Check, MessageCircle, Users, TrendingUp, Activity, ChevronDown, ChevronRight } from 'lucide-react'
import StatsCard from '@/components/admin/StatsCard'

interface FeedbackResponse {
  id: string
  question_text: string
  user_response: string
  sentiment_score: number | null
  created_at: string
}

interface FeedbackSession {
  id: string
  session_id: string
  started_at: string
  ended_at: string | null
  total_questions: number
  completed_questions: number
  page_url: string | null
  responses: FeedbackResponse[]
}

interface Stats {
  total: number
  today: number
  completionRate: number
  activeNow: number
  recentSessions: FeedbackSession[]
}

export default function AdminDashboard() {
  const [copied, setCopied] = useState(false)
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [expandedSessions, setExpandedSessions] = useState<Set<string>>(new Set())

  const embedCode = `<script src="${process.env.NEXT_PUBLIC_APP_URL || 'https://hubermanchat.vercel.app'}/widget.js"></script>`

  const copyToClipboard = () => {
    navigator.clipboard.writeText(embedCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/stats')
      const data = await response.json()
      setStats(data)
    } catch (error) {
      console.error('Failed to fetch stats:', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleSession = (sessionId: string) => {
    setExpandedSessions(prev => {
      const newSet = new Set(prev)
      if (newSet.has(sessionId)) {
        newSet.delete(sessionId)
      } else {
        newSet.add(sessionId)
      }
      return newSet
    })
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Survey Buster</h1>
          <p className="text-gray-600 mt-2">Voice feedback collection widget - Embed code and analytics</p>
        </div>

        {/* Embed Code Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Quick Install</h2>
          <p className="text-gray-600 mb-4">Add this single line of code to any page where you want the feedback widget:</p>

          <div className="relative">
            <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto">
              <code>{embedCode}</code>
            </pre>
            <button
              onClick={copyToClipboard}
              className="absolute top-2 right-2 bg-[#00AFEF] text-white rounded-lg px-3 py-1.5 text-sm font-medium hover:bg-[#0099D4] transition-colors flex items-center gap-2"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  Copy
                </>
              )}
            </button>
          </div>

          <p className="text-sm text-gray-500 mt-4">
            The widget will appear as a voice feedback button in the bottom-right corner of the page.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatsCard
            title="Total Sessions"
            value={loading ? '...' : stats?.total || 0}
            subtitle="All time"
            icon={<MessageCircle className="w-5 h-5" />}
          />
          <StatsCard
            title="Today's Sessions"
            value={loading ? '...' : stats?.today || 0}
            subtitle="Last 24 hours"
            icon={<TrendingUp className="w-5 h-5" />}
          />
          <StatsCard
            title="Completion Rate"
            value={loading ? '...' : `${stats?.completionRate || 0}%`}
            subtitle="Questions completed"
            icon={<Activity className="w-5 h-5" />}
          />
          <StatsCard
            title="Active Now"
            value={loading ? '...' : stats?.activeNow || 0}
            subtitle="Last 5 minutes"
            icon={<Users className="w-5 h-5" />}
          />
        </div>

        {/* Recent Feedback Sessions */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900">Recent Feedback Sessions</h2>
          </div>

          {loading ? (
            <div className="px-6 py-8 text-center text-gray-500">
              Loading feedback sessions...
            </div>
          ) : stats?.recentSessions?.length ? (
            <div className="divide-y divide-gray-200">
              {stats.recentSessions.map((session) => {
                const isExpanded = expandedSessions.has(session.id)
                const duration = session.ended_at
                  ? Math.round((new Date(session.ended_at).getTime() - new Date(session.started_at).getTime()) / 1000)
                  : 0

                return (
                  <div key={session.id}>
                    {/* Session Header */}
                    <div
                      className="flex items-center justify-between px-6 py-4 cursor-pointer hover:bg-gray-50 transition-colors"
                      onClick={() => toggleSession(session.id)}
                    >
                      <div className="flex items-center space-x-3">
                        <button className="text-gray-400 hover:text-gray-600">
                          {isExpanded ? (
                            <ChevronDown className="w-5 h-5" />
                          ) : (
                            <ChevronRight className="w-5 h-5" />
                          )}
                        </button>
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {new Date(session.started_at).toLocaleTimeString('en-US', {
                              hour: 'numeric',
                              minute: '2-digit',
                              hour12: true
                            })}
                            {' - '}
                            {new Date(session.started_at).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric'
                            })}
                          </div>
                          <div className="text-xs text-gray-500 mt-0.5">
                            {session.completed_questions}/{session.total_questions} questions completed
                            {duration > 0 && ` • ${duration}s duration`}
                            {session.page_url && (
                              <>
                                <br />
                                <span className="text-gray-400">
                                  {session.page_url.replace(/^https?:\/\//, '').substring(0, 50)}
                                  {session.page_url.length > 50 && '...'}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <div>
                        <span
                          className={`inline-flex px-2.5 py-1 text-xs font-semibold rounded-full ${
                            session.completed_questions > 0
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {session.total_questions > 0
                            ? `${Math.round((session.completed_questions / session.total_questions) * 100)}% Complete`
                            : 'Not Started'}
                        </span>
                      </div>
                    </div>

                    {/* Session Responses (Expandable) */}
                    {isExpanded && session.responses && session.responses.length > 0 && (
                      <div className="bg-gray-50 px-6 py-3 border-t border-gray-200">
                        <div className="space-y-3">
                          {session.responses.map((response, idx) => {
                            const sentimentLabel = response.sentiment_score !== null
                              ? response.sentiment_score > 0.3 ? 'Positive'
                              : response.sentiment_score < -0.3 ? 'Negative'
                              : 'Neutral'
                              : 'N/A'

                            const sentimentColor = response.sentiment_score !== null
                              ? response.sentiment_score > 0.3 ? 'bg-green-100 text-green-800'
                              : response.sentiment_score < -0.3 ? 'bg-red-100 text-red-800'
                              : 'bg-blue-100 text-blue-800'
                              : 'bg-gray-100 text-gray-800'

                            return (
                              <div
                                key={response.id}
                                className="bg-white rounded-lg px-4 py-3 border border-gray-200"
                              >
                                <div className="space-y-2">
                                  <div className="flex items-start justify-between">
                                    <p className="text-sm font-medium text-gray-900">
                                      Q: {response.question_text}
                                    </p>
                                    <span
                                      className={`ml-4 inline-flex px-2 py-1 text-xs font-semibold rounded-full whitespace-nowrap ${sentimentColor}`}
                                    >
                                      {sentimentLabel}
                                    </span>
                                  </div>
                                  <p className="text-sm text-gray-700 pl-4">
                                    A: {response.user_response}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    {new Date(response.created_at).toLocaleTimeString('en-US', {
                                      hour: 'numeric',
                                      minute: '2-digit',
                                      second: '2-digit',
                                      hour12: true
                                    })}
                                    {response.sentiment_score !== null &&
                                      ` • Sentiment: ${response.sentiment_score.toFixed(2)}`
                                    }
                                  </p>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="px-6 py-8 text-center text-gray-500">
              No feedback sessions yet. The widget will start collecting feedback when users interact with it.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}