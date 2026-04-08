// frontend/src/components/FormLogs.tsx
import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Badge } from './ui/badge'
import { Button } from './ui/button'
import { ScrollArea } from './ui/scroll-area'
import { 
  RefreshCw, 
  Mail, 
  User, 
  Phone, 
  Calendar,
  Globe,
  ExternalLink,
  TrendingUp,
  Filter,
  Download,
  Eye,
  MapPin,
  Clock
} from 'lucide-react'
import { formatDistanceToNow, format } from 'date-fns'
import { syncApi } from '../api/client'

interface FormSubmission {
  id: string
  connectionId: string
  wixFormId: string
  wixFormName: string
  hubSpotContactId: string
  hubSpotSubmissionId?: string
  formData: any
  utmParams: {
    page_url: string | null
    referrer: string | null
    utm_term: string | null
    utm_medium: string | null
    utm_source: string | null
    utm_content: string | null
    utm_campaign: string | null
  }
  submittedAt: string
  syncedToHubSpot: boolean
  utmSource: string | null
  utmMedium: string | null
  utmCampaign: string | null
  utmTerm: string | null
  utmContent: string | null
  pageUrl: string | null
  referrer: string | null
  leadStatus: string
  leadScore: number
}

interface FormLogsProps {
  instanceId: string
  onRefresh?: () => void
}

// Helper function to extract email from Wix form data
const extractEmailFromFormData = (formData: any): string => {
  if (!formData) return 'Email not found'
  
  // Check for emails in info.emails.items array
  if (formData.info?.emails?.items && formData.info.emails.items.length > 0) {
    const primaryEmail = formData.info.emails.items.find((e: any) => e.primary === true)
    if (primaryEmail?.email) return primaryEmail.email
    if (formData.info.emails.items[0]?.email) return formData.info.emails.items[0].email
  }
  
  // Check for primaryInfo.email
  if (formData.primaryInfo?.email) return formData.primaryInfo.email
  
  // Check for primaryEmail.email
  if (formData.primaryEmail?.email) return formData.primaryEmail.email
  
  // Check for memberInfo.email
  if (formData.memberInfo?.email) return formData.memberInfo.email
  
  // Check for direct email field in info
  if (formData.info?.email) return formData.info.email
  
  // Check submissionData array (older format)
  if (formData.submissionData && Array.isArray(formData.submissionData)) {
    const emailField = formData.submissionData.find((f: any) => 
      f.fieldName?.toLowerCase().includes('email')
    )
    if (emailField?.fieldValue) return emailField.fieldValue
  }
  
  // Check extendedFields
  if (formData.info?.extendedFields?.items) {
    const effectiveEmail = formData.info.extendedFields.items['emailSubscriptions.effectiveEmail']
    if (effectiveEmail) return effectiveEmail
  }
  
  return 'Email not found'
}

// Helper function to extract name from Wix form data
const extractNameFromFormData = (formData: any): { first: string; last: string; full: string } => {
  if (!formData) return { first: '', last: '', full: '' }
  
  let firstName = ''
  let lastName = ''
  
  // Check for info.name
  if (formData.info?.name) {
    firstName = formData.info.name.first || ''
    lastName = formData.info.name.last || ''
  }
  
  // Check for memberInfo
  if (formData.memberInfo?.profileInfo?.nickname) {
    const nickname = formData.memberInfo.profileInfo.nickname
    const parts = nickname.split(' ')
    if (parts.length >= 2) {
      firstName = firstName || parts[0]
      lastName = lastName || parts.slice(1).join(' ')
    } else {
      firstName = firstName || nickname
    }
  }
  
  const fullName = [firstName, lastName].filter(Boolean).join(' ') || 'Name not found'
  
  return { first: firstName, last: lastName, full: fullName }
}

// Helper function to extract phone from Wix form data
const extractPhoneFromFormData = (formData: any): string => {
  if (!formData) return ''
  
  // Check for phones in info.phones.items
  if (formData.info?.phones?.items && formData.info.phones.items.length > 0) {
    const primaryPhone = formData.info.phones.items.find((p: any) => p.primary === true)
    if (primaryPhone?.phone) return primaryPhone.phone
    if (formData.info.phones.items[0]?.phone) return formData.info.phones.items[0].phone
  }
  
  // Check for primaryInfo.phone
  if (formData.primaryInfo?.phone) return formData.primaryInfo.phone
  
  // Check for primaryPhone.phone
  if (formData.primaryPhone?.phone) return formData.primaryPhone.phone
  
  return ''
}

export function FormLogs({ instanceId, onRefresh }: FormLogsProps) {
  const [submissions, setSubmissions] = useState<FormSubmission[]>([])
  const [stats, setStats] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [filter, setFilter] = useState<string>('all')
  const [selectedSubmission, setSelectedSubmission] = useState<FormSubmission | null>(null)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    loadFormSubmissions()
  }, [instanceId])

  const loadFormSubmissions = async () => {
    setIsLoading(true)
    try {
      const result = await syncApi.getFormSubmissions(instanceId)
      console.log('Form submissions loaded:', result)
      
      let submissionsData = result.submissions || result.data?.submissions || []
      
      // Calculate stats from submissions
      if (submissionsData.length > 0) {
        const totalSubmissions = submissionsData.length
        const last7Days = submissionsData.filter((s: FormSubmission) => {
          const submittedDate = new Date(s.submittedAt)
          const sevenDaysAgo = new Date()
          sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
          return submittedDate >= sevenDaysAgo
        }).length
        
        const byStatus = submissionsData.reduce((acc: any, s: FormSubmission) => {
          const status = s.leadStatus || 'new'
          acc[status] = (acc[status] || 0) + 1
          return acc
        }, {})
        
        const totalScore = submissionsData.reduce((sum: number, s: FormSubmission) => sum + (s.leadScore || 0), 0)
        
        // Get top sources
        const sourceMap = new Map()
        submissionsData.forEach((s: FormSubmission) => {
          const source = s.utmSource || 'direct'
          sourceMap.set(source, (sourceMap.get(source) || 0) + 1)
        })
        const topSources = Array.from(sourceMap.entries())
          .map(([source, count]) => ({ source, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5)
        
        setStats({
          totalSubmissions,
          last7Days,
          byStatus,
          totalScore,
          topSources
        })
      }
      
      setSubmissions(submissionsData)
    } catch (error) {
      console.error('Failed to load form submissions:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const getLeadStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      new: 'bg-green-100 text-green-800 border-green-200',
      contacted: 'bg-blue-100 text-blue-800 border-blue-200',
      qualified: 'bg-purple-100 text-purple-800 border-purple-200',
      lost: 'bg-red-100 text-red-800 border-red-200',
      pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    }
    return variants[status] || 'bg-gray-100 text-gray-800 border-gray-200'
  }

  const getSyncStatusBadge = (synced: boolean) => {
    return synced 
      ? 'bg-green-100 text-green-800 border-green-200'
      : 'bg-yellow-100 text-yellow-800 border-yellow-200'
  }

  const filteredSubmissions = submissions.filter(sub => {
    if (filter !== 'all' && sub.leadStatus !== filter) return false
    if (searchTerm) {
      const email = extractEmailFromFormData(sub.formData).toLowerCase()
      const name = extractNameFromFormData(sub.formData).full.toLowerCase()
      const search = searchTerm.toLowerCase()
      return email.includes(search) || name.includes(search)
    }
    return true
  })

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="border-gray-200 shadow-sm">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Submissions</p>
                  <p className="text-2xl font-bold">{stats.totalSubmissions || 0}</p>
                </div>
                <Mail className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-gray-200 shadow-sm">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Last 7 Days</p>
                  <p className="text-2xl font-bold">{stats.last7Days || 0}</p>
                </div>
                <Calendar className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-gray-200 shadow-sm">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">New Leads</p>
                  <p className="text-2xl font-bold">
                    {stats.byStatus?.new || 0}
                  </p>
                </div>
                <User className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-gray-200 shadow-sm">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Avg. Lead Score</p>
                  <p className="text-2xl font-bold">
                    {stats.totalSubmissions ? Math.round(stats.totalScore / stats.totalSubmissions) : 0}
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Top Sources */}
      {stats?.topSources && stats.topSources.length > 0 && (
        <Card className="border-gray-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Top Traffic Sources</CardTitle>
            <CardDescription>Where your leads are coming from</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {stats.topSources.map((source: any, i: number) => (
                <Badge key={i} variant="outline" className="text-sm px-3 py-1">
                  {source.source === 'direct' ? 'Direct Traffic' : source.source}: {source.count}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Controls */}
      <div className="flex gap-2 flex-wrap items-center justify-between">
        <div className="flex gap-2 flex-wrap">
          <Button 
            variant={filter === 'all' ? 'default' : 'outline'} 
            size="sm"
            onClick={() => setFilter('all')}
          >
            All
          </Button>
          <Button 
            variant={filter === 'new' ? 'default' : 'outline'} 
            size="sm"
            onClick={() => setFilter('new')}
          >
            New
          </Button>
          <Button 
            variant={filter === 'contacted' ? 'default' : 'outline'} 
            size="sm"
            onClick={() => setFilter('contacted')}
          >
            Contacted
          </Button>
          <Button 
            variant={filter === 'qualified' ? 'default' : 'outline'} 
            size="sm"
            onClick={() => setFilter('qualified')}
          >
            Qualified
          </Button>
        </div>
        
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Search by email or name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="px-3 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <Button 
            variant="outline" 
            size="sm"
            onClick={loadFormSubmissions}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Form Submissions List */}
      <Card className="border-gray-200 shadow-sm">
        <CardHeader>
          <CardTitle>Form Submissions</CardTitle>
          <CardDescription>
            Recent form submissions with complete contact and UTM attribution data
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[600px]">
            <div className="space-y-4">
              {filteredSubmissions.length === 0 ? (
                <div className="text-center text-muted-foreground py-12">
                  <Mail className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No form submissions yet</p>
                  <p className="text-sm">Form submissions will appear here when visitors fill out your forms</p>
                </div>
              ) : (
                filteredSubmissions.map((sub) => {
                  const email = extractEmailFromFormData(sub.formData)
                  const name = extractNameFromFormData(sub.formData)
                  const phone = extractPhoneFromFormData(sub.formData)
                  const submittedDate = new Date(sub.submittedAt)
                  
                  return (
                    <div
                      key={sub.id}
                      className="border rounded-lg p-4 space-y-3 hover:bg-gray-50 transition-colors cursor-pointer"
                      onClick={() => setSelectedSubmission(sub)}
                    >
                      {/* Header with badges */}
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge className={getLeadStatusBadge(sub.leadStatus)}>
                            {sub.leadStatus || 'new'}
                          </Badge>
                          <Badge className={getSyncStatusBadge(sub.syncedToHubSpot)}>
                            {sub.syncedToHubSpot ? 'Synced to HubSpot' : 'Pending Sync'}
                          </Badge>
                          {sub.leadScore > 0 && (
                            <Badge variant="outline" className="bg-orange-50 text-orange-700">
                              Score: {sub.leadScore}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <Clock className="h-3 w-3" />
                          {format(submittedDate, 'MMM d, yyyy h:mm a')}
                          <span className="text-gray-400">•</span>
                          {formatDistanceToNow(submittedDate, { addSuffix: true })}
                        </div>
                      </div>

                      {/* Contact Information */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-gray-400" />
                          <span className="font-mono text-sm text-blue-600">
                            {email}
                          </span>
                        </div>
                        {name.full !== 'Name not found' && (
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-gray-400" />
                            <span className="text-gray-700">{name.full}</span>
                          </div>
                        )}
                        {phone && (
                          <div className="flex items-center gap-2">
                            <Phone className="h-4 w-4 text-gray-400" />
                            <span className="text-gray-700">{phone}</span>
                          </div>
                        )}
                      </div>

                      {/* Form Info */}
                      <div className="flex items-center gap-2 text-sm">
                        <span className="font-medium text-gray-700">Form:</span>
                        <span className="text-gray-600">{sub.wixFormName || sub.wixFormId}</span>
                        {sub.hubSpotContactId && (
                          <>
                            <span className="text-gray-400">•</span>
                            <span className="text-gray-500 text-xs">
                              HubSpot ID: {sub.hubSpotContactId}
                            </span>
                          </>
                        )}
                      </div>

                      {/* UTM Attribution */}
                      {(sub.utmSource || sub.utmCampaign || sub.pageUrl) && (
                        <div className="flex flex-wrap gap-2 pt-2 border-t">
                          {sub.utmSource && (
                            <Badge variant="secondary" className="text-xs bg-gray-100">
                              Source: {sub.utmSource}
                            </Badge>
                          )}
                          {sub.utmMedium && (
                            <Badge variant="secondary" className="text-xs bg-gray-100">
                              Medium: {sub.utmMedium}
                            </Badge>
                          )}
                          {sub.utmCampaign && (
                            <Badge variant="secondary" className="text-xs bg-gray-100">
                              Campaign: {sub.utmCampaign}
                            </Badge>
                          )}
                          {sub.pageUrl && (
                            <a 
                              href={sub.pageUrl} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Globe className="h-3 w-3" />
                              View Page
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Detail Modal */}
      {selectedSubmission && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setSelectedSubmission(null)}>
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-[85vh] overflow-y-auto m-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
              <h2 className="text-xl font-bold">Form Submission Details</h2>
              <Button variant="ghost" size="sm" onClick={() => setSelectedSubmission(null)} className="h-8 w-8 p-0">
                ✕
              </Button>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Contact Information */}
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Contact Information
                </h3>
                <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="font-medium text-gray-600">Email:</span>
                      <div className="text-blue-600 font-mono">
                        {extractEmailFromFormData(selectedSubmission.formData)}
                      </div>
                    </div>
                    {(() => {
                      const name = extractNameFromFormData(selectedSubmission.formData)
                      return name.full !== 'Name not found' && (
                        <div>
                          <span className="font-medium text-gray-600">Name:</span>
                          <div>{name.full}</div>
                        </div>
                      )
                    })()}
                    {extractPhoneFromFormData(selectedSubmission.formData) && (
                      <div>
                        <span className="font-medium text-gray-600">Phone:</span>
                        <div>{extractPhoneFromFormData(selectedSubmission.formData)}</div>
                      </div>
                    )}
                    <div>
                      <span className="font-medium text-gray-600">Form:</span>
                      <div>{selectedSubmission.wixFormName || selectedSubmission.wixFormId}</div>
                    </div>
                    <div>
                      <span className="font-medium text-gray-600">Submitted:</span>
                      <div>{format(new Date(selectedSubmission.submittedAt), 'PPPpp')}</div>
                    </div>
                    <div>
                      <span className="font-medium text-gray-600">Lead Status:</span>
                      <div>
                        <Badge className={getLeadStatusBadge(selectedSubmission.leadStatus)}>
                          {selectedSubmission.leadStatus || 'new'}
                        </Badge>
                      </div>
                    </div>
                    <div>
                      <span className="font-medium text-gray-600">HubSpot Contact:</span>
                      <div className="font-mono text-sm">{selectedSubmission.hubSpotContactId}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* All Form Data */}
              <div>
                <h3 className="font-semibold mb-3">Complete Form Data</h3>
                <pre className="bg-gray-50 rounded-lg p-4 text-xs overflow-x-auto">
                  {JSON.stringify(selectedSubmission.formData, null, 2)}
                </pre>
              </div>

              {/* UTM Attribution */}
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Globe className="h-4 w-4" />
                  UTM Attribution & Tracking
                </h3>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div><span className="font-medium text-gray-600">Source:</span> {selectedSubmission.utmSource || '-'}</div>
                    <div><span className="font-medium text-gray-600">Medium:</span> {selectedSubmission.utmMedium || '-'}</div>
                    <div><span className="font-medium text-gray-600">Campaign:</span> {selectedSubmission.utmCampaign || '-'}</div>
                    <div><span className="font-medium text-gray-600">Term:</span> {selectedSubmission.utmTerm || '-'}</div>
                    <div><span className="font-medium text-gray-600">Content:</span> {selectedSubmission.utmContent || '-'}</div>
                    <div className="col-span-2">
                      <span className="font-medium text-gray-600">Page URL:</span>
                      <a href={selectedSubmission.pageUrl || '#'} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline ml-2 break-all">
                        {selectedSubmission.pageUrl || '-'}
                      </a>
                    </div>
                    <div className="col-span-2">
                      <span className="font-medium text-gray-600">Referrer:</span> {selectedSubmission.referrer || '-'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}