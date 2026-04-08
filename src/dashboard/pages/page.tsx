// import "https://cdnjs.cloudflare.com/ajax/libs/tailwindcss/3.3.2/tailwind.min.css"

const injectTailwindCDN = () => {
  const script = document.createElement('script');
  script.src = 'https://cdn.tailwindcss.com';
  script.async = true;
  document.head.appendChild(script);
};

injectTailwindCDN();

import "./index.css";
import React, { useState, useEffect, useRef } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs'
import { ConnectionStatus } from './components/ConnectionStatus'
import { FieldMappingTable } from './components/FieldMappingTable'
import { SyncLogs } from './components/SyncLogs'
import { Toaster } from './components/ui/toaster'
import { useToast } from './hooks/use-toast'
import { authApi, mappingApi, syncApi } from './api/client'
import { getInstanceId, setInstanceId } from './lib/utils'
import { ConnectionStatus as ConnectionStatusType, FieldMappingConfig, AvailableField, SyncLog } from './types'
import { Map, History, Database } from 'lucide-react'
import { Button } from './components/ui/button'

function App() {
  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://cdnjs.cloudflare.com/ajax/libs/tailwindcss/3.3.2/tailwind.min.css";
    document.head.appendChild(link);
  }, []);

  const [instanceId] = useState(() => getInstanceId() || 'demo-instance')
  const [connection, setConnection] = useState<ConnectionStatusType | null>(null)
  const [mappings, setMappings] = useState<FieldMappingConfig | any>()
  const [wixFields, setWixFields] = useState<AvailableField[]>([])
  const [hubSpotProperties, setHubSpotProperties] = useState<AvailableField[]>([])
  const [syncLogs, setSyncLogs] = useState<SyncLog[]>([])
  const [isLoading, setIsLoading] = useState({
    connection: false,
    mapping: false,
    logs: false,
    saving: false,
  })

  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    console.log('App initialized with instanceId:', instanceId)
    setInstanceId(instanceId)
    loadConnectionStatus()
    loadAvailableFields()
  }, [instanceId])

  useEffect(() => {
    if (connection?.connected) {
      loadFieldMapping()
      loadSyncLogs()
      stopPolling()
    }
  }, [connection])

  useEffect(() => {
    return () => {
      stopPolling()
    }
  }, [])

  const startPolling = () => {
    if (pollingRef.current) {
      console.log('Polling already active')
      return
    }

    if (connection?.connected) {
      console.log('Already connected, no need to poll')
      return
    }

    console.log('🔄 Starting stable polling for connection status...')

    pollingRef.current = setInterval(async () => {
      try {
        const status = await authApi.getStatus(instanceId)
        console.log('Polling status:', status.connected ? 'Connected ✅' : 'Not connected ❌')

        if (status?.connected) {
          console.log('✅ Connection detected! Updating UI...')
          setConnection(status)

          toast({
            title: 'Connected!',
            description: 'HubSpot account connected successfully.',
          })
        }
      } catch (error) {
        console.error('Polling error:', error)
      }
    }, 2000)
  }

  const stopPolling = () => {
    if (pollingRef.current) {
      console.log('🛑 Stopping polling')
      clearInterval(pollingRef.current)
      pollingRef.current = null
    }
  }

  const loadConnectionStatus = async () => {
    setIsLoading(prev => ({ ...prev, connection: true }))
    try {
      const status = await authApi.getStatus(instanceId)
      setConnection(status)

      if (!status?.connected) {
        startPolling()
      }
    } catch (error) {
      console.error('Failed to load connection status:', error)
    } finally {
      setIsLoading(prev => ({ ...prev, connection: false }))
    }
  }

  const loadFieldMapping = async () => {
    if (!connection?.connected) return
    setIsLoading(prev => ({ ...prev, mapping: true }))
    try {
      const response = await mappingApi.getMapping(instanceId)
      const mappingData = response.mappings ? { mappings: response.mappings } : response
      setMappings(mappingData)
    } catch (error) {
      console.error('Failed to load field mapping:', error)
    } finally {
      setIsLoading(prev => ({ ...prev, mapping: false }))
    }
  }

  const loadAvailableFields = async () => {
    try {
      const fields = await mappingApi.getAvailableFields(instanceId)
      setWixFields(fields.wixFields || [])
      setHubSpotProperties(fields.hubSpotProperties || [])
    } catch (error) {
      console.error('Failed to load available fields:', error)
    }
  }

  const loadSyncLogs = async () => {
    if (!connection?.connected) return
    setIsLoading(prev => ({ ...prev, logs: true }))
    try {
      const result = await syncApi.getSyncLogs(instanceId)
      const logsArray = result?.logs || []
      setSyncLogs(logsArray)
    } catch (error) {
      console.error('Failed to load sync logs:', error)
      setSyncLogs([])
    } finally {
      setIsLoading(prev => ({ ...prev, logs: false }))
    }
  }

  const handleConnect = () => {
    const popup = authApi.connect()
    if (!popup) return

    if (!pollingRef.current && !connection?.connected) {
      startPolling()
    }

    const checkPopupClosed = setInterval(() => {
      if (popup.closed) {
        clearInterval(checkPopupClosed)
        console.log('Popup closed by user')
      }
    }, 500)
  }

  const handleDisconnect = async () => {
    setIsLoading(prev => ({ ...prev, connection: true }))
    try {
      await authApi.disconnect(instanceId)
      setConnection({ connected: false })
      startPolling()

      toast({
        title: 'Disconnected',
        description: 'HubSpot account has been disconnected.',
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to disconnect HubSpot account.',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(prev => ({ ...prev, connection: false }))
    }
  }

  // FIXED: handleSaveMapping now receives updates array directly from FieldMappingTable
  const handleSaveMapping = async (updates: Array<{ wixField: string; direction?: string; transform?: string | null; isActive?: boolean }>) => {
    setIsLoading(prev => ({ ...prev, saving: true }))
    try {
      // Send updates directly to API (already in correct format)
      await mappingApi.updateMapping(instanceId, updates)
      
      // Update local mappings state to reflect the changes
      if (mappings) {
        const updatedMappings = {
          mappings: mappings.mappings.map(m => {
            const update = updates.find(u => u.wixField === m.wixField)
            if (update) {
              return {
                ...m,
                direction: update.direction || m.direction,
                transform: update.transform !== undefined ? update.transform : m.transform,
                isActive: update.isActive !== undefined ? update.isActive : m.isActive,
                
              }
            }
            return m
          })
        }
        setMappings(updatedMappings)
      }
      
      
      toast({
        title: 'Success',
        description: 'Field mappings saved successfully',
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save field mappings',
        variant: 'destructive',
      })
      throw error
    } finally {
      setIsLoading(prev => ({ ...prev, saving: false }))
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8 px-4">

        <div className="mb-8">
          <h1 className="text-3xl font-bold">Wix ↔ HubSpot Integration</h1>
          <p className="text-muted-foreground mt-2">
            Seamlessly sync contacts and form submissions between Wix and HubSpot
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3 mb-8">
          <div className="md:col-span-2">
            <ConnectionStatus
              instanceId={instanceId}
              isConnected={connection?.connected || false}
              portalId={connection?.portalId}
              onConnect={handleConnect}
              onDisconnect={handleDisconnect}
              isLoading={isLoading.connection}
            />
          </div>
          <div className="bg-muted/50 rounded-lg p-4 flex items-center justify-between">
            <div>
              <div className="text-sm text-muted-foreground">Instance ID</div>
              <div className="font-mono text-sm truncate max-w-[160px]">{instanceId}</div>
            </div>
            <Database className="h-8 w-8 text-muted-foreground" />
          </div>
        </div>

        {connection?.connected && (
          <Tabs defaultValue="mapping" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="mapping" className="flex items-center gap-2">
                <Map className="h-4 w-4" />
                Field Mapping
              </TabsTrigger>
              <TabsTrigger value="logs" className="flex items-center gap-2">
                <History className="h-4 w-4" />
                Sync Logs
              </TabsTrigger>
            </TabsList>

            <TabsContent value="mapping">
              <FieldMappingTable
                instanceId={instanceId}
                initialMappings={mappings}
                wixFields={wixFields}
                hubSpotProperties={hubSpotProperties}
                onSave={handleSaveMapping}
                isLoading={isLoading.saving}
              />
            </TabsContent>

            <TabsContent value="logs">
              <SyncLogs
                logs={syncLogs}
                onRefresh={loadSyncLogs}
                isLoading={isLoading.logs}
              />
            </TabsContent>
          </Tabs>
        )}

        {!connection?.connected && (
          <div className="text-center py-12">
            <div className="bg-muted/50 rounded-lg p-8">
              <h3 className="text-lg font-semibold mb-2">Get Started</h3>
              <p className="text-muted-foreground mb-4">
                Connect your HubSpot account to start syncing contacts and form submissions
              </p>
              <Button
                onClick={handleConnect}
                size="lg"
                disabled={isLoading.connection}
              >
                {isLoading.connection ? 'Connecting...' : 'Connect HubSpot Account'}
              </Button>
              {pollingRef.current && !connection?.connected && (
                <p className="text-sm text-muted-foreground mt-2">
                  Waiting for connection...
                </p>
              )}
            </div>
          </div>
        )}

      </div>
      <Toaster />
    </div>
  )
}

export default App