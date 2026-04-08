// frontend/src/components/SyncLogs.tsx
import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './../components/ui/card'
import { Badge } from './../components/ui/badge'
import { ScrollArea } from './../components/ui/scroll-area'
import { formatDistanceToNow } from 'date-fns'
import { CheckCircle, XCircle, Loader2, RefreshCw, AlertCircle } from 'lucide-react'
import { Button } from './ui/button'

interface SyncLog {
  id: string
  syncType: string
  direction: string
  status: string
  createdAt: string
  errorMessage?: string
}

interface SyncLogsProps {
  logs: SyncLog[] | undefined | null  // Allow undefined/null
  onRefresh: () => void
  isLoading?: boolean
}

export function SyncLogs({ logs, onRefresh, isLoading }: SyncLogsProps) {
  // Ensure logs is always an array
  const safeLogs = Array.isArray(logs) ? logs : []
  
  const getStatusIcon = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />
      case 'pending':
        return <Loader2 className="h-4 w-4 text-yellow-500 animate-spin" />
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusBadge = (status: string) => {
    const statusLower = status?.toLowerCase()
    const variants = {
      success: 'default',
      failed: 'destructive',
      pending: 'secondary',
    } as const
    
    const variant = variants[statusLower as keyof typeof variants] || 'default'
    
    return (
      <Badge variant={variant}>
        {status || 'unknown'}
      </Badge>
    )
  }

  const formatSyncType = (type: string) => {
    if (!type) return 'Unknown'
    return type.replace(/_/g, ' ').toUpperCase()
  }

  const formatDirection = (direction: string) => {
    if (!direction) return 'Unknown'
    return direction.replace(/_/g, ' → ')
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Sync Logs</CardTitle>
          <CardDescription>Recent synchronization activities</CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={onRefresh} disabled={isLoading}>
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
        </Button>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px]">
          <div className="space-y-4">
            {safeLogs.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                {isLoading ? (
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Loading sync logs...</span>
                  </div>
                ) : (
                  <div>
                    <p>No sync logs available</p>
                    <p className="text-sm mt-2">
                      When contacts are synced between Wix and HubSpot, they will appear here
                    </p>
                  </div>
                )}
              </div>
            ) : (
              safeLogs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-start justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start gap-3 flex-1">
                    {getStatusIcon(log.status)}
                    <div className="flex-1">
                      <div className="font-medium">
                        {formatSyncType(log.syncType)}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Direction: {formatDirection(log.direction)}
                      </div>
                      {log.errorMessage && (
                        <div className="text-sm text-red-500 mt-1">
                          Error: {log.errorMessage}
                        </div>
                      )}
                      <div className="text-xs text-muted-foreground mt-1">
                        {log.createdAt ? formatDistanceToNow(new Date(log.createdAt), { addSuffix: true }) : 'Unknown time'}
                      </div>
                    </div>
                  </div>
                  {getStatusBadge(log.status)}
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}